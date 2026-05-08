# PRISM - OpenClaw Research Intelligence

PRISM is a full-stack research intelligence MVP built for the OpenClaw hackathon. It ingests research and innovation signals from multiple sources, links related work, stores semantic memory, scores each item with specialized engines, and presents a polished command-center dashboard for discovery, comparison, chat, and cross-domain opportunity analysis.

## Problem

Research teams, founders, and product builders are flooded with papers, repositories, model releases, benchmarks, and industry signals. The hard part is not finding one paper; it is knowing which ideas are novel, trustworthy, contested, under-adopted, and transferable to another domain.

PRISM turns noisy research streams into ranked, explainable intelligence.

## What It Does

- Pulls research signals from multiple sources in one pipeline run.
- Normalizes papers, repositories, models, news, engineering blogs, and demo market signals into one schema.
- Links related items with lightweight entity and topic matching.
- Stores items in SQLite and indexes semantic memory with Chroma or a local fallback.
- Runs five scoring engines:
  - Signal Engine: novelty, traction, recency, and attention.
  - Trust Engine: reproducibility, code, datasets, benchmarks, and credible metadata.
  - Debate Engine: contradiction, replication risk, and contested claims.
  - Gap Engine: academic momentum versus industry adoption.
  - Cross-Domain Engine: source-to-target transfer paths and domain breadth.
- Fuses engine scores into a PRISM score with evidence.
- Uses Groq first and local Ollama fallback for concise LLM reasoning when enabled.
- Provides a React dashboard with source mix, rankings, evidence trace, cross-domain radar, adoption-gap atlas, persona suggestions, and paper chat.
- Includes an OpenClaw-style agent loop for monitoring, routing, and alerts.

## Live Data Sources

The ingestion pipeline fans out across these adapters and continues even if one source returns no results:

- arXiv
- OpenAlex
- Semantic Scholar
- Crossref
- GitHub
- Hugging Face
- Papers With Code
- News RSS feeds
- Engineering blog RSS feeds
- Mock social, jobs, and product-launch signals for demo coverage

## Tech Stack

Backend:

- FastAPI
- SQLAlchemy
- SQLite
- Pydantic
- ChromaDB with local vector-memory fallback
- Groq API and Ollama fallback
- APScheduler for the optional agent heartbeat

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- Framer Motion
- Lucide icons

## Repository Structure

```text
backend/
  app/
    api/          FastAPI routes
    agent/        OpenClaw-style routing and heartbeat agent
    core/         settings and environment config
    db/           SQLAlchemy models and session setup
    engines/      scoring and fusion engines
    ingest/       source adapters and ingestion pipeline
    memory/       entity linking and vector memory
    reports/      markdown report export
    schemas/      Pydantic contracts
    main.py       FastAPI app entrypoint
  requirements.txt

frontend/
  src/
    api/          typed API client and fallback data
    components/   dashboard components
    App.tsx       main command-center UI
  package.json

README.md
```

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Backend URLs:

- API docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL:

- Dashboard: `http://localhost:5173`

The frontend includes fallback demo data, so it still renders if the backend is offline. Start the backend and press the run button in the UI to ingest live results.

## Environment Variables

Backend variables live in `backend/.env`.

Important values:

```env
DATABASE_URL=sqlite:///./prism.db
ENABLE_LLM=true
LLM_API_KEY=your_groq_key_here
LLM_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:latest
GITHUB_TOKEN=
HUGGINGFACE_TOKEN=
SEMANTIC_SCHOLAR_API_KEY=
CROSSREF_MAILTO=
NEWS_RSS_FEEDS=https://www.technologyreview.com/feed/,https://venturebeat.com/category/ai/feed/
ENGINEERING_BLOG_RSS_FEEDS=https://netflixtechblog.com/feed,https://engineering.fb.com/feed/,https://aws.amazon.com/blogs/machine-learning/feed/
ENABLE_SCHEDULER=false
```

