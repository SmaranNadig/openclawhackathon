from datetime import UTC, datetime
from typing import Any

import requests

from app.core.config import get_settings
from app.ingest.base import IngestionAdapter


class OpenAlexAdapter(IngestionAdapter):
    source_name = "openalex"

    def fetch(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        settings = get_settings()
        params = {
            "search": query,
            "per_page": min(limit, 20),
            "select": "id,display_name,abstract_inverted_index,doi,publication_date,authorships,cited_by_count,concepts",
        }
        
        # Use mailto for OpenAlex "polite pool" if available
        mailto = settings.crossref_mailto or "research@example.com"
        headers = {"User-Agent": f"PRISM Research Agent (mailto:{mailto})"}
        
        try:
            response = requests.get(
                "https://api.openalex.org/works",
                params=params,
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
            payload = response.json()
        except Exception:
            return []

        results = []
        for work in payload.get("results", []):
            # Reconstruct abstract from inverted index
            abstract = ""
            inverted_index = work.get("abstract_inverted_index")
            if inverted_index:
                # inverted_index is { "word": [pos1, pos2], ... }
                word_positions = []
                for word, positions in inverted_index.items():
                    for pos in positions:
                        word_positions.append((pos, word))
                word_positions.sort()
                abstract = " ".join(word for pos, word in word_positions)

            # Extract authors and organizations
            authors = []
            organizations = []
            for auth in work.get("authorships", []):
                author_name = auth.get("author", {}).get("display_name")
                if author_name:
                    authors.append(author_name)
                for inst in auth.get("institutions", []):
                    inst_name = inst.get("display_name")
                    if inst_name:
                        organizations.append(inst_name)

            # Date parsing
            pub_date = work.get("publication_date")
            try:
                timestamp = datetime.fromisoformat(pub_date).replace(tzinfo=UTC) if pub_date else datetime.now(UTC)
            except ValueError:
                timestamp = datetime.now(UTC)

            results.append(
                {
                    "title": work.get("display_name") or "OpenAlex work",
                    "abstract": abstract,
                    "source": self.source_name,
                    "url": work.get("doi") or work.get("id") or "",
                    "authors": authors,
                    "organizations": list(set(organizations)),
                    "topic": query,
                    "timestamp": timestamp,
                    "metadata": {
                        "openalex_id": work.get("id"),
                        "doi": work.get("doi"),
                        "concepts": [c.get("display_name") for c in work.get("concepts", [])],
                        "cited_by_count": work.get("cited_by_count", 0),
                    },
                    "signals": [
                        {
                            "source_type": self.source_name,
                            "mentions": work.get("cited_by_count", 0),
                            "evidence": [
                                "Fetched from OpenAlex scientific graph",
                                f"{work.get('cited_by_count', 0)} citations reported by OpenAlex",
                            ],
                            "raw_payload": {"id": work.get("id")},
                        }
                    ],
                }
            )
        return results
