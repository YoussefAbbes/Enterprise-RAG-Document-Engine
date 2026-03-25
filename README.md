# Enterprise RAG Document Engine

A production-ready Retrieval-Augmented Generation (RAG) system for uploading, processing, and conversing with PDF documents using LLMs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Enterprise RAG Engine                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Next.js    │────▶│   FastAPI    │────▶│  LangChain   │                │
│  │   Frontend   │     │   Backend    │     │  Pipeline    │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    ▼                    ▼                         │
│         │            ┌──────────────┐     ┌──────────────┐                 │
│         │            │  PostgreSQL  │     │    Qdrant    │                 │
│         │            │  (Metadata)  │     │  (Vectors)   │                 │
│         │            └──────────────┘     └──────────────┘                 │
│         │                    │                                              │
│         │                    ▼                                              │
│         │            ┌──────────────┐                                       │
│         └───────────▶│    MinIO     │                                       │
│                      │  (Storage)   │                                       │
│                      └──────────────┘                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js, Tailwind CSS, shadcn/ui | User interface |
| Backend | Python FastAPI | REST API |
| Orchestration | LangChain | RAG pipeline |
| Vector DB | Qdrant | Semantic search |
| Object Storage | MinIO | PDF storage |
| Database | PostgreSQL | Metadata & history |
| Container | Docker Compose | Orchestration |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Git

### 1. Clone and Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional for local dev)
```

### 2. Start Services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

### 3. Verify Installation

```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

### Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| FastAPI | http://localhost:8000 | - |
| API Docs | http://localhost:8000/docs | - |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin123 |
| Qdrant Dashboard | http://localhost:6333/dashboard | - |
| PostgreSQL | localhost:5432 | raguser / ragpassword123 |

## Project Structure

```
.
├── docker-compose.yml      # Container orchestration
├── .env.example            # Environment template
├── database/
│   └── init.sql            # PostgreSQL schema
└── backend/
    ├── Dockerfile          # Backend container
    ├── requirements.txt    # Python dependencies
    └── app/
        ├── main.py         # FastAPI application
        ├── config.py       # Settings management
        ├── clients/
        │   ├── minio_client.py     # MinIO SDK wrapper
        │   └── qdrant_client.py    # Qdrant SDK wrapper
        └── services/
            └── ingestion.py        # LangChain RAG pipeline
```

## API Endpoints

### Health
- `GET /` - API info
- `GET /health` - Service health check

### Documents
- `POST /api/v1/documents/upload` - Upload PDF
- `POST /api/v1/documents/{id}/process` - Process document

### Search
- `POST /api/v1/search` - Semantic search

## Development

### Running Backend Locally

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Start with hot reload
uvicorn app.main:app --reload
```

### Testing Ingestion Pipeline

```bash
# Process a PDF directly
python -m app.services.ingestion /path/to/document.pdf
```

## Phase 2 Roadmap

- [ ] Full PostgreSQL integration with SQLAlchemy
- [ ] User authentication (JWT/OAuth)
- [ ] Chat endpoints with conversation history
- [ ] Background job processing (Celery/RQ)
- [ ] Next.js frontend
- [ ] Multi-model LLM support

## License

MIT
