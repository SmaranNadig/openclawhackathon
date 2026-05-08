# PRISM - Project Walkthrough

Welcome to PRISM, a full-stack research intelligence MVP built for the OpenClaw hackathon. This walkthrough will guide you through the project architecture, setup, and core functionality.

---

## 🎯 Project Overview

**PRISM** solves a critical problem: research teams, founders, and product builders are overwhelmed with papers, repositories, model releases, benchmarks, and industry signals. PRISM turns this noisy research stream into ranked, explainable intelligence.

### Key Features
- **Multi-source ingestion pipeline**: Pulls signals from 10+ research sources
- **Intelligent normalization**: Unifies papers, repos, models, news, and more into one schema
- **Five scoring engines**: Signal, Trust, Debate, Gap, and Cross-Domain engines
- **Vector memory**: Semantic linking with ChromaDB or local fallback
- **LLM reasoning**: Groq API with Ollama fallback for concise analysis
- **Interactive dashboard**: React frontend with live visualizations
- **OpenClaw agent**: Lightweight monitoring and alert routing

---

## 📁 Repository Structure

```
openclawhackathon/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # FastAPI routes and endpoints
│   │   ├── agent/             # OpenClaw-style routing agent
│   │   ├── core/              # Configuration and settings
│   │   ├── db/                # SQLAlchemy models and session
│   │   ├── engines/           # Scoring and fusion engines
│   │   ├── ingest/            # Source adapters (arXiv, GitHub, etc.)
│   │   ├── memory/            # Entity linking and vector memory
│   │   ├── reports/           # Markdown report export
│   │   ├── schemas/           # Pydantic data contracts
│   │   └── main.py            # FastAPI application entry point
│   ├── requirements.txt        # Python dependencies
│   └── .env.example            # Environment template
│
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── api/               # Typed API client and fallback data
│   │   ├── components/        # Dashboard UI components
│   │   └── App.tsx            # Main command-center interface
│   ├── package.json
│   └── .env.example            # Environment template
│
├── scripts/                    # Utility scripts
├── README.md                   # Project documentation
├── WALKTHROUGH.md              # This file
└── openclaw_service.py         # OpenClaw service integration
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 16+
- API keys (optional but recommended):
  - Groq API key for LLM features
  - GitHub token for repository ingestion
  - HuggingFace token for model data

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
copy .env.example .env  # Windows
# OR
cp .env.example .env   # macOS/Linux

# Start the FastAPI server
uvicorn app.main:app --reload
```

**Backend URLs:**
- API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment template
copy .env.example .env  # Windows
# OR
cp .env.example .env   # macOS/Linux

# Start development server
npm run dev
```

**Frontend URL:**
- Dashboard: `http://localhost:5173`

✅ **Frontend includes fallback demo data**, so it works even if the backend is offline.

---

## ⚙️ Configuration

### Backend Environment Variables (`backend/.env`)

Essential variables:

```env
# Database
DATABASE_URL=sqlite:///./prism.db

# LLM Configuration
ENABLE_LLM=true                           # Enable/disable LLM features
LLM_API_KEY=your_groq_key_here            # Groq API key
LLM_MODEL=llama-3.1-8b-instant            # Groq model
OLLAMA_BASE_URL=http://localhost:11434    # Local Ollama fallback
OLLAMA_MODEL=gemma3:latest                # Ollama model

# API Keys for Data Sources
GITHUB_TOKEN=                             # GitHub API access
HUGGINGFACE_TOKEN=                        # HuggingFace API access
SEMANTIC_SCHOLAR_API_KEY=                 # Semantic Scholar API
CROSSREF_MAILTO=                          # Crossref contact email

# RSS Feed Configuration
NEWS_RSS_FEEDS=https://www.technologyreview.com/feed/,https://venturebeat.com/category/ai/feed/
ENGINEERING_BLOG_RSS_FEEDS=https://netflixtechblog.com/feed,https://engineering.fb.com/feed/,https://aws.amazon.com/blogs/machine-learning/feed/

# Agent Configuration
ENABLE_SCHEDULER=false                    # Enable background agent
PRISM_HEARTBEAT_HOURS=6                   # Agent check interval
PRISM_AGENT_QUERY=multimodal agents       # Default query
PRISM_AGENT_LIMIT_PER_SOURCE=5            # Items per source
PRISM_AGENT_INCLUDE_DEMO=true             # Include demo signals
DISCORD_WEBHOOK_URL=                      # Optional Discord alerts
```

