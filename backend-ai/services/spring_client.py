import os
import re
from typing import Any

import httpx


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
    return await _delete(f"/api/tasks/{args['task_id']}", user_jwt)


# ── Event operations ─────────────────────────────────────────────────────────

async def create_event(args: dict, user_jwt: str) -> dict:
    return await _post("/api/events", user_jwt, _camel_keys(args))


async def delete_event(args: dict, user_jwt: str) -> dict:
    return await _delete(f"/api/events/{args['event_id']}", user_jwt)


# ── Schedule operations ──────────────────────────────────────────────────────

async def get_schedule(args: dict, user_jwt: str) -> dict:
    events = await _get("/api/events", user_jwt, {"start": args["start_date"], "end": args["end_date"]})
    tasks = await _get("/api/tasks", user_jwt, {"due_date": args["end_date"]})
    return {"events": events, "tasks": tasks}


async def suggest_schedule(args: dict, user_jwt: str) -> dict:
    # Fetch the next 7 days of schedule so Gemini can reason over free slots
    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)
    end = now + timedelta(days=7)
    schedule = await get_schedule(
        {"start_date": now.isoformat(), "end_date": end.isoformat()},
        user_jwt,
    )
    return {
        "task_title": args["task_title"],
        "duration_minutes": args["duration_minutes"],
        "existing_schedule": schedule,
    }


# ── Dispatch table ───────────────────────────────────────────────────────────

TOOL_HANDLERS: dict[str, Any] = {
    "create_task": create_task,
    "update_task": update_task,
    "delete_task": delete_task,
    "create_event": create_event,
    "delete_event": delete_event,
    "get_schedule": get_schedule,
    "suggest_schedule": suggest_schedule,
}


async def execute_tool(name: str, args: dict, user_jwt: str) -> Any:
    handler = TOOL_HANDLERS.get(name)
    if handler is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        # args from Gemini is a MapComposite — convert to plain dict and copy
        # so callers that pop keys don't mutate the original
        return await handler(dict(args), user_jwt)
    except httpx.HTTPStatusError as e:
        return {"error": f"Spring Boot error {e.response.status_code}: {e.response.text}"}
    except Exception as e:
        return {"error": str(e)}
