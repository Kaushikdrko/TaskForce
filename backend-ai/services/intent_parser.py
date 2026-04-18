import re
from dataclasses import dataclass, field
from enum import Enum


class Intent(str, Enum):
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    DELETE_TASK = "delete_task"
    CREATE_EVENT = "create_event"
    DELETE_EVENT = "delete_event"
    GET_SCHEDULE = "get_schedule"
    SUGGEST_SCHEDULE = "suggest_schedule"
    GENERAL = "general"


_PATTERNS: list[tuple[re.Pattern, Intent]] = [
    (re.compile(r"\b(add|create|new|make|schedule)\b.{0,40}\b(task|todo|reminder)\b", re.I), Intent.CREATE_TASK),
    (re.compile(r"\b(add|create|new|make|schedule)\b.{0,40}\b(event|meeting|appointment|call)\b", re.I), Intent.CREATE_EVENT),
    (re.compile(r"\b(delete|remove|cancel)\b.{0,40}\b(task|todo)\b", re.I), Intent.DELETE_TASK),
    (re.compile(r"\b(delete|remove|cancel)\b.{0,40}\b(event|meeting|appointment)\b", re.I), Intent.DELETE_EVENT),
    (re.compile(r"\b(update|edit|change|rename|reschedule|move|mark)\b.{0,40}\b(task|todo)\b", re.I), Intent.UPDATE_TASK),
    (re.compile(r"\b(what('s| is| are)?|show|list|get).{0,30}\b(schedule|calendar|events?|tasks?|today|tomorrow|week)\b", re.I), Intent.GET_SCHEDULE),
    (re.compile(r"\b(when|find|suggest|best time|free slot|fit|block time)\b", re.I), Intent.SUGGEST_SCHEDULE),
]


@dataclass
class ParsedIntent:
    intent: Intent
    confidence: float  # 0.0–1.0; 1.0 = pattern matched, 0.5 = fallback
    entities: dict = field(default_factory=dict)


def parse_intent(message: str) -> ParsedIntent:
    """
    Lightweight regex pre-pass to classify the user's message before Gemini.
    Used to attach intent metadata to WebSocket frames for UI optimistic rendering.
    Gemini still makes all final decisions — this is advisory only.
    """
    for pattern, intent in _PATTERNS:
        if pattern.search(message):
            return ParsedIntent(intent=intent, confidence=1.0, entities=_extract_entities(message))

    return ParsedIntent(intent=Intent.GENERAL, confidence=0.5, entities={})


def _extract_entities(message: str) -> dict:
    """Pull out rough date/time hints and priority mentions for context enrichment."""
    entities: dict = {}

    # Relative date hints
    if re.search(r"\btoday\b", message, re.I):
        entities["date_hint"] = "today"
    elif re.search(r"\btomorrow\b", message, re.I):
        entities["date_hint"] = "tomorrow"
    elif m := re.search(r"\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", message, re.I):
        entities["date_hint"] = m.group(0)
    elif m := re.search(r"\bnext\s+week\b", message, re.I):
        entities["date_hint"] = "next_week"

    # Priority hints
    if re.search(r"\b(urgent|asap|immediately|critical)\b", message, re.I):
        entities["priority"] = "urgent"
    elif re.search(r"\b(high priority|important)\b", message, re.I):
        entities["priority"] = "high"

    return entities
