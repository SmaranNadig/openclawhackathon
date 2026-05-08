from app.db.models import ResearchItem, SourceSignal
from app.engines.llm_client import enhance_verdict
from app.engines.schemas import EngineResult, clamp
from app.engines.utils import log_norm, recency_score, signal_totals


class SignalEngine:
    def score(self, item: ResearchItem, signals: list[SourceSignal], skip_llm: bool = False) -> EngineResult:
        totals = signal_totals(signals)
        metadata = item.extra_metadata or {}
        
        # Extract citations from metadata if available (OpenAlex/Semantic Scholar)
        citations = metadata.get("cited_by_count") or metadata.get("citation_count") or metadata.get("citations") or 0
        citation_score = log_norm(float(citations), 500)

        star_score = log_norm(totals["stars"], 1000)
        fork_score = log_norm(totals["forks"], 200)
        commit_score = log_norm(totals["commits"], 80)
        download_score = log_norm(totals["downloads"], 5000)
        mention_score = log_norm(totals["mentions"], 80)
        recent = recency_score(item)
        
        # Boost reputable scientific sources and high-citation counts
        source_boost = 0.15 if item.source in {"arxiv", "huggingface", "openalex", "semantic_scholar"} else 0.0
        
        score = clamp(
            0.20 * star_score
            + 0.15 * citation_score
            + 0.1 * fork_score
            + 0.1 * commit_score
            + 0.15 * download_score
            + 0.1 * mention_score
            + 0.1 * recent
            + source_boost
        )

        evidence = [
            f"Recency score is {recent:.2f} based on the item timestamp.",
            f"Observed {citations} citations, {totals['stars']} stars, {totals['forks']} forks, {totals['commits']} commits, {totals['downloads']} downloads, and {totals['mentions']} mentions.",
        ]
        for signal in signals[:3]:
            evidence.extend(signal.evidence[:2])

        if score >= 0.7:
            verdict = "Strong emerging signal with multi-source traction."
        elif score >= 0.4:
            verdict = "Moderate emerging signal worth monitoring."
        else:
            verdict = "Weak early signal; keep as background context."

        if not skip_llm:
            verdict, evidence = enhance_verdict(
                engine_name="SignalEngine",
                heuristic_verdict=verdict,
                heuristic_score=score,
                item_title=item.title,
                item_abstract=item.abstract or "",
                evidence_points=evidence,
                extra_context=f"source={item.source}, totals={totals}",
            )

        return EngineResult(score=round(score, 4), verdict=verdict, evidence=evidence, details=totals)

