from __future__ import annotations

from sqlalchemy import String, or_
from sqlalchemy.orm import Query

from app.db.models import ResearchItem


def apply_item_search_filter(query: Query, search: str | None) -> Query:
    if not search or not search.strip():
        return query

    terms = [term.strip().lower() for term in search.split() if term.strip()]
    if not terms:
        return query

    for term in terms:
        pattern = f"%{term}%"
        query = query.filter(
            or_(
                ResearchItem.title.ilike(pattern),
                ResearchItem.topic.ilike(pattern),
                ResearchItem.source.ilike(pattern),
                ResearchItem.abstract.ilike(pattern),
                ResearchItem.url.ilike(pattern),
                ResearchItem.authors.cast(String).ilike(pattern),
                ResearchItem.organizations.cast(String).ilike(pattern),
                ResearchItem.extra_metadata.cast(String).ilike(pattern),
            )
        )
    return query
