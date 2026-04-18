import json
import logging
import time
from collections import defaultdict

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from auth.dependencies import _decode_token
from db.supabase_client import load_chat_history, persist_messages
from services.gemini_service import stream_agent

logger = logging.getLogger(__name__)

_rate: dict[str, list[float]] = defaultdict(list)
MAX_MSGS_PER_MINUTE = 20


def _check_rate(user_id: str) -> bool:
    now = time.monotonic()
    window = [t for t in _rate[user_id] if now - t < 60]
    _rate[user_id] = window
    if len(window) >= MAX_MSGS_PER_MINUTE:
        return False
    _rate[user_id].append(now)
    return True

router = APIRouter(prefix="/ai", tags=["chat"])


def _history_to_contents(rows: list[dict]) -> list:
    """Convert chat_messages DB rows to Gemini Content objects."""
    from google.genai import types

    contents = []
    for row in rows:
        role = "model" if row["role"] == "assistant" else "user"
        text = row.get("content") or ""
        if text:
            contents.append(types.Content(role=role, parts=[types.Part(text=text)]))
    return contents


def _extract_user_id(token: str) -> str:
    payload = _decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise ValueError("Token missing sub claim")
    return user_id


@router.websocket("/ws/chat/{user_id}")
async def websocket_chat(
    websocket: WebSocket,
    user_id: str,
    token: str = Query(...),
):
    # Validate JWT before accepting the connection
    try:
        verified_user_id = _extract_user_id(token)
    except Exception:
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    # Ensure the token's sub matches the path user_id (prevents impersonation)
    if verified_user_id != user_id:
        await websocket.close(code=4003, reason="Token user_id mismatch")
        return

    await websocket.accept()

    # Load conversation history once per connection
    try:
        history_rows = await load_chat_history(user_id)
        history = _history_to_contents(history_rows)
    except Exception as e:
        logger.error("Failed to load chat history for %s: %s", user_id, e)
        history = []

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
                user_message = payload.get("message", "").strip()
                user_timezone = payload.get("timezone", "UTC")
            except (json.JSONDecodeError, AttributeError):
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid message format"}))
                continue

            if not user_message:
                continue

            if not _check_rate(user_id):
                await websocket.send_text(json.dumps({"type": "error", "message": "Rate limit exceeded. Please wait."}))
                continue

            # Stream the agent response
            assistant_text = ""
            tool_calls_log: list[dict] = []

            try:
                async for chunk in stream_agent(
                    user_message=user_message,
                    history=history,
                    user_jwt=token,
                    user_timezone=user_timezone,
                ):
                    if isinstance(chunk, dict):
                        # Tool-call notification — send to UI for display
                        tool_calls_log.append(chunk)
                        await websocket.send_text(json.dumps({"type": "tool", "name": chunk["tool"], "args": chunk["args"]}))
                    else:
                        assistant_text += chunk
                        await websocket.send_text(json.dumps({"type": "token", "text": chunk}))

                await websocket.send_text(json.dumps({"type": "done"}))

            except Exception as e:
                logger.error("Agent error for user %s: %s", user_id, e)
                await websocket.send_text(json.dumps({"type": "error", "message": "Agent error — please try again"}))
                continue

            # Persist exchange and update in-memory history
            try:
                await persist_messages(user_id, user_message, assistant_text, tool_calls_log or None)
            except Exception as e:
                logger.error("Failed to persist messages for %s: %s", user_id, e)

            # Append the new turn to in-memory history for the rest of this connection
            from google.genai import types
            history.append(types.Content(role="user", parts=[types.Part(text=user_message)]))
            history.append(types.Content(role="model", parts=[types.Part(text=assistant_text)]))

            # Keep history bounded to last 40 Content objects (~20 turns)
            if len(history) > 40:
                history = history[-40:]

    except WebSocketDisconnect:
        logger.info("Client disconnected: %s", user_id)
