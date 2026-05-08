"""
engine_runner.py
----------------
Orchestrates every analysis engine for a single ResearchItem, persists the
results as an EngineRun + FusionReportRecord, and returns both ORM objects.

The existing `build_fusion_report()` helper in routes_analysis.py continues
to work untouched (dynamic / non-persisted path).  This service is only
called by the three new /run-engines, /engine-runs, and /fusion-history
endpoints.
"""

from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.db.models import (
    EngineRun,
    EntityLink,
    FusionReportRecord,
    ResearchItem,
    SourceSignal,
)
from app.engines.cross_domain_engine import CrossDomainEngine
from app.engines.debate_engine import DebateEngine
from app.engines.fusion_engine import FusionEngine
from app.engines.gap_engine import GapEngine
from app.engines.signal_engine import SignalEngine
from app.engines.trust_engine import TrustEngine


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _related_context(
    db: Session, item: ResearchItem
) -> tuple[list[ResearchItem], list[EntityLink]]:
    """Re-implement the same context query used by routes_analysis to avoid
    importing from a routes module (keeps the service layer clean)."""
    links = (
        db.query(EntityLink)
        .filter(
            (EntityLink.source_item_id == item.id)
            | (EntityLink.target_item_id == item.id)
        )
        .order_by(EntityLink.confidence.desc())
        .limit(25)
        .all()
    )
    linked_ids: set[str] = set()
    for link in links:
        if link.source_item_id != item.id:
            linked_ids.add(link.source_item_id)
        if link.target_item_id != item.id:
            linked_ids.add(link.target_item_id)

    related_items: list[ResearchItem] = []
    if linked_ids:
        related_items.extend(
            related
            for related in db.query(ResearchItem).filter(ResearchItem.id.in_(linked_ids)).all()
            if _content_overlap(item, related) >= 0.08
        )

    same_topic = (
        db.query(ResearchItem)
        .filter(ResearchItem.topic == item.topic, ResearchItem.id != item.id)
        .order_by(ResearchItem.timestamp.desc())
        .limit(10)
        .all()
    )
    seen = {r.id for r in related_items}
    for r in same_topic:
        if r.id not in seen and _content_overlap(item, r) >= 0.08:
            related_items.append(r)
            seen.add(r.id)

    return related_items, links


def _content_overlap(left: ResearchItem, right: ResearchItem) -> float:
    left_tokens = _content_tokens(left)
    right_tokens = _content_tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / max(len(left_tokens | right_tokens), 1)


def _content_tokens(item: ResearchItem) -> set[str]:
    text = f"{item.title} {item.abstract} {item.extra_metadata}".lower()
    return {token for token in re.findall(r"[a-zA-Z0-9]+", text) if len(token) > 2}


# ---------------------------------------------------------------------------
# Public service function
# ---------------------------------------------------------------------------

