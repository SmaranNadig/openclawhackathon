from app.db.models import ResearchItem, SourceSignal
from app.engines.llm_client import enhance_verdict
from app.engines.schemas import EngineResult, clamp
from app.engines.utils import log_norm, signal_totals, text_blob

INDUSTRY_TERMS = ["job", "jobs", "hiring", "company", "enterprise", "product", "deployment", "pilot", "industry", "hospital"]
ACADEMIC_SOURCES = {"arxiv", "huggingface"}
INDUSTRY_SOURCES = {"news", "mock_jobs"}


class GapEngine:
    def score(self, item: ResearchItem, signals: list[SourceSignal], related_items: list[ResearchItem], skip_llm: bool = False) -> EngineResult:
        totals = signal_totals(signals)
        academic_momentum = 0.0
        if item.source in ACADEMIC_SOURCES:
            academic_momentum += 0.25
        academic_momentum += 0.25 * log_norm(totals["stars"], 800)
        academic_momentum += 0.2 * log_norm(totals["downloads"], 3000)
        academic_momentum += 0.15 * log_norm(totals["mentions"], 50)
        academic_momentum += 0.15 * log_norm(totals["commits"], 60)
        academic_momentum = clamp(academic_momentum)

        industry_related = [related for related in related_items if related.source in INDUSTRY_SOURCES or any(term in text_blob(related) for term in INDUSTRY_TERMS)]
        industry_signal = min(len(industry_related) / 4, 1.0)
        if item.source in INDUSTRY_SOURCES:
            industry_signal = max(industry_signal, 0.5)

        gap_score = clamp(academic_momentum * (1 - 0.65 * industry_signal))
        if academic_momentum > 0.55 and industry_signal < 0.35:
            gap_score = clamp(gap_score + 0.18)

        evidence = [
            f"Academic momentum estimate: {academic_momentum:.2f}.",
            f"Industry adoption signal estimate: {industry_signal:.2f} from {len(industry_related)} related industry/news/job items.",
        ]
        for related in industry_related[:4]:
            evidence.append(f"Industry signal: {related.title} ({related.source}).")

        if gap_score >= 0.7:
            verdict = "Large adoption gap: strong research momentum has not translated into broad industry uptake."
        elif gap_score >= 0.4:
            verdict = "Moderate adoption gap: there may be a near-term product opportunity."
        else:
            verdict = "Small adoption gap: industry signal is already visible or research momentum is still early."

        if not skip_llm:
            verdict, evidence = enhance_verdict(
                engine_name="GapEngine",
                heuristic_verdict=verdict,
                heuristic_score=gap_score,
                item_title=item.title,
                item_abstract=item.abstract or "",
                evidence_points=evidence,
                extra_context=f"source={item.source}, academic_momentum={academic_momentum:.4f}, industry_signal={industry_signal:.4f}",
            )

        return EngineResult(
            score=round(gap_score, 4),
            verdict=verdict,
            evidence=evidence,
            details={"academic_momentum": round(academic_momentum, 4), "industry_signal": round(industry_signal, 4)},
        )
