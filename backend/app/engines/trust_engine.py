from app.db.models import ResearchItem, SourceSignal
from app.engines.llm_client import enhance_verdict
from app.engines.schemas import EngineResult, clamp
from app.engines.utils import has_any_url, text_blob


class TrustEngine:
    def score(self, item: ResearchItem, signals: list[SourceSignal], skip_llm: bool = False) -> EngineResult:
        metadata = item.extra_metadata or {}
        blob = text_blob(item)
        evidence: list[str] = []
        score = 0.15
        risk_flags: list[str] = []

        if item.source == "github" or has_any_url(metadata, ["code_url", "repo", "repository", "linked_repo"]):
            score += 0.25
            evidence.append("Code or repository availability was detected.")
        else:
            risk_flags.append("No clear public code link detected.")

        if has_any_url(metadata, ["dataset_url", "data_url", "dataset"]):
            score += 0.2
            evidence.append("Dataset availability was detected.")
        else:
            risk_flags.append("No public dataset link detected.")

        if metadata.get("benchmark") or any(term in blob for term in ["benchmark", "evaluation", "eval", "mmlu", "mmmu", "scienceqa"]):
            score += 0.2
            evidence.append("Benchmark or evaluation signal was detected.")
        else:
            risk_flags.append("Benchmark details are unclear.")

        if metadata.get("license"):
            score += 0.1
            evidence.append(f"License metadata found: {metadata.get('license')}.")

        if any(term in blob for term in ["replication", "reproduce", "robust", "ablation", "baseline"]):
            score += 0.1
            evidence.append("Replication/robustness/evaluation language appears in the text.")

        if any(term in blob for term in ["teaser", "upcoming", "rumor", "unverified"]):
            score -= 0.1
            risk_flags.append("Signal contains teaser or unverified language.")

        score = clamp(score)
        evidence.extend(risk_flags[:3])

        if score >= 0.75:
            verdict = "High trust: reproducibility signals are strong."
        elif score >= 0.45:
            verdict = "Medium trust: useful but some replication details are missing."
        else:
            verdict = "Low trust: insufficient reproducibility evidence."

        if not skip_llm:
            verdict, evidence = enhance_verdict(
                engine_name="TrustEngine",
                heuristic_verdict=verdict,
                heuristic_score=score,
                item_title=item.title,
                item_abstract=item.abstract or "",
                evidence_points=evidence,
                extra_context=f"source={item.source}, metadata_keys={sorted(metadata.keys())}",
            )

        return EngineResult(
            score=round(score, 4),
            verdict=verdict,
            evidence=evidence,
            details={"risk_flags": risk_flags, "metadata_keys": sorted(metadata.keys())},
        )
