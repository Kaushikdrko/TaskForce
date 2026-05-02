import logging
import os
import re
from typing import Any

import httpx

_logger = logging.getLogger(__name__)


_UUID_RE = re.compile(
    r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    re.IGNORECASE,
)


def _assert_uuid(value: str, field: str) -> str | None:
    """Return an error string if value is not a valid UUID, else None."""
    if not isinstance(value, str) or not _UUID_RE.match(value.strip()):
        return (
            f"INVALID_UUID: '{value}' is not a real UUID for {field}. "
            "ACTION REQUIRED: call search_items RIGHT NOW with the item's title to get the real UUID, "
            "then immediately retry the delete with the correct UUID from those results. Do not give up."
        )
    return None


def _to_camel(snake: str) -> str:
    return re.sub(r"_([a-z])", lambda m: m.group(1).upper(), snake)


def _camel_keys(d: dict) -> dict:
    return {_to_camel(k): v for k, v in d.items()}

SPRING_BOOT_URL = os.getenv("SPRING_BOOT_URL", "http://localhost:8080")
TIMEOUT = 15.0


def _headers(user_jwt: str) -> dict:
    return {"Authorization": f"Bearer {user_jwt}", "Content-Type": "application/json"}


async def _get(path: str, user_jwt: str, params: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{SPRING_BOOT_URL}{path}", headers=_headers(user_jwt), params=params)
        r.raise_for_status()
        return r.json()


async def _post(path: str, user_jwt: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(f"{SPRING_BOOT_URL}{path}", headers=_headers(user_jwt), json=body)
        r.raise_for_status()
        return r.json()


async def _put(path: str, user_jwt: str, body: dict) -> Any:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.put(f"{SPRING_BOOT_URL}{path}", headers=_headers(user_jwt), json=body)
        r.raise_for_status()
        return r.json()


async def _delete(path: str, user_jwt: str) -> dict:
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.delete(f"{SPRING_BOOT_URL}{path}", headers=_headers(user_jwt))
        r.raise_for_status()
        return {"deleted": True}


# ── Task operations ──────────────────────────────────────────────────────────

async def create_task(args: dict, user_jwt: str) -> dict:
    return await _post("/api/tasks", user_jwt, _camel_keys(args))


async def update_task(args: dict, user_jwt: str) -> dict:
    task_id = args.pop("task_id")
    return await _put(f"/api/tasks/{task_id}", user_jwt, _camel_keys(args))


async def delete_task(args: dict, user_jwt: str) -> dict:
    err = _assert_uuid(args.get("task_id", ""), "task_id")
    if err:
        return {"error": err}
    return await _delete(f"/api/tasks/{args['task_id']}", user_jwt)


# ── Event operations ─────────────────────────────────────────────────────────

async def create_event(args: dict, user_jwt: str) -> dict:
    return await _post("/api/events", user_jwt, _camel_keys(args))


async def delete_event(args: dict, user_jwt: str) -> dict:
    err = _assert_uuid(args.get("event_id", ""), "event_id")
    if err:
        return {"error": err}
    return await _delete(f"/api/events/{args['event_id']}", user_jwt)


# ── Schedule operations ──────────────────────────────────────────────────────

async def get_schedule(args: dict, user_jwt: str) -> dict:
    start = args["start_date"]
    end   = args["end_date"]
    events = await _get("/api/events", user_jwt, {"start": start, "end": end})
    # include_undated=true: returns tasks in the date range PLUS tasks with no due_date
    tasks  = await _get("/api/tasks",  user_jwt,
                        {"start_date": start, "end_date": end, "include_undated": "true"})
    return {"events": events, "tasks": tasks}


async def search_items(args: dict, user_jwt: str) -> dict:
    q      = args["query"]
    tasks  = await _get("/api/tasks/search",  user_jwt, {"q": q})
    events = await _get("/api/events/search", user_jwt, {"q": q})
    return {"tasks": tasks, "events": events}


async def list_all_tasks(args: dict, user_jwt: str) -> dict:
    params: dict = {}
    if args.get("status"):
        params["status"] = args["status"]
    tasks = await _get("/api/tasks", user_jwt, params or None)
    return {"tasks": tasks}


async def get_user_preferences(_args: dict, user_jwt: str) -> dict:
    return await _get("/api/users/me/preferences", user_jwt)


async def suggest_schedule(args: dict, user_jwt: str) -> dict:
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    planning_days = int(args.get("planning_days", 14))
    end = now + timedelta(days=planning_days)
    schedule = await get_schedule(
        {"start_date": now.isoformat(), "end_date": end.isoformat()},
        user_jwt,
    )
    prefs = await _get("/api/users/me/preferences", user_jwt)
    return {
        "items": args.get("items", [{"title": args.get("task_title"), "duration_minutes": args.get("duration_minutes", 60)}]),
        "planning_window_days": planning_days,
        "existing_schedule": schedule,
        "user_preferences": prefs,
    }


# ── Dispatch table ───────────────────────────────────────────────────────────

TOOL_HANDLERS: dict[str, Any] = {
    "create_task":          create_task,
    "update_task":          update_task,
    "delete_task":          delete_task,
    "create_event":         create_event,
    "delete_event":         delete_event,
    "get_schedule":         get_schedule,
    "suggest_schedule":     suggest_schedule,
    "search_items":         search_items,
    "list_all_tasks":       list_all_tasks,
    "get_user_preferences": get_user_preferences,
}


async def execute_tool(name: str, args: dict, user_jwt: str) -> Any:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return {"error": f"Unknown tool: {name}"}
    _logger.info("execute_tool: %s args=%r", name, dict(args))
    try:
        result = await handler(dict(args), user_jwt)
        _logger.info("execute_tool result for %s: %r", name, result)
        return result
    except httpx.HTTPStatusError as e:
        _logger.error("execute_tool HTTP error for %s: %s %s", name, e.response.status_code, e.response.text)
        return {"error": f"Spring Boot error {e.response.status_code}: {e.response.text}"}
    except Exception as e:
        _logger.error("execute_tool exception for %s: %s", name, e)
        return {"error": str(e)}
