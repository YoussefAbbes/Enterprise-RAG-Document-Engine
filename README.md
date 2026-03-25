# Enterprise RAG Document Engine

A production-ready **Retrieval-Augmented Generation (RAG)** system for uploading, processing, and conversing with PDF documents using LLMs.

![Phase](https://img.shields.io/badge/Phase-1%20Complete-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-blue) ![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-purple)

## ✨ Features

- 📄 **PDF Upload** - Drag & drop PDF documents with automatic processing
- 🧠 **Vector Search** - Semantic search using sentence-transformers embeddings
- 💬 **AI Chat** - Ask questions and get structured answers with markdown formatting
- 📊 **Table Support** - Automatically formats tabular data from documents
- 🎨 **Modern UI** - Beautiful Next.js frontend with Tailwind CSS & shadcn/ui
- 🐳 **Dockerized** - Complete stack runs with one command

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Enterprise RAG Engine                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐        │
│  │  Next.js   │───▶│  FastAPI   │───▶│ LangChain  │        │
│  │  Frontend  │    │  Backend   │    │  Pipeline  │        │
│  └──────────┬─┘    └──────┬─────┘    └──────┬─────┘        │
│             │             │                 │               │
│             ▼             ▼                 ▼               │
│      ┌──────────┐  ┌──────────┐     ┌──────────┐           │
│      │PostgreSQL│  │  Qdrant  │     │  MinIO   │           │
│      │(Metadata)│  │(Vectors) │     │(Storage) │           │
│      └──────────┘  └──────────┘     └──────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js, Tailwind CSS, shadcn/ui, react-markdown | User interface |
| Backend | Python FastAPI | REST API |
| Orchestration | LangChain | RAG pipeline |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) | Text → vectors |
| LLM | OpenAI GPT-4 (optional) | Answer synthesis |
| Vector DB | Qdrant v1.12.1 | Semantic search |
| Object Storage | MinIO | PDF storage |
| Database | PostgreSQL 16 | Metadata & history |
| Container | Docker Compose | Orchestration |

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- (Optional) OpenAI API key for enhanced chat responses

### 1. Clone and Configure

```bash
git clone https://github.com/YoussefAbbes/Enterprise-RAG-Document-Engine.git
cd Enterprise-RAG-Document-Engine

# Copy environment template
cp .env.example .env

# (Optional) Add your OpenAI API key to .env for better responses
# OPENAI_API_KEY=sk-your-key-here
```

### 2. Start Backend Services

```bash
# Start all backend services
docker compose up -d

# View backend logs
docker compose logs -f backend
```

### 3. Start Frontend (Development)

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **API Docs** | http://localhost:8000/docs | FastAPI Swagger UI |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin123 |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Vector database UI |
| **PostgreSQL** | localhost:5432 | raguser / ragpassword123 |

## 📖 Usage

### Upload & Process Documents

1. Open http://localhost:3000
2. Drag & drop a PDF file
3. Wait for processing (extraction → chunking → embedding → indexing)
4. Switch to "Chat" tab

### Chat with Your Documents

Ask questions like:
- "What are the main topics in this document?"
- "List all parameter codes with their descriptions"
- "Summarize the key points"

**With OpenAI**: Get structured, formatted responses with tables and markdown
**Without OpenAI**: Get raw search results formatted as markdown

## 📂 Project Structure

```
.
├── docker-compose.yml              # Service orchestration
├── .env.example                    # Environment template
├── database/
│   └── init.sql                    # PostgreSQL schema
├── backend/
│   ├── Dockerfile                  # Backend image
│   ├── requirements.txt            # Python dependencies
│   └── app/
│       ├── main.py                 # FastAPI app + endpoints
│       ├── config.py               # Settings management
│       ├── clients/
│       │   ├── minio_client.py     # MinIO SDK wrapper
│       │   └── qdrant_client.py    # Qdrant SDK wrapper
│       └── services/
│           └── ingestion.py        # LangChain RAG pipeline
└── frontend/
    ├── package.json
    ├── tailwind.config.ts
    └── src/
        ├── app/
        │   ├── page.tsx            # Main dashboard
        │   └── globals.css         # Tailwind + prose styles
        └── components/
            ├── document-upload.tsx # PDF upload component
            └── chat-interface.tsx  # Chat UI with markdown rendering
```

## 🔌 API Endpoints

### Health
- `GET /` - API info
- `GET /health` - Service health check

### Documents
- `POST /api/v1/documents/upload` - Upload PDF to MinIO
- `POST /api/v1/documents/{id}/process` - Process PDF (chunk + embed)
- `POST /api/v1/documents/upload-and-process` - Upload + process in one step

### Search & Chat
- `POST /api/v1/search` - Raw semantic search (returns chunks)
- `POST /api/v1/chat` - AI-powered chat (returns formatted answers)

## 🔧 Configuration

Key environment variables in `.env`:

```bash
# OpenAI (Optional - for enhanced responses)
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4-turbo-preview

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Database
POSTGRES_USER=raguser
POSTGRES_PASSWORD=ragpassword123

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
```

### Models Used

| Component | Model | Details |
|-----------|-------|---------|
| **Embeddings** | `all-MiniLM-L6-v2` | Fast, 384 dims, 90MB, good quality |
| **LLM** | GPT-4 Turbo | Optional, for answer synthesis with formatting |
| **Fallback** | None | Raw search results if no OpenAI key |

## 🧪 Development

### Running Backend Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Running Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

### Testing Ingestion Pipeline

```bash
# Direct script execution
docker exec -it rag-backend python -m app.services.ingestion /path/to/test.pdf
```

## 🎯 Roadmap

### Phase 1: Infrastructure & RAG Backend ✅
- [x] Docker Compose setup
- [x] PostgreSQL schema
- [x] MinIO integration
- [x] Qdrant vector store
- [x] LangChain ingestion pipeline
- [x] FastAPI endpoints
- [x] Next.js frontend with modern UI
- [x] OpenAI chat integration with markdown
- [x] Table formatting support

### Phase 2: Enhancements (Coming Soon)
- [ ] User authentication (JWT/OAuth)
- [ ] PostgreSQL integration for persistence
- [ ] Conversation history
- [ ] Background job processing (Celery)
- [ ] Multi-document support
- [ ] Advanced filtering
- [ ] Analytics dashboard

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 📄 License

MIT

---

**Built with** ❤️ **using Next.js, FastAPI, LangChain & Qdrant**
