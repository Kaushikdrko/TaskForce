import asyncio
import os
from datetime import datetime, timezone

import google.genai as genai
from google.genai import types

def _require(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(f"Required env var {name} is not set")
    return val


GEMINI_API_KEY = _require("GEMINI_API_KEY")
MODEL = "gemini-2.0-flash"

_client: genai.Client | None = None


def get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


# ── Tool declarations ────────────────────────────────────────────────────────

_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="create_task",
                description="Create a new task for the user.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "title": types.Schema(type="STRING", description="Task title"),
                        "due_date": types.Schema(
                            type="STRING",
                            description="ISO 8601 datetime string (UTC). Optional.",
                        ),
                        "priority": types.Schema(
                            type="STRING",
                            description="low | medium | high | urgent. Optional.",
                        ),
                        "folder_id": types.Schema(
                            type="STRING",
                            description="UUID of the folder to assign the task to. Optional.",
                        ),
                        "estimated_minutes": types.Schema(
                            type="INTEGER",
                            description="Estimated time to complete in minutes. Optional.",
                        ),
                        "tags": types.Schema(
                            type="ARRAY",
                            items=types.Schema(type="STRING"),
                            description="List of string tags. Optional.",
                        ),
                    },
                    required=["title"],
                ),
            ),
            types.FunctionDeclaration(
                name="update_task",
                description="Update an existing task by its ID.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "task_id": types.Schema(type="STRING", description="UUID of the task to update"),
                        "title": types.Schema(type="STRING", description="New title. Optional."),
                        "due_date": types.Schema(
                            type="STRING",
                            description="New due date as ISO 8601 UTC string. Optional.",
                        ),
                        "priority": types.Schema(
                            type="STRING",
                            description="low | medium | high | urgent. Optional.",
                        ),
                        "status": types.Schema(
                            type="STRING",
                            description="pending | in_progress | completed | cancelled. Optional.",
                        ),
                        "estimated_minutes": types.Schema(
                            type="INTEGER",
                            description="Updated estimate in minutes. Optional.",
                        ),
                    },
                    required=["task_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="delete_task",
                description="Permanently delete a task by its ID. Always confirm with the user before calling this.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "task_id": types.Schema(type="STRING", description="UUID of the task to delete"),
                    },
                    required=["task_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="create_event",
                description="Create a new calendar event for the user.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "title": types.Schema(type="STRING", description="Event title"),
                        "start_time": types.Schema(
                            type="STRING",
                            description="ISO 8601 UTC start datetime string",
                        ),
                        "end_time": types.Schema(
                            type="STRING",
                            description="ISO 8601 UTC end datetime string",
                        ),
                        "all_day": types.Schema(
                            type="BOOLEAN",
                            description="True if this is an all-day event. Optional.",
                        ),
                        "color": types.Schema(
                            type="STRING",
                            description="Hex color string e.g. #6366f1. Optional.",
                        ),
                        "folder_id": types.Schema(
                            type="STRING",
                            description="UUID of the folder to assign the event to. Optional.",
                        ),
                    },
                    required=["title", "start_time", "end_time"],
                ),
            ),
            types.FunctionDeclaration(
                name="delete_event",
                description="Permanently delete a calendar event by its ID. Always confirm with the user before calling this.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "event_id": types.Schema(type="STRING", description="UUID of the event to delete"),
                    },
                    required=["event_id"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_schedule",
                description=(
                    "Retrieve the user's tasks and events for a given date range. "
                    "Call this before any update or delete to get real IDs — never fabricate UUIDs."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "start_date": types.Schema(
                            type="STRING",
                            description="ISO 8601 UTC date string (start of range)",
                        ),
                        "end_date": types.Schema(
                            type="STRING",
                            description="ISO 8601 UTC date string (end of range)",
                        ),
                    },
                    required=["start_date", "end_date"],
                ),
            ),
            types.FunctionDeclaration(
                name="suggest_schedule",
                description="Suggest optimal time slots for a task given its title and estimated duration.",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "task_title": types.Schema(type="STRING", description="Title of the task to schedule"),
                        "duration_minutes": types.Schema(
                            type="INTEGER",
                            description="Estimated duration in minutes",
                        ),
                    },
                    required=["task_title", "duration_minutes"],
                ),
            ),
        ]
    )
]

# ── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are TaskForce AI, a concise and helpful calendar and task management assistant.

