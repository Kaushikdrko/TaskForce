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
MODEL = "gemini-2.0-flash-lite"

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
                    "Retrieve the user's calendar events and tasks for a given date range. "
                    "Tasks with no due_date are also included in results. "
                    "Call this before any update or delete to get real IDs — never fabricate UUIDs. "
                    "If you cannot find an item by date range, use search_items or list_all_tasks instead."
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
                description=(
                    "Plan optimal time slots for one or more tasks/events within the user's work schedule. "
                    "Returns the user's existing calendar, their schedule preferences (work hours, work days, "
                    "break duration, max daily tasks), and the items to place. Use this before bulk-creating "
                    "events or tasks so you can distribute them intelligently across available slots."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "items": types.Schema(
                            type="ARRAY",
                            description="List of items to schedule. Each has a title and optional duration_minutes (default 60).",
                            items=types.Schema(
                                type="OBJECT",
                                properties={
                                    "title": types.Schema(type="STRING", description="Title of the task or event"),
                                    "duration_minutes": types.Schema(type="INTEGER", description="Duration in minutes. Default 60."),
                                },
                                required=["title"],
                            ),
                        ),
                        "planning_days": types.Schema(
                            type="INTEGER",
                            description="How many days ahead to plan over. Default 14.",
                        ),
                    },
                    required=["items"],
                ),
            ),
            types.FunctionDeclaration(
                name="get_user_preferences",
                description=(
                    "Fetch the user's schedule preferences: work start/end time, work days (0=Sun…6=Sat), "
                    "break duration in minutes, and max daily tasks. "
                    "Call this before scheduling anything so you respect the user's working hours."
                ),
                parameters=types.Schema(type="OBJECT", properties={}, required=[]),
            ),
            types.FunctionDeclaration(
                name="search_items",
                description=(
                    "Search for tasks and events by keyword or partial title. "
                    "Use this whenever the user refers to an item by name (e.g. 'delete Hw#1', 'reschedule dentist') "
                    "and you do not already have its ID, or when the date of the item is unknown. "
                    "Returns matching tasks and events regardless of date."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "query": types.Schema(
                            type="STRING",
                            description="Keyword or partial title to search for. Case-insensitive.",
                        ),
                    },
                    required=["query"],
                ),
            ),
            types.FunctionDeclaration(
                name="list_all_tasks",
                description=(
                    "Return ALL tasks for this user, optionally filtered by status. "
                    "Use when the user asks about all open/pending work, or to find a task without knowing its date. "
                    "Tasks with no due_date only appear here or via search_items."
                ),
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "status": types.Schema(
                            type="STRING",
                            description="Optional filter: pending | in_progress | completed | cancelled. Omit for all tasks.",
                        ),
                    },
                    required=[],
                ),
            ),
        ]
    )
]

# ── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are TaskForce AI, a concise and helpful calendar and task management assistant.

Rules you must always follow:
- NEVER fabricate task or event UUIDs. If you need to update or delete something, call search_items or get_schedule first to retrieve the real ID.
- Before calling delete_task or delete_event, always describe exactly what you found and ask "Are you sure you want to delete [name]?" — wait for the user to reply "yes" or similar before executing the delete.
- When the user replies with "yes", "confirm", "go ahead", "do it", or similar, proceed with the delete immediately.
- If the user says "delete task X" but X is found as a calendar event (not a task), use delete_event instead, and vice versa.
- Infer time context from the user's message (e.g. "tomorrow", "next Friday") using today's date injected at the start of each message.
- All datetimes you produce must be in UTC ISO 8601 format.
- When the user says "create a task ... from TIME to TIME", create a task (not an event) even if a time range is given. Use the start time as the scheduled_start and compute estimated_minutes from the range.
- Be concise. Confirm actions with a short one-line summary after completing them (e.g. "Created task: Dentist appointment — Friday 2pm ✓").
- If a request is ambiguous, ask one clarifying question rather than guessing.
- When the user asks what's on their schedule, call get_schedule and summarise the results clearly.
- When the user refers to a task or event by name (e.g. "delete Hw#1", "update dentist", "find my standup"), ALWAYS call search_items first with that name. Do NOT try to guess a date and call get_schedule — the item may be in the past or have no due_date.
- When using get_schedule, prefer wide date ranges. For "this week" use the full Mon–Sun range. For anything described as recent, past, or overdue, set start_date at least 30 days before today. Never assume an item only exists in the future.
- If get_schedule returns an empty result or does not contain the item the user mentioned, immediately call search_items with the item's title before telling the user it was not found.
- Tasks may have no due_date. Use list_all_tasks to see all tasks when the user asks about open or pending work without specifying a date.
- If a tool returns an error containing "INVALID_UUID", you MUST call search_items immediately with the item's name to retrieve the real UUID, then retry the original operation with that UUID. Never tell the user the operation failed — retry first.
- Never reuse a UUID from memory between conversation turns. Always extract the UUID fresh from the most recent tool result. If you are not looking at a tool result right now that contains the UUID, call search_items to get it.
- When the user asks to schedule or add multiple items (e.g. "add event1, event2, event3 across my week"), ALWAYS follow this sequence:
  1. Call get_user_preferences AND get_schedule (for the relevant date range) in the same round to gather context.
  2. Call suggest_schedule with ALL items at once to get the full scheduling context back.
  3. Use the returned work hours, work days, break duration, and existing calendar to assign each item a specific non-overlapping start_time and end_time.
  4. Create all items in parallel (multiple create_event or create_task calls in a single round).
- When distributing multiple items across days: respect workDays (only schedule on those days), stay within workStartTime–workEndTime, leave at least breakDurationMinutes between items, and do not exceed maxDailyTasks per day.
- For items where the user gives no duration, default to 60 minutes.
- Always confirm the full schedule plan in a concise summary after creating all items (e.g. "Scheduled 4 events across Mon–Fri ✓").
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
    max_tool_rounds: int = 16,
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
    max_tool_rounds: int = 16,
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

    for _ in range(max_tool_rounds):
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
            # Signal whether the tool succeeded or failed
            failed = isinstance(result, dict) and "error" in result
            yield {"tool_result": fc.name, "success": not failed, "error": result.get("error") if failed else None}
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
