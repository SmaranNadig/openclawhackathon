import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import EntityLink, FusionReportRecord, ResearchItem, SourceSignal
from app.ingest.arxiv_adapter import ArxivAdapter
from app.ingest.crossref_adapter import CrossrefAdapter
from app.ingest.engineering_blog_adapter import EngineeringBlogAdapter
from app.ingest.github_adapter import GitHubAdapter
from app.ingest.huggingface_adapter import HuggingFaceAdapter
from app.ingest.mock_social_adapter import MockJobsAdapter, MockProductLaunchAdapter, MockSocialAdapter
from app.ingest.news_adapter import NewsAdapter
from app.ingest.openalex_adapter import OpenAlexAdapter
from app.ingest.papers_with_code_adapter import PapersWithCodeAdapter
from app.ingest.semantic_scholar_adapter import SemanticScholarAdapter
from app.ingest.normalizer import normalize_many
from app.ingest.seed_data import demo_raw_items
from app.memory.entity_linker import EntityLinker
from app.memory.chroma_store import ChromaVectorMemory
from app.schemas.research import NormalizedItem, PipelineRunResponse


import logging

logger = logging.getLogger("prism.ingest.pipeline")


class IngestionPipeline:
    def __init__(self) -> None:
        settings = get_settings()
        self.adapters = [
            ArxivAdapter(),
            OpenAlexAdapter(),
            SemanticScholarAdapter(),
            CrossrefAdapter(settings.crossref_mailto),
            GitHubAdapter(settings.github_token),
            HuggingFaceAdapter(settings.huggingface_token),
            PapersWithCodeAdapter(settings.papers_with_code_api_url),
            NewsAdapter(settings.rss_feed_list),
            EngineeringBlogAdapter(settings.engineering_blog_feed_list),
            MockSocialAdapter(),
            MockJobsAdapter(),
            MockProductLaunchAdapter(),
        ]
        self.linker = EntityLinker()
        self.memory = ChromaVectorMemory()

    def run(self, db: Session, query: str = "multimodal agents", limit_per_source: int = 5, include_demo: bool = True) -> PipelineRunResponse:
        logger.info(f"🚀 Starting PRISM pipeline run for query: '{query}'")
        raw_items = demo_raw_items() if include_demo else []
        if include_demo:
            logger.info(f"📦 Loaded {len(raw_items)} fallback demo items.")
            
        logger.info(f"📡 Fetching from {len(self.adapters)} sources in parallel...")
        
        with ThreadPoolExecutor(max_workers=len(self.adapters)) as executor:
            future_to_adapter = {
                executor.submit(adapter.fetch, query=query, limit=limit_per_source): adapter 
                for adapter in self.adapters
            }
            
            for future in as_completed(future_to_adapter):
                adapter = future_to_adapter[future]
                try:
                    fetched = future.result()
                    raw_items.extend(fetched)
                    if fetched:
                        logger.info(f"   ✅ {adapter.source_name} returned {len(fetched)} items.")
                    else:
                        logger.info(f"   ➖ {adapter.source_name} returned 0 items.")
                except Exception as e:
                    logger.error(f"   ❌ Error fetching from {adapter.source_name}: {e}")

        before_filter = len(raw_items)
        raw_items = [item for item in raw_items if self._matches_query(item, query)]
        logger.info("🔎 Query relevance filter kept %s/%s raw items.", len(raw_items), before_filter)
        sources = {item["source"] for item in raw_items}

        logger.info(f"⚙️ Normalizing {len(raw_items)} raw items...")
        normalized_items = normalize_many(raw_items)
        
        logger.info("💾 Storing items and signals to database...")
        stored_items, stored_signals, changed_item_ids = self._store_items(db, normalized_items)
        
        logger.info("🔗 Running entity linker...")
        normalized_item_ids = {item.id for item in normalized_items}
        entity_links = self._store_links(db, self.linker.link_items(normalized_items), normalized_item_ids)
        if normalized_item_ids:
            self._invalidate_analysis_cache(db, normalized_item_ids)
        
        logger.info("🧠 Indexing memory documents...")
        memory_documents = self.memory.index_items(db, normalized_items)

        logger.info(f"🏁 Pipeline complete! Stored {stored_items} items and {stored_signals} signals.")
        return PipelineRunResponse(
            ingested_items=len(normalized_items),
            stored_items=stored_items,
            stored_signals=stored_signals,
            entity_links=entity_links,
            memory_documents=memory_documents,
            sources=sorted(sources),
            item_ids=[item.id for item in normalized_items],
        )

    def _store_items(self, db: Session, items: list[NormalizedItem]) -> tuple[int, int, set[str]]:
        stored_items = 0
        stored_signals = 0
        changed_item_ids: set[str] = set()
        for item in items:
            existing = db.query(ResearchItem).filter(
                (ResearchItem.id == item.id) | (ResearchItem.url == item.url)
            ).first()
            if existing is None:
                db.add(
                    ResearchItem(
                        id=item.id,
                        title=item.title,
                        abstract=item.abstract,
                        source=item.source,
                        url=item.url,
                        authors=item.authors,
                        organizations=item.organizations,
                        topic=item.topic,
                        timestamp=item.timestamp,
                        extra_metadata=item.metadata,
                    )
                )
                stored_items += 1
                changed_item_ids.add(item.id)
            else:
                item.id = existing.id
                if self._update_existing_item(existing, item):
                    changed_item_ids.add(item.id)
            for signal in item.signals:
                signal_exists = (
                    db.query(SourceSignal)
                    .filter(SourceSignal.item_id == item.id, SourceSignal.source_type == signal.source_type)
                    .first()
                )
                if signal_exists:
                    if self._update_existing_signal(signal_exists, signal):
                        stored_signals += 1
                        changed_item_ids.add(item.id)
                    continue
                db.add(
                    SourceSignal(
                        item_id=item.id,
                        source_type=signal.source_type,
                        stars=signal.stars,
                        forks=signal.forks,
                        commits=signal.commits,
                        model_downloads=signal.model_downloads,
                        mentions=signal.mentions,
                        evidence=signal.evidence,
                        raw_payload=signal.raw_payload,
                    )
                )
                stored_signals += 1
                changed_item_ids.add(item.id)
        db.commit()
        return stored_items, stored_signals, changed_item_ids

    def _store_links(self, db: Session, candidates: list, item_ids: set[str]) -> int:
        if item_ids:
            db.query(EntityLink).filter(
                (EntityLink.source_item_id.in_(item_ids)) | (EntityLink.target_item_id.in_(item_ids))
            ).delete(synchronize_session=False)
            db.flush()
        stored = 0
        for candidate in candidates:
            exists = (
                db.query(EntityLink)
                .filter(
                    EntityLink.source_item_id == candidate.source_item_id,
                    EntityLink.target_item_id == candidate.target_item_id,
                    EntityLink.relation_type == candidate.relation_type,
                )
                .first()
            )
            if exists:
                continue
            db.add(
                EntityLink(
                    source_item_id=candidate.source_item_id,
                    target_item_id=candidate.target_item_id,
                    relation_type=candidate.relation_type,
                    confidence=candidate.confidence,
                    evidence=candidate.evidence,
                )
            )
            stored += 1
        db.commit()
        return stored

    def _update_existing_item(self, existing: ResearchItem, item: NormalizedItem) -> bool:
        changed = False
        
        existing_sources = [s.strip() for s in existing.source.split(',')]
        if item.source not in existing_sources:
            existing.source = f"{existing.source}, {item.source}"
            changed = True

        if len(item.title) > len(existing.title or ""):
            existing.title = item.title
            changed = True
            
        if len(item.abstract) > len(existing.abstract or ""):
            existing.abstract = item.abstract
            changed = True
            
        if item.topic != "general" and existing.topic == "general":
            existing.topic = item.topic
            changed = True

        current_authors = list(existing.authors or [])
        new_authors = [a for a in (item.authors or []) if a not in current_authors]
        if new_authors:
            existing.authors = current_authors + new_authors
            changed = True

        current_orgs = list(existing.organizations or [])
        new_orgs = [o for o in (item.organizations or []) if o not in current_orgs]
        if new_orgs:
            existing.organizations = current_orgs + new_orgs
            changed = True

        current_meta = dict(existing.extra_metadata or {})
        meta_changed = False
        for k, v in (item.metadata or {}).items():
            if k not in current_meta or current_meta[k] != v:
                current_meta[k] = v
                meta_changed = True
        if meta_changed:
            existing.extra_metadata = current_meta
            changed = True

        return changed

    def _update_existing_signal(self, existing: SourceSignal, signal) -> bool:
        changed = False
        updates = {
            "stars": max(existing.stars or 0, signal.stars or 0),
            "forks": max(existing.forks or 0, signal.forks or 0),
            "commits": max(existing.commits or 0, signal.commits or 0),
            "model_downloads": max(existing.model_downloads or 0, signal.model_downloads or 0),
            "mentions": max(existing.mentions or 0, signal.mentions or 0),
        }
        for field, value in updates.items():
            if getattr(existing, field) != value:
                setattr(existing, field, value)
                changed = True
                
        current_evidence = list(existing.evidence or [])
        new_evidence = [e for e in (signal.evidence or []) if e not in current_evidence]
        if new_evidence:
            existing.evidence = current_evidence + new_evidence
            changed = True
            
        current_payload = dict(existing.raw_payload or {})
        payload_changed = False
        for k, v in (signal.raw_payload or {}).items():
            if k not in current_payload or current_payload[k] != v:
                current_payload[k] = v
                payload_changed = True
        if payload_changed:
            existing.raw_payload = current_payload
            changed = True

        return changed

    def _invalidate_analysis_cache(self, db: Session, changed_item_ids: set[str]) -> None:
        query = db.query(FusionReportRecord)
        if changed_item_ids:
            query = query.filter(FusionReportRecord.item_id.in_(changed_item_ids))
        query.delete(synchronize_session=False)
        db.commit()

    def _matches_query(self, raw_item: dict[str, Any], query: str) -> bool:
        terms = [term for term in query.lower().split() if len(term) > 2]
        if not terms:
            return True

        metadata = raw_item.get("metadata") or {}
        haystack_parts = [
            raw_item.get("title", ""),
            raw_item.get("topic", ""),
            raw_item.get("source", ""),
            raw_item.get("abstract", ""),
            raw_item.get("summary", ""),
            raw_item.get("description", ""),
            raw_item.get("url", ""),
            " ".join(str(author) for author in raw_item.get("authors", [])),
            " ".join(str(org) for org in raw_item.get("organizations", [])),
            " ".join(str(value) for value in metadata.values() if value is not None),
        ]
        haystack = " ".join(str(part) for part in haystack_parts).lower()
        phrase = query.lower().strip()
        if phrase and phrase in haystack:
            return True

        hits = sum(1 for term in terms if term in haystack)
        required_hits = min(len(terms), max(1, math.ceil(len(terms) * 0.4)))
        return hits >= required_hits