Rules you must always follow:
- NEVER fabricate task or event UUIDs. If you need to update or delete something, call get_schedule first to retrieve the real ID.
- ALWAYS ask for explicit confirmation before calling delete_task or delete_event.
- Infer time context from the user's message (e.g. "tomorrow", "next Friday") using today's date injected at the start of each message.
- All datetimes you produce must be in UTC ISO 8601 format.
- Be concise. Confirm actions with a short one-line summary after completing them (e.g. "Created task: Dentist appointment — Friday 2pm ✓").
- If a request is ambiguous, ask one clarifying question rather than guessing.
- When the user asks what's on their schedule, call get_schedule and summarise the results clearly.
"""


def build_context_prefix(user_timezone: str = "UTC") -> str:
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return f"[Context] Today's date/time (UTC): {now_utc}. User's timezone: {user_timezone}.\n\n"


# ── Gemini call with exponential backoff ─────────────────────────────────────

async def generate_with_backoff(
    contents: list,
    config: types.GenerateContentConfig,
    max_retries: int = 4,
) -> types.GenerateContentResponse:
    """Call Gemini with exponential backoff on 429 rate-limit errors."""
    client = get_client()
    delay = 1.0
    for attempt in range(max_retries):
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=MODEL,
                contents=contents,
                config=config,
            )
            return response
        except Exception as e:
            err = str(e).lower()
            is_rate_limit = "429" in err or "quota" in err or "resource_exhausted" in err
            if is_rate_limit and attempt < max_retries - 1:
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise


def build_config(system_suffix: str = "") -> types.GenerateContentConfig:
    system_instruction = _SYSTEM_PROMPT + system_suffix
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=_TOOLS,
        temperature=0.3,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )


def get_tools() -> list:
    return _TOOLS


# ── Agent loop ───────────────────────────────────────────────────────────────

async def run_agent(
    user_message: str,
    history: list[types.Content],
    user_jwt: str,
    user_timezone: str = "UTC",
    max_tool_rounds: int = 8,
) -> tuple[str, list[types.Content]]:
    """
    Run the full Gemini function-call loop for one user turn.

    Returns (final_text, updated_history) where updated_history includes
    the new user message, all intermediate tool turns, and the final model reply.
    """
    from services.spring_client import execute_tool

    config = build_config()
    context_prefix = build_context_prefix(user_timezone)

    # Prepend date/timezone context to the first user message of this turn
    user_content = types.Content(
        role="user",
        parts=[types.Part(text=context_prefix + user_message)],
    )

    contents: list[types.Content] = list(history) + [user_content]

    for _ in range(max_tool_rounds):
        response = await generate_with_backoff(contents, config)

        candidate = response.candidates[0]
        model_content = candidate.content  # Content(role='model', parts=[...])

        # Collect any function calls in this response
        function_calls = [
            part.function_call
            for part in model_content.parts
            if part.function_call is not None
        ]

        if not function_calls:
            # No tool calls — this is the final text response
            final_text = "".join(
                part.text for part in model_content.parts if part.text
            )
            updated_history = list(history) + [user_content, model_content]
            return final_text, updated_history

        # Execute all function calls (may be parallel declarations in one turn)
        contents.append(model_content)

        tool_response_parts: list[types.Part] = []
        for fc in function_calls:
            result = await execute_tool(fc.name, fc.args, user_jwt)
            tool_response_parts.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"result": result},
                    )
                )
            )

        tool_content = types.Content(role="user", parts=tool_response_parts)
        contents.append(tool_content)

    # Exceeded max tool rounds — ask Gemini to summarise with what it has
    response = await generate_with_backoff(contents, config)
    candidate = response.candidates[0]
    model_content = candidate.content
    final_text = "".join(part.text for part in model_content.parts if part.text)
    updated_history = list(history) + [user_content] + contents[len(history) + 1 :] + [model_content]
    return final_text, updated_history


async def stream_agent(
    user_message: str,
    history: list[types.Content],
    user_jwt: str,
    user_timezone: str = "UTC",
    max_tool_rounds: int = 8,
):
    """
    Async generator that yields text tokens as they arrive.
    Runs the full tool loop silently, then streams the final reply.
    Yields str tokens, or dicts like {"tool": name, "args": args} for UI feedback.
    """
    from services.spring_client import execute_tool

    config = build_config()
    context_prefix = build_context_prefix(user_timezone)

    user_content = types.Content(
        role="user",
        parts=[types.Part(text=context_prefix + user_message)],
    )

    contents: list[types.Content] = list(history) + [user_content]

    for round_num in range(max_tool_rounds):
        response = await generate_with_backoff(contents, config)
        candidate = response.candidates[0]
        model_content = candidate.content

        function_calls = [
            part.function_call
            for part in model_content.parts
            if part.function_call is not None
        ]

        if not function_calls:
            # Stream the final text token by token
            final_text = "".join(part.text for part in model_content.parts if part.text)
            # Yield in small chunks so the WebSocket feels streamed
            chunk_size = 4
            for i in range(0, len(final_text), chunk_size):
                yield final_text[i : i + chunk_size]
                await asyncio.sleep(0)
            return

        contents.append(model_content)

        tool_response_parts: list[types.Part] = []
        for fc in function_calls:
            # Signal the UI which tool is running
            yield {"tool": fc.name, "args": dict(fc.args)}
            result = await execute_tool(fc.name, fc.args, user_jwt)
            tool_response_parts.append(
                types.Part(
                    function_response=types.FunctionResponse(
                        name=fc.name,
                        response={"result": result},
                    )
                )
            )

        contents.append(types.Content(role="user", parts=tool_response_parts))

    # Fallback after max rounds
    response = await generate_with_backoff(contents, config)
    candidate = response.candidates[0]
    model_content = candidate.content
    final_text = "".join(part.text for part in model_content.parts if part.text)
    for i in range(0, len(final_text), 4):
        yield final_text[i : i + 4]
        await asyncio.sleep(0)