Frontend variables live in `frontend/.env`.

```env
VITE_API_BASE_URL=http://localhost:8000
```

Do not commit real API keys. `.env` is ignored by git.

## Demo Flow

Use a broad query so multiple sources can contribute:

```text
multimodal agents benchmark tool use
```

or:

```text
graph neural networks drug discovery supply chain optimization
```

Then:

1. Start backend and frontend.
2. Enter the query in the dashboard.
3. Click the pipeline run button.
4. Review:
   - source mix chart
   - ranked research queue
   - PRISM score cards
   - evidence panel
   - adoption-gap atlas
   - cross-domain radar
   - paper chat

CLI demo:

```bash
curl -X POST "http://localhost:8000/api/run-pipeline?query=multimodal%20agents%20benchmark%20tool%20use&limit_per_source=5&include_demo=false"
curl "http://localhost:8000/api/items?limit=20&q=multimodal%20agents"
curl "http://localhost:8000/api/analysis/fusion-reports?limit=20&q=multimodal%20agents&refresh=true"
```

## Core API Endpoints

Pipeline:

- `POST /api/run-pipeline`

Items and memory:

- `GET /api/items`
- `GET /api/items/{item_id}`
- `GET /api/memory/search`
- `GET /api/memory/links`

Analysis:

- `GET /api/analysis/fusion-reports`
- `GET /api/analysis/fusion-reports/{item_id}`
- `POST /api/analysis/run-engines`
- `GET /api/analysis/engine-runs/{item_id}`

Chat and reports:

- `POST /api/chat`
- `POST /api/chat/debate`
- `GET /api/reports/weekly.md`

Agent:

- `GET /api/agent/status`
- `POST /api/agent/run-once`
- `GET /api/agent/alerts`
- `GET /api/agent/profile`

## Scoring Model

PRISM computes a fused score from five independent signals:

```text
PRISM =
  0.25 * Signal
+ 0.25 * Trust
+ 0.15 * (1 - Debate)
+ 0.20 * Gap
+ 0.15 * CrossDomain
```

Each engine returns:

- `score`
- `verdict`
- `evidence`
- `details`

Cross-domain details include domain scores, active domains, candidate topics, and source-to-target transfer paths for the radar visualization.

## OpenClaw-Style Agent

PRISM includes a lightweight agent layer that can run as part of the FastAPI process. It uses the same ingestion, memory, and engine modules as tools, then applies a SOUL profile for alert routing.

Enable it in `backend/.env`:

```env
ENABLE_SCHEDULER=true
PRISM_HEARTBEAT_HOURS=6
PRISM_AGENT_QUERY=multimodal agents
PRISM_AGENT_LIMIT_PER_SOURCE=5
PRISM_AGENT_INCLUDE_DEMO=true
PRISM_SOUL_PROFILE_PATH=app/agent/soul_profile.yaml
DISCORD_WEBHOOK_URL=
```

The default mock channel records delivery attempts in memory. Discord delivery can be enabled by adding `discord` to the SOUL profile channel list and setting `DISCORD_WEBHOOK_URL`.

## Why It Is Hackathon-Ready

- End-to-end full stack application.
- Multi-source ingestion instead of a single-source scraper.
- Deterministic fallback scoring when LLMs are disabled.
- Groq-first LLM path with local Ollama fallback.
- No secret keys committed.
- Offline demo mode through fallback data and mock signals.
- Clear APIs for judging and integration.
- Dashboard designed for live presentation, not just raw API output.

## Verification

Commands used during cleanup:

```bash
cd backend
python -m compileall app

cd ../frontend
npm run lint
```

## Notes

- Some public APIs may rate-limit or return zero results for narrow queries. The pipeline logs per-source results and continues with sources that succeed.
- Chroma and SQLite are local development persistence layers.
- The current default Groq model is `llama-3.1-8b-instant` to reduce credit usage.
- `.env`, virtual environments, build outputs, and local database files are ignored.