### Frontend Environment Variables (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000
```

⚠️ **Never commit real API keys.** The `.env` file is gitignored automatically.

---

## 🔄 Data Ingestion Pipeline

### Data Sources

PRISM ingests from multiple sources in parallel:

1. **Academic**: arXiv, OpenAlex, Semantic Scholar, Crossref
2. **Code**: GitHub, Hugging Face
3. **Benchmarks**: Papers With Code
4. **News**: RSS feeds (tech news, engineering blogs)
5. **Demo Signals**: Social trends, jobs, product launches (for demo coverage)

### Normalization

All sources are normalized into a unified schema with:
- Unique identifiers
- Metadata (authors, dates, links, citations)
- Full text/abstracts
- Source attribution

### Pipeline Resilience

- If one source fails, the pipeline continues with others
- Results are logged per source
- Graceful degradation with demo data

---

## 🧠 Scoring Engines

PRISM uses five independent scoring engines that fuse into one composite **PRISM Score**:

### 1. **Signal Engine** (25% weight)
Measures impact and traction:
- Novelty: How recent and unexplored
- Traction: Citations, stars, usage
- Recency: Publication/update timing
- Attention: Social signals

### 2. **Trust Engine** (25% weight)
Assesses reproducibility:
- Code availability and quality
- Dataset accessibility
- Benchmark presence
- Credible metadata
- Author reputation

### 3. **Debate Engine** (15% weight, inverted)
Flags controversial claims:
- Contradictions with prior work
- Replication risk
- Contested findings
- Lower score = higher controversy risk

### 4. **Gap Engine** (20% weight)
Academic vs. industry adoption:
- How many industries adopt this vs. academia
- Identifies cutting-edge vs. proven solutions
- Highlights emerging trends

### 5. **Cross-Domain Engine** (15% weight)
Transfer potential across domains:
- Domain breadth
- Source-to-target transfer paths
- Multi-disciplinary applicability

### Final Formula

```
PRISM = 0.25×Signal + 0.25×Trust + 0.15×(1-Debate) + 0.20×Gap + 0.15×CrossDomain
```

Each engine returns:
- `score`: Numeric value (0-100)
- `verdict`: Human-readable summary
- `evidence`: Key factors
- `details`: Detailed breakdown

---

## 🔌 Core API Endpoints

### Pipeline Management
- `POST /api/run-pipeline?query=...&limit_per_source=5` - Run ingestion and scoring

### Items & Memory
- `GET /api/items?limit=20&q=...` - List ranked items
- `GET /api/items/{item_id}` - Get item details
- `GET /api/memory/search?q=...` - Semantic search
- `GET /api/memory/links?item_id=...` - Find related items

### Analysis
- `GET /api/analysis/fusion-reports?limit=20&q=...` - Get scored results
- `GET /api/analysis/fusion-reports/{item_id}` - Get item analysis
- `POST /api/analysis/run-engines?item_id=...` - Rerun scoring
- `GET /api/analysis/engine-runs/{item_id}` - Engine run history

### Chat & Reports
- `POST /api/chat` - Chat about research items
- `POST /api/chat/debate` - Debate engine analysis
- `GET /api/reports/weekly.md` - Generate weekly report

### Agent Control
- `GET /api/agent/status` - Agent status
- `POST /api/agent/run-once` - Run agent once
- `GET /api/agent/alerts` - Alert history
- `GET /api/agent/profile` - Agent SOUL profile

---

## 🎨 Frontend Dashboard

The React dashboard provides:

- **Source Mix Chart**: Distribution across data sources
- **Research Queue**: Ranked items with PRISM scores
- **Evidence Panel**: Detailed scoring breakdown
- **Adoption-Gap Atlas**: Academic vs. industry adoption visualization
- **Cross-Domain Radar**: Domain transfer potential
- **Paper Chat**: Interactive Q&A about research items
- **Demo Mode**: Works offline with fallback data

### Key Features
- Real-time pipeline execution
- Search and filter results
- Detailed evidence traces
- Exportable reports

---

## 🤖 OpenClaw-Style Agent

PRISM includes a lightweight agent layer for autonomous monitoring and routing:

### Enable the Agent

Set in `backend/.env`:

```env
ENABLE_SCHEDULER=true
PRISM_HEARTBEAT_HOURS=6
PRISM_AGENT_QUERY=multimodal agents
PRISM_AGENT_LIMIT_PER_SOURCE=5
PRISM_AGENT_INCLUDE_DEMO=true
PRISM_SOUL_PROFILE_PATH=app/agent/soul_profile.yaml
DISCORD_WEBHOOK_URL=
```

### How It Works

1. Runs on a scheduled heartbeat (every 6 hours by default)
2. Executes the configured query
3. Scores results using all five engines
4. Routes alerts based on SOUL profile
5. Delivers via mock channel or Discord

### SOUL Profile

The agent uses a SOUL (Subjective Objective Uncertainty Learning) profile to determine:
- Alert thresholds
- Target channels
- Routing rules
- Personalization

---

## 📊 Demo Flow

### Try It Yourself

Use a broad query to get multi-source coverage:

```text
multimodal agents benchmark tool use
```

Or:

```text
graph neural networks drug discovery supply chain optimization
```

### Steps

1. Start the backend: `uvicorn app.main:app --reload`
2. Start the frontend: `npm run dev`
3. Open `http://localhost:5173`
4. Enter a query in the dashboard
5. Click **Run Pipeline**
6. Review:
   - Source mix chart
   - Ranked research queue
   - PRISM score cards
   - Evidence breakdown
   - Adoption-gap atlas
   - Cross-domain radar
   - Paper chat

