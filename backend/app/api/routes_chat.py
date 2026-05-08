"""Paper-grounded RAG chat endpoint.

Users can ask questions about ingested papers and get LLM-powered answers
with citations. Context is built from:
  1. Semantic memory search (ChromaDB or LocalVectorMemory)
  2. The selected paper's abstract + metadata
  3. Related papers via entity links
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.query_filters import apply_item_search_filter
from app.db.models import EntityLink, FusionReportRecord, ResearchItem
from app.db.session import get_db
from app.engines.llm_client import ask_llm_with_provider
from app.memory.chroma_store import ChromaVectorMemory
from app.memory.vector_store import LocalVectorMemory

logger = logging.getLogger("prism.chat")

router = APIRouter(prefix="/api/chat", tags=["chat"])


class ChatRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    item_id: str | None = None
    topic_filter: str | None = None
    context_limit: int = Field(default=5, ge=1, le=15)


class ChatCitation(BaseModel):
    item_id: str
    title: str
    url: str
    relevance: float


class ChatResponse(BaseModel):
    answer: str
    citations: list[ChatCitation]
    provider: str
    context_papers: int
    question: str


def _score_text(value: float | None) -> str:
    return f"{value:.2f}" if value is not None else "N/A"


def _plain_text_answer(raw: str) -> str:
    """Convert accidental JSON model output into user-readable prose."""
    text = raw.strip()
    if not (text.startswith("{") and text.endswith("}")):
        return text
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text

    for key in ("answer", "response", "summary", "verdict"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    parts: list[str] = []
    for key, value in data.items():
        if isinstance(value, str) and value.strip():
            parts.append(f"**{key.replace('_', ' ').title()}**: {value.strip()}")
        elif isinstance(value, list) and value:
            rendered = "; ".join(str(item) for item in value[:5])
            parts.append(f"**{key.replace('_', ' ').title()}**: {rendered}")
    return "\n\n".join(parts) if parts else text


def _build_context(db: Session, request: ChatRequest) -> tuple[str, list[ChatCitation]]:
    """Build RAG context from memory search + optional focused item."""
    citations: list[ChatCitation] = []
    context_blocks: list[str] = []

    # 1. If a specific paper is targeted, use it as primary context
    if request.item_id:
        item = db.get(ResearchItem, request.item_id)
        if item:
            report = (
                db.query(FusionReportRecord)
                .filter(FusionReportRecord.item_id == item.id)
                .order_by(FusionReportRecord.created_at.desc())
                .first()
            )
            context_blocks.append(
                f"[PRIMARY PAPER]\n"
                f"Title: {item.title}\n"
                f"Topic: {item.topic}\n"
                f"Source: {item.source}\n"
                f"Authors: {', '.join(item.authors[:5])}\n"
                f"Abstract: {item.abstract}\n"
                f"PRISM Score: {_score_text(report.prism_score if report else None)}\n"
                f"Verdict: {report.verdict if report else 'N/A'}\n"
            )
            citations.append(ChatCitation(
                item_id=item.id, title=item.title, url=item.url, relevance=1.0,
            ))

            # Also grab related papers via entity links
            links = (
                db.query(EntityLink)
                .filter(
                    (EntityLink.source_item_id == item.id)
                    | (EntityLink.target_item_id == item.id)
                )
                .order_by(EntityLink.confidence.desc())
                .limit(5)
                .all()
            )
            related_ids = set()
            for link in links:
                rid = link.target_item_id if link.source_item_id == item.id else link.source_item_id
                related_ids.add(rid)
            if related_ids:
                related_items = db.query(ResearchItem).filter(ResearchItem.id.in_(related_ids)).all()
                for ri in related_items[:3]:
                    context_blocks.append(
                        f"[RELATED PAPER]\n"
                        f"Title: {ri.title}\n"
                        f"Topic: {ri.topic}\n"
                        f"Abstract: {ri.abstract[:400]}\n"
                    )
                    citations.append(ChatCitation(
                        item_id=ri.id, title=ri.title, url=ri.url, relevance=0.7,
                    ))

    # 2. Semantic memory search for the question
    chroma = ChromaVectorMemory()
    memory = chroma if chroma.available else LocalVectorMemory()
    hits = memory.search(db=db, query=request.question, limit=request.context_limit)
    seen_ids = {c.item_id for c in citations}

    for hit in hits:
        if hit.item_id in seen_ids:
            continue
        seen_ids.add(hit.item_id)
        item = db.get(ResearchItem, hit.item_id)
        if not item:
            continue
        context_blocks.append(
            f"[MEMORY HIT — relevance={hit.score:.2f}]\n"
            f"Title: {item.title}\n"
            f"Topic: {item.topic}\n"
            f"Abstract: {item.abstract[:400]}\n"
        )
        citations.append(ChatCitation(
            item_id=item.id, title=item.title, url=item.url, relevance=round(hit.score, 3),
        ))

    # 3. If still few results, do a keyword search
    if len(context_blocks) < 3:
        keyword_items = (
            apply_item_search_filter(db.query(ResearchItem), request.question)
            .limit(5)
            .all()
        )
        for item in keyword_items:
            if item.id in seen_ids:
                continue
            seen_ids.add(item.id)
            context_blocks.append(
                f"[KEYWORD MATCH]\n"
                f"Title: {item.title}\n"
                f"Topic: {item.topic}\n"
                f"Abstract: {item.abstract[:400]}\n"
            )
            citations.append(ChatCitation(
                item_id=item.id, title=item.title, url=item.url, relevance=0.4,
            ))

    context = "\n---\n".join(context_blocks[:request.context_limit])
    return context, citations


CHAT_SYSTEM_PROMPT = (
    "You are PRISM's research assistant. You answer questions about scientific papers "
    "using ONLY the provided context. If the context doesn't contain enough information "
    "to answer, say so honestly. Always cite which paper(s) support your answer. "
    "Be concise, technical, and actionable. Use normal English with light markdown. "
    "Do not return JSON, XML, code fences, or a machine-readable object."
)


@router.post("", response_model=ChatResponse)
def chat_with_papers(request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    """RAG-powered chat over ingested research papers."""
    context, citations = _build_context(db, request)

    if not context.strip():
        return ChatResponse(
            answer="No papers found in PRISM's memory matching your question. "
                   "Try running the pipeline first with `Run Press` to ingest papers.",
            citations=[],
            provider="none",
            context_papers=0,
            question=request.question,
        )

    user_prompt = (
        f"Context papers:\n{context}\n\n"
        f"User question: {request.question}\n\n"
        "Answer in normal English using the context above. Cite paper titles when referencing them. "
        "Do not output JSON."
    )

    answer, provider = ask_llm_with_provider(
        CHAT_SYSTEM_PROMPT, user_prompt, max_tokens=450, temperature=0.25, structured=False,
    )

    if not answer:
        # Heuristic fallback
        top_titles = [c.title for c in citations[:3]]
        answer = (
            f"Based on {len(citations)} papers in PRISM's memory, "
            f"the most relevant are: {'; '.join(top_titles)}. "
            "Enable an LLM provider (Groq or Ollama) for detailed AI-powered answers."
        )
        provider = "heuristic"
    else:
        answer = _plain_text_answer(answer)

    return ChatResponse(
        answer=answer,
        citations=citations,
        provider=provider,
        context_papers=len(citations),
        question=request.question,
    )


@router.post("/debate", response_model=ChatResponse)
def debate_papers(
    paper_a_id: str = Query(..., description="First paper ID"),
    paper_b_id: str = Query(..., description="Second paper ID"),
    db: Session = Depends(get_db),
) -> ChatResponse:
    """LLM-powered head-to-head debate between two papers."""
    item_a = db.get(ResearchItem, paper_a_id)
    item_b = db.get(ResearchItem, paper_b_id)

    if not item_a or not item_b:
        return ChatResponse(
            answer="One or both papers not found.",
            citations=[], provider="none", context_papers=0,
            question=f"Debate: {paper_a_id} vs {paper_b_id}",
        )

    report_a = db.query(FusionReportRecord).filter(FusionReportRecord.item_id == item_a.id).order_by(FusionReportRecord.created_at.desc()).first()
    report_b = db.query(FusionReportRecord).filter(FusionReportRecord.item_id == item_b.id).order_by(FusionReportRecord.created_at.desc()).first()

    context = (
        f"[PAPER A]\n"
        f"Title: {item_a.title}\nTopic: {item_a.topic}\nAbstract: {item_a.abstract}\n"
        f"PRISM Score: {_score_text(report_a.prism_score if report_a else None)}\n"
        f"Trust: {_score_text(report_a.trust_score if report_a else None)}\n"
        f"Verdict: {report_a.verdict if report_a else 'N/A'}\n\n"
        f"[PAPER B]\n"
        f"Title: {item_b.title}\nTopic: {item_b.topic}\nAbstract: {item_b.abstract}\n"
        f"PRISM Score: {_score_text(report_b.prism_score if report_b else None)}\n"
        f"Trust: {_score_text(report_b.trust_score if report_b else None)}\n"
        f"Verdict: {report_b.verdict if report_b else 'N/A'}\n"
    )

    system = (
        "You are PRISM's debate analyst. Compare two research papers objectively. "
        "Structure your response as:\n"
        "## Paper A Strengths\n## Paper B Strengths\n"
        "## Key Differences\n## Verdict\n"
        "Be specific and cite data points from the abstracts. Do not output JSON."
    )
    prompt = f"Compare these two papers:\n\n{context}"

    answer, provider = ask_llm_with_provider(system, prompt, max_tokens=450, temperature=0.3, structured=False)

    if not answer:
        sa = report_a.prism_score if report_a else 0
        sb = report_b.prism_score if report_b else 0
        winner = item_a.title if sa >= sb else item_b.title
        answer = (
            f"**Paper A**: {item_a.title} (PRISM: {sa:.0%})\n"
            f"**Paper B**: {item_b.title} (PRISM: {sb:.0%})\n\n"
            f"Based on heuristic scores, **{winner}** has a stronger overall signal. "
            "Enable Groq or Ollama for a detailed AI-powered debate analysis."
        )
        provider = "heuristic"
    else:
        answer = _plain_text_answer(answer)

    citations = [
        ChatCitation(item_id=item_a.id, title=item_a.title, url=item_a.url, relevance=1.0),
        ChatCitation(item_id=item_b.id, title=item_b.title, url=item_b.url, relevance=1.0),
    ]

    return ChatResponse(
        answer=answer,
        citations=citations,
        provider=provider,
        context_papers=2,
        question=f"Debate: {item_a.title} vs {item_b.title}",
    )