def run_and_persist_engines(
    db: Session, item: ResearchItem
) -> tuple[EngineRun, FusionReportRecord]:
    """Run all five analysis engines for *item*, persist results to the
    database, and return ``(engine_run, fusion_report_record)``.

    Raises
    ------
    sqlalchemy.exc.SQLAlchemyError
        Propagated to the caller; the session is **not** committed here so
        the route handler controls the transaction boundary.
    """
    signals: list[SourceSignal] = (
        db.query(SourceSignal).filter(SourceSignal.item_id == item.id).all()
    )
    related_items, links = _related_context(db, item)
    
    # Aggregate signals across the entire topic cluster
    for related in related_items:
        related_signals = db.query(SourceSignal).filter(SourceSignal.item_id == related.id).all()
        signals.extend(related_signals)

    # --- run individual engines (Fast Heuristics Only) -----------------------
    signal_result = SignalEngine().score(item, signals, skip_llm=True)
    trust_result = TrustEngine().score(item, signals, skip_llm=True)
    debate_result = DebateEngine().score(item, related_items, links, skip_llm=True)
    gap_result = GapEngine().score(item, signals, related_items, skip_llm=True)
    cross_domain_result = CrossDomainEngine().score(item, related_items, skip_llm=True)

    # --- persist EngineRun -------------------------------------------------
    engine_run = EngineRun(
        item_id=item.id,
        signal_score=signal_result.score,
        signal_verdict=signal_result.verdict,
        signal_evidence=signal_result.evidence,
        signal_details=signal_result.details,
        trust_score=trust_result.score,
        trust_verdict=trust_result.verdict,
        trust_evidence=trust_result.evidence,
        trust_details=trust_result.details,
        debate_score=debate_result.score,
        debate_verdict=debate_result.verdict,
        debate_evidence=debate_result.evidence,
        debate_details=debate_result.details,
        gap_score=gap_result.score,
        gap_verdict=gap_result.verdict,
        gap_evidence=gap_result.evidence,
        gap_details=gap_result.details,
        cross_domain_score=cross_domain_result.score,
        cross_domain_verdict=cross_domain_result.verdict,
        cross_domain_evidence=cross_domain_result.evidence,
        cross_domain_details=cross_domain_result.details,
    )
    db.add(engine_run)
    db.flush()  # populate engine_run.id before creating FusionReportRecord

    # --- compute heuristic fusion scores inline -----------------------------
    from app.engines.schemas import clamp

    heuristic_prism = clamp(
        0.25 * signal_result.score
        + 0.25 * trust_result.score
        + 0.15 * (1 - debate_result.score)
        + 0.20 * gap_result.score
        + 0.15 * cross_domain_result.score
    )

    # Build heuristic evidence
    evidence = [
        f"Signal Engine: {signal_result.verdict}",
        f"Trust Engine: {trust_result.verdict}",
        f"Debate Engine: {debate_result.verdict}",
        f"Gap Engine: {gap_result.verdict}",
        f"Cross-Domain Engine: {cross_domain_result.verdict}",
    ]
    for r in [signal_result, trust_result, debate_result, gap_result, cross_domain_result]:
        evidence.extend(r.evidence[:3])
    evidence = evidence[:17]

    # --- Call OpenClaw Agent Service (Hybrid Trigger) -----------------------
    from app.agent.openclaw_client import analyze as openclaw_analyze
    from app.agent.openclaw_client import _fallback

    # Only use Master LLM (OpenClaw) for items that look interesting (>0.4)
    if heuristic_prism >= 0.4:
        openclaw_result = openclaw_analyze(
            title=item.title or "",
            abstract=item.abstract or "",
            scores={
                "trust": trust_result.score,
                "novelty": signal_result.score,
                "gap": gap_result.score,
                "cross_domain": cross_domain_result.score,
                "controversy": debate_result.score,
            },
        )
    else:
        # Fast path for background items
        openclaw_result = _fallback({
            "trust": trust_result.score,
            "novelty": signal_result.score,
            "gap": gap_result.score,
            "cross_domain": cross_domain_result.score,
            "controversy": debate_result.score,
        })

    # Use OpenClaw's refined score and verdict
    prism_score = openclaw_result.prism_score
    verdict = openclaw_result.verdict

    # Append reasoning and action to evidence
    if openclaw_result.reasoning:
        evidence.append(f"[OpenClaw Reasoning] {openclaw_result.reasoning}")
    evidence.append(f"[OpenClaw Action] {openclaw_result.action}")
    evidence.append(f"[Analysis Source] {openclaw_result.source}")

    # --- persist FusionReportRecord ----------------------------------------
    fusion_record = FusionReportRecord(
        item_id=item.id,
        engine_run_id=engine_run.id,
        prism_score=round(prism_score, 4),
        novelty_score=signal_result.score,
        trust_score=trust_result.score,
        controversy_score=debate_result.score,
        adoption_gap_score=gap_result.score,
        transferability_score=cross_domain_result.score,
        verdict=verdict,
        evidence=evidence,
    )
    db.add(fusion_record)
    # caller commits

    return engine_run, fusion_record


def _heuristic_verdict(prism_score, signal, trust, debate, gap, cross_domain):
    """Pure heuristic verdict — no LLM, no network."""
    if prism_score >= 0.72 and trust.score >= 0.55:
        return "High-priority PRISM opportunity: strong signal, usable trust evidence, and clear strategic value."
    if debate.score >= 0.7:
        return "Contested opportunity: valuable to track, but claims require careful validation."
    if gap.score >= 0.7:
        return "Adoption-gap opportunity: academia appears ahead of industry implementation."
    if cross_domain.score >= 0.7:
        return "Cross-domain spark: promising transfer path detected."
    if prism_score >= 0.45:
        return "Watchlist candidate: enough signal to monitor in the next research brief."
    return "Low-priority item for now: keep in memory but do not escalate."