### CLI Demo (No UI)

```bash
# Run pipeline and get results
curl -X POST "http://localhost:8000/api/run-pipeline?query=multimodal%20agents%20benchmark%20tool%20use&limit_per_source=5&include_demo=false"

# List items
curl "http://localhost:8000/api/items?limit=20&q=multimodal%20agents"

# Get fusion reports
curl "http://localhost:8000/api/analysis/fusion-reports?limit=20&q=multimodal%20agents&refresh=true"
```

---

## 🛠️ Development & Verification

### Code Quality Checks

```bash
# Backend
cd backend
python -m compileall app

# Frontend
cd ../frontend
npm run lint
```

### Testing Locally

1. **Without LLM**: Set `ENABLE_LLM=false` for deterministic scoring
2. **With Ollama**: Run local Ollama and configure fallback
3. **With Groq**: Add API key for cloud LLM features
4. **Demo Mode**: Frontend works offline with built-in fallback data

---

## 📌 Key Concepts

### Deterministic Fallbacks
- **Vector Memory**: Chroma with local file fallback
- **LLM**: Groq with Ollama local fallback
- **Frontend**: Built-in demo data when backend is offline
- **Database**: SQLite for local persistence

### Entity Linking
- Lightweight matching across sources
- Finds related papers, code, news about same topic
- Prevents duplicate ingestion

### Semantic Memory
- Vector embeddings for each item
- Enables similarity search
- Supports follow-up linking

---

## ⚡ Why It's Hackathon-Ready

✅ End-to-end full-stack application  
✅ Multi-source ingestion (not single-source scraper)  
✅ Deterministic fallbacks when LLMs disabled  
✅ No secret keys committed  
✅ Offline demo mode  
✅ Clear APIs for judging  
✅ Dashboard designed for live presentation  
✅ Groq-first with local Ollama safety net  

---

## 🔗 Next Steps

1. **Install dependencies** and configure `.env` files
2. **Start backend and frontend** (see Quick Start)
3. **Run a demo query** in the dashboard
4. **Explore the API docs** at `http://localhost:8000/docs`
5. **Review the code** in `backend/app/` for deep dives
6. **Enable the agent** for autonomous monitoring
7. **Customize** scoring weights and SOUL profile as needed

---

## 📚 Additional Resources

- **README.md**: Detailed feature list and architecture
- **OpenClaw_AI_Disclosure.pdf**: Transparency and methodology
- **openclaw_service.py**: Root OpenClaw service integration
- **API Docs**: Visit `http://localhost:8000/docs` when backend is running

---

**Good luck exploring PRISM!** 🚀
