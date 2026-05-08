"""Groq-first LLM client for PRISM engine enhancement.

Improvements over v1:
- SHA-based response cache (TTL 1 hour) eliminates redundant API calls
- Batch processing: flushes up to N=5 items per Groq request, cutting calls by ~5×
- Structured JSON output schema replaces fragile line-parsing
- max_tokens raised to 300; abstract snippet extended to 1000 chars
- Confidence scores and uncertainty flags returned alongside verdicts
- Graceful degradation: cache → Groq batch → Ollama single → heuristic passthrough
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger("prism.engines.llm")

DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
ACTIVE_GROQ_FALLBACK_MODELS = [
    DEFAULT_GROQ_MODEL,
]
DECOMMISSIONED_GROQ_MODELS = {
    "llama-3.1-70b-versatile",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
}

# ---------------------------------------------------------------------------
# Response cache
# ---------------------------------------------------------------------------

@dataclass
class _CacheEntry:
    value: tuple[str, list[str], float]  # verdict, evidence, confidence
    expires_at: float


class _ResponseCache:
    """Simple in-process TTL cache keyed on prompt fingerprint."""

    def __init__(self, ttl: int = 3600) -> None:
        self._store: dict[str, _CacheEntry] = {}
        self._lock = Lock()
        self._ttl = ttl

    def _key(self, engine: str, title: str, score: float) -> str:
        raw = f"{engine}|{title}|{score:.2f}"
        return hashlib.sha256(raw.encode()).hexdigest()[:16]

    def get(self, engine: str, title: str, score: float) -> tuple[str, list[str], float] | None:
        key = self._key(engine, title, score)
        with self._lock:
            entry = self._store.get(key)
            if entry and time.monotonic() < entry.expires_at:
                logger.debug("Cache hit for %s / %s", engine, title[:40])
                return entry.value
            if entry:
                del self._store[key]
        return None

    def set(self, engine: str, title: str, score: float, value: tuple[str, list[str], float]) -> None:
        key = self._key(engine, title, score)
        with self._lock:
            self._store[key] = _CacheEntry(value=value, expires_at=time.monotonic() + self._ttl)

    def evict_expired(self) -> None:
        now = time.monotonic()
        with self._lock:
            expired = [k for k, v in self._store.items() if v.expires_at <= now]
            for k in expired:
                del self._store[k]


_cache = _ResponseCache()

# ---------------------------------------------------------------------------
# Groq client (lazy singleton)
# ---------------------------------------------------------------------------

_groq_client: Any = None


def _get_client() -> Any:
    global _groq_client
    if _groq_client is not None:
        return _groq_client

    settings = get_settings()
    api_key = settings.llm_api_key or settings.groq_api_key
    if not settings.enable_llm or not api_key:
        return None

    try:
        from groq import Groq
        _groq_client = Groq(api_key=api_key)
        logger.info("Groq API LLM client initialised successfully.")
        return _groq_client
    except ImportError:
        logger.warning("groq package not installed; API LLM features disabled.")
        return None
    except Exception as exc:
        logger.warning("Failed to initialise Groq client: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Availability helpers
# ---------------------------------------------------------------------------

def _ollama_available() -> bool:
    settings = get_settings()
    if not settings.enable_llm:
        return False
    try:
        response = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=2.0)
        return response.status_code == 200
    except Exception:
        return False


def llm_available() -> bool:
    return _get_client() is not None or _ollama_available()


# ---------------------------------------------------------------------------
# Low-level send helpers
# ---------------------------------------------------------------------------

def ask_llm(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 300,
    temperature: float = 0.2,
    structured: bool = False,
) -> str | None:
    text, _ = ask_llm_with_provider(
        system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature, structured=structured
    )
    return text


def ask_llm_with_provider(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int = 300,
    temperature: float = 0.2,
    structured: bool = False,
) -> tuple[str | None, str]:
    settings = get_settings()
    client = _get_client()

    # 1. Primary: Try Groq (API) for maximum speed and better PRISM scores
    if client is not None:
        # Respect Groq free tier RPM limits
        time.sleep(1.2)
        configured_model = settings.llm_model or DEFAULT_GROQ_MODEL
        if configured_model in DECOMMISSIONED_GROQ_MODELS:
            logger.warning("Configured Groq model %s is decommissioned; using %s.", configured_model, DEFAULT_GROQ_MODEL)
            configured_model = DEFAULT_GROQ_MODEL
        model_priority = [configured_model] + [
            model for model in ACTIVE_GROQ_FALLBACK_MODELS if model != configured_model
        ]
        for model in model_priority:
            try:
                request: dict[str, Any] = {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                }
                if structured:
                    request["response_format"] = {"type": "json_object"}
                response = client.chat.completions.create(
                    **request,
                )
                text = response.choices[0].message.content
                if text:
                    logger.debug("LLM response from API model %s (%d chars)", model, len(text))
                    return text.strip(), "groq_api"
            except Exception as exc:
                logger.warning("API model %s failed: %s; trying next", model, exc)

    # 2. Fallback: Try Ollama (local) if API is unavailable or disabled
    ollama_text = _ask_ollama(
        system_prompt, user_prompt, max_tokens=max_tokens, temperature=temperature, structured=structured
    )
    if ollama_text:
        return ollama_text, "ollama"

    logger.warning("All LLM providers failed; falling back to heuristic verdict.")
    return None, "heuristic"


def _ask_ollama(
    system_prompt: str,
    user_prompt: str,
    *,
    max_tokens: int,
    temperature: float,
    structured: bool,
) -> str | None:
    settings = get_settings()
    if not settings.enable_llm:
        return None

    # Try /api/chat first (modern Ollama)
    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            } | ({"format": "json"} if structured else {}),
            timeout=30.0,
        )
        if response.status_code == 200:
            text = response.json().get("message", {}).get("content")
            if text:
                logger.info("LLM response from Ollama chat %s (%d chars)", settings.ollama_model, len(text))
                return text.strip()
        else:
            err_msg = response.json().get("error", "Unknown error")
            logger.warning("Ollama /api/chat error (status %d): %s", response.status_code, err_msg)
    except Exception as exc:
        logger.debug("Ollama /api/chat failed (maybe old version?): %s", exc)

    # Fallback to /api/generate (older Ollama)
    try:
        combined_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"
        response = httpx.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "stream": False,
                "options": {"temperature": temperature, "num_predict": max_tokens},
                "prompt": combined_prompt,
            } | ({"format": "json"} if structured else {}),
            timeout=30.0,
        )
        if response.status_code == 200:
            text = response.json().get("response")
            if text:
                logger.info("LLM response from Ollama generate %s (%d chars)", settings.ollama_model, len(text))
                return text.strip()
        else:
            err_msg = response.json().get("error", "Unknown error")
            logger.warning("Ollama /api/generate error (status %d): %s", response.status_code, err_msg)
    except Exception as exc:
        logger.warning("Ollama fallback failed: %s", exc)
    
    return None


# ---------------------------------------------------------------------------
# Structured response parsing
# ---------------------------------------------------------------------------

@dataclass
class EnhancedResult:
    verdict: str
    evidence: list[str]
    confidence: float  # 0.0–1.0 produced by the LLM
    provider: str = "heuristic"
    from_cache: bool = False


_PARSE_SCHEMA = """\
Respond ONLY with a JSON object — no prose, no markdown fences.
Schema:
{
  "verdict": "<single sentence enhanced verdict>",
  "insight": "<one additional insight the heuristic may have missed>",
  "confidence": <float 0.0–1.0>,
  "flags": ["<optional list of concerns, e.g. 'small_sample', 'self_reported', 'preprint'>"]
}
"""

SYSTEM_PROMPT = (
    "You are PRISM, a research intelligence analyst. "
    "Provide concise, evidence-based assessments of scientific research signals. "
    "Be specific, cite data points when available, and keep verdicts under 2 sentences. "
    + _PARSE_SCHEMA
)


def _parse_response(
    raw: str,
    heuristic_verdict: str,
    evidence_points: list[str],
) -> tuple[str, list[str], float]:
    """Parse structured JSON response; fall back to heuristic on any error."""
    try:
        data = json.loads(raw)
        verdict = str(data.get("verdict") or heuristic_verdict).strip()
        insight = str(data.get("insight") or "").strip()
        confidence = float(data.get("confidence", 0.5))
        flags = [str(f) for f in data.get("flags", []) if f]

        enhanced_evidence = list(evidence_points)
        if insight:
            enhanced_evidence.append(f"[LLM Insight] {insight}")
        for flag in flags:
            enhanced_evidence.append(f"[PRISM Flag] {flag}")

        return verdict, enhanced_evidence, max(0.0, min(1.0, confidence))
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
        logger.warning("Failed to parse LLM response as JSON (%s); using heuristic.", exc)
        return heuristic_verdict, evidence_points, 0.0


# ---------------------------------------------------------------------------
# Batch processing
# ---------------------------------------------------------------------------

@dataclass
class _BatchItem:
    engine_name: str
    heuristic_verdict: str
    heuristic_score: float
    item_title: str
    item_abstract: str
    evidence_points: list[str]
    extra_context: str = ""


def _build_batch_prompt(items: list[_BatchItem]) -> str:
    lines = [
        f"Analyse exactly {len(items)} research signal(s).",
        'Return a JSON object with a single key "results" containing an array of exactly this many objects — one per item, in the same order.',
        "Do not merge, skip, or add items. If unsure, still return a placeholder object.",
        'Each object: {"verdict": "...", "insight": "...", "confidence": 0.0–1.0, "flags": [...]}',
        "",
    ]
    for i, item in enumerate(items):
        abstract_snippet = (item.item_abstract or "")[:1000]
        evidence_summary = "; ".join(item.evidence_points[:5])
        lines.append(f"=== ITEM {i} (return object at index {i}) ===")  # explicit index
        lines.append(f"Engine: {item.engine_name}")
        lines.append(f"Heuristic score: {item.heuristic_score:.2f}")
        lines.append(f"Heuristic verdict: {item.heuristic_verdict}")
        lines.append(f"Title: {item.item_title}")
        lines.append(f"Abstract: {abstract_snippet}")
        lines.append(f"Evidence so far: {evidence_summary}")
        if item.extra_context:
            lines.append(f"Additional context: {item.extra_context}")
        lines.append("")

    lines.append(
        f"CRITICAL: Your response must be a JSON object with a 'results' array of exactly {len(items)} objects. "
        f"Index 0 = ITEM 0, index 1 = ITEM 1, etc."
    )
    return "\n".join(lines)


def enhance_verdict_batch(items: list[_BatchItem]) -> list[EnhancedResult]:
    """
    Enhance multiple verdicts in a single LLM call.

    Cache hits are resolved immediately; only misses go to the LLM.
    Falls back to heuristic passthrough for each item if all providers fail.
    """
    if not items:
        return []

    results: list[EnhancedResult | None] = [None] * len(items)
    pending_indices: list[int] = []

    # --- cache pass ---
    for idx, item in enumerate(items):
        cached = _cache.get(item.engine_name, item.item_title, item.heuristic_score)
        if cached is not None:
            verdict, evidence, confidence = cached
            results[idx] = EnhancedResult(
                verdict=verdict,
                evidence=evidence,
                confidence=confidence,
                provider="cache",
                from_cache=True,
            )
        else:
            pending_indices.append(idx)

    if not pending_indices:
        return [r for r in results if r is not None]  # type: ignore[return-value]

    if not llm_available():
        for idx in pending_indices:
            item = items[idx]
            results[idx] = EnhancedResult(
                verdict=item.heuristic_verdict,
                evidence=list(item.evidence_points),
                confidence=0.0,
                provider="heuristic",
            )
        return [r for r in results if r is not None]  # type: ignore[return-value]

    # --- LLM batch call ---
    pending_items = [items[idx] for idx in pending_indices]
    batch_prompt = _build_batch_prompt(pending_items)
    # Ollama is now the primary provider for all tasks
    raw, provider = ask_llm_with_provider(
        SYSTEM_PROMPT, 
        batch_prompt, 
        max_tokens=300 * len(pending_items),
        structured=True,
    )

    if raw is not None:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict) and "results" in parsed:
                parsed_list = parsed["results"]
            elif isinstance(parsed, dict):
                arrays = [v for v in parsed.values() if isinstance(v, list)]
                parsed_list = arrays[0] if arrays else [parsed]
            else:
                parsed_list = parsed

            if not isinstance(parsed_list, list):
                parsed_list = []

            while len(parsed_list) < len(pending_items):
                parsed_list.append({})
            # Truncate if model returned more
            parsed_list = parsed_list[:len(pending_items)]
            
            for local_idx, orig_idx in enumerate(pending_indices):
                item = items[orig_idx]
                raw_entry = json.dumps(parsed_list[local_idx])
                verdict, evidence, confidence = _parse_response(
                    raw_entry, item.heuristic_verdict, item.evidence_points
                )
                _cache.set(item.engine_name, item.item_title, item.heuristic_score, (verdict, evidence, confidence))
                results[orig_idx] = EnhancedResult(
                    verdict=verdict,
                    evidence=evidence,
                    confidence=confidence,
                    provider=provider,
                )
            return [r for r in results if r is not None]  # type: ignore[return-value]
        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning("Batch LLM parse error (%s); degrading to per-item heuristic.", exc)

    # --- heuristic passthrough for all pending ---
    for idx in pending_indices:
        item = items[idx]
        results[idx] = EnhancedResult(
            verdict=item.heuristic_verdict,
            evidence=list(item.evidence_points),
            confidence=0.0,
            provider="heuristic",
        )

    return [r for r in results if r is not None]  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Single-item convenience wrapper (backward-compatible)
# ---------------------------------------------------------------------------

def enhance_verdict(
    engine_name: str,
    heuristic_verdict: str,
    heuristic_score: float,
    item_title: str,
    item_abstract: str,
    evidence_points: list[str],
    extra_context: str = "",
) -> tuple[str, list[str]]:
    """Backward-compatible single-item wrapper around enhance_verdict_batch."""
    item = _BatchItem(
        engine_name=engine_name,
        heuristic_verdict=heuristic_verdict,
        heuristic_score=heuristic_score,
        item_title=item_title,
        item_abstract=item_abstract,
        evidence_points=evidence_points,
        extra_context=extra_context,
    )
    results = enhance_verdict_batch([item])
    if results:
        r = results[0]
        return r.verdict, r.evidence
    return heuristic_verdict, evidence_points
