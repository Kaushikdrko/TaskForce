import os
from functools import lru_cache

from supabase import Client, create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


async def load_chat_history(user_id: str, limit: int = 20) -> list[dict]:
    """Return the last `limit` messages for a user, oldest first."""
    db = get_supabase()
    result = (
        db.table("chat_messages")
        .select("role, content, tool_calls")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    # Reverse so oldest message is first (chronological order for Gemini context)
    return list(reversed(result.data or []))


async def persist_messages(user_id: str, user_text: str, assistant_text: str, tool_calls: list | None = None) -> None:
    """Write the user turn and assistant reply to chat_messages."""
    db = get_supabase()
    rows = [
        {"user_id": user_id, "role": "user", "content": user_text},
        {"user_id": user_id, "role": "assistant", "content": assistant_text, "tool_calls": tool_calls or []},
    ]
    db.table("chat_messages").insert(rows).execute()
