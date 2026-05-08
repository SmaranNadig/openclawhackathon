from app.db.models import EntityLink, ResearchItem
from app.engines.llm_client import enhance_verdict
from app.engines.schemas import EngineResult, clamp
from app.engines.utils import text_blob, tokenize

CONTRADICTION_TERMS = {
    "contradict",
    "conflict",
    "fails",
    "failure",
    "replication",
    "reproduce",
    "lower",
    "weaker",
    "not robust",
    "distribution shift",
    "adversarial",
    "disputed",
}


class DebateEngine:
    def score(self, item: ResearchItem, related_items: list[ResearchItem], links: list[EntityLink], skip_llm: bool = False) -> EngineResult:
        blob = text_blob(item)
        evidence: list[str] = []
        direct_hits = [term for term in CONTRADICTION_TERMS if term in blob]
        if direct_hits:
            evidence.append(f"Current item contains dispute language: {', '.join(sorted(direct_hits)[:5])}.")

        related_conflicts = 0
        related_overlap = 0.0
        item_tokens = tokenize(blob)
        for related in related_items:
            related_blob = text_blob(related)
            related_hits = [term for term in CONTRADICTION_TERMS if term in related_blob]
            overlap = len(item_tokens & tokenize(related_blob)) / max(len(item_tokens | tokenize(related_blob)), 1)
            related_overlap = max(related_overlap, overlap)
            if related_hits and overlap >= 0.08:
                related_conflicts += 1
                evidence.append(f"Related item '{related.title}' carries conflict/replication language: {', '.join(sorted(related_hits)[:4])}.")

        link_boost = min(sum(link.confidence for link in links if link.relation_type in {"topic_similarity", "paper_repo"}) / 5, 0.2)
        score = clamp(0.18 * len(direct_hits) + 0.22 * related_conflicts + 0.35 * related_overlap + link_boost)

        if not evidence:
            evidence.append("No strong contradiction language was found in the current local corpus.")

        if score >= 0.7:
            verdict = "High debate risk: the claim appears actively contested."
        elif score >= 0.4:
            verdict = "Moderate debate risk: related evidence suggests uncertainty."
        else:
            verdict = "Low debate risk: no major contradiction cluster found yet."

        if not skip_llm:
            verdict, evidence = enhance_verdict(
                engine_name="DebateEngine",
                heuristic_verdict=verdict,
                heuristic_score=score,
                item_title=item.title,
                item_abstract=item.abstract or "",
                evidence_points=evidence,
                extra_context=f"related_items={len(related_items)}, links={len(links)}",
            )

        return EngineResult(
            score=round(score, 4),
            verdict=verdict,
            evidence=evidence[:8],
            details={"direct_terms": direct_hits, "related_conflicts": related_conflicts, "max_related_overlap": round(related_overlap, 4)},
        )
