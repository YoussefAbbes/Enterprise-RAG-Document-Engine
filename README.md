# Synapse : Enterprise RAG Document Engine

A production-ready **Retrieval-Augmented Generation (RAG)** system for uploading, processing, and conversing with PDF documents using advanced AI models. Built for scalability, performance, and ease of deployment.

![Phase](https://img.shields.io/badge/Phase-Production%20Ready-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![FastAPI](https://img.shields.io/badge/FastAPI-Python-blue) ![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-purple) ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)

## ✨ Key Features

### Core Functionality
- 📄 **PDF Document Processing** - Drag & drop upload with automatic text extraction and chunking
- 🧠 **Semantic Vector Search** - Advanced similarity search using sentence-transformers embeddings (384-dimensional vectors)
- 💬 **AI-Powered Chat** - Natural language Q&A with context-aware responses
- 📊 **Intelligent Formatting** - Automatic markdown rendering with table detection and formatting
- 🔍 **Multi-Document Support** - Query across multiple documents simultaneously
- 📝 **Source Citations** - Every answer includes relevance scores and source references

### Technical Features
- 🎨 **Modern UI** - Responsive Next.js 14 frontend with Tailwind CSS, shadcn/ui components, and react-markdown
- 🤖 **Dual LLM Support** - Compatible with both **Google Gemini** and **OpenAI GPT** models
- 🐳 **Full Docker Stack** - Complete containerized deployment with docker-compose
- ⚡ **Async Architecture** - FastAPI backend with async/await for optimal performance
- 🗄️ **Production Database** - PostgreSQL with complete schema for users, documents, and chat sessions
- 📦 **S3-Compatible Storage** - MinIO for scalable document storage
- 🔄 **Background Processing** - Dedicated ingestion pipeline for large documents
- 🏥 **Health Monitoring** - Comprehensive health checks for all services

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Enterprise RAG Document Engine                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────┐          ┌──────────────────┐                    │
│  │   Next.js 14  │  HTTP    │  FastAPI Backend │                    │
│  │   Frontend    │ ◄─────► │  (Async/Await)   │                    │
│  │  + shadcn/ui  │  REST    │  + LangChain     │                    │
│  └───────────────┘          └─────────┬────────┘                    │
│                                        │                              │
│                             ┌──────────┼──────────┐                  │
│                             │          │          │                  │
│                             ▼          ▼          ▼                  │
│                    ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│                    │PostgreSQL│ │  Qdrant  │ │  MinIO   │           │
│                    │   16     │ │ v1.12.1  │ │  S3 API  │           │
│                    │          │ │          │ │          │           │
│                    │ • Users  │ │ • Vector │ │ • PDF    │           │
│                    │ • Docs   │ │   Store  │ │   Storage│           │
│                    │ • Chats  │ │ • Search │ │ • Bucket │           │
│                    └──────────┘ └──────────┘ └──────────┘           │
│                                                                       │
│  External LLM APIs:                                                  │
│  ┌──────────────────┐        ┌──────────────────┐                   │
│  │ Google Gemini    │   OR   │   OpenAI GPT     │                   │
│  │ (gemini-1.5-*)   │        │   (gpt-4-*)      │                   │
│  └──────────────────┘        └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Document Upload**: User uploads PDF → FastAPI → MinIO storage
2. **Processing**: PDF → LangChain (PyPDF) → Text extraction → Chunking → Embeddings → Qdrant vectors
3. **Metadata**: Document info stored in PostgreSQL with MinIO and Qdrant references
4. **Query**: User question → Embedding → Qdrant similarity search → Top-K chunks
5. **Response**: Context + question → LLM (Gemini/OpenAI) → Formatted markdown answer

## 💻 Tech Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **Frontend** | Next.js 14 + TypeScript | React framework with App Router |
| **UI Components** | shadcn/ui + Tailwind CSS | Radix UI primitives, responsive design |
| **Markdown Rendering** | react-markdown + remark-gfm | GFM support with syntax highlighting |
| **Backend API** | FastAPI (Python 3.11+) | Async REST API with OpenAPI docs |
| **RAG Pipeline** | LangChain | Document loading, chunking, orchestration |
| **PDF Processing** | PyPDF | Text extraction from PDF files |
| **Embeddings** | Sentence Transformers | `all-MiniLM-L6-v2` (384-dim, 90MB) |
| **LLM** | Google Gemini / OpenAI | `gemini-1.5-flash` or `gpt-4-turbo` |
| **Vector Database** | Qdrant v1.12.1 | HNSW indexing, filtered search |
| **Object Storage** | MinIO | S3-compatible API, local deployment |
| **Relational DB** | PostgreSQL 16 | Users, documents, chat history |
| **Validation** | Pydantic v2 | Type-safe settings and API schemas |
| **Containerization** | Docker Compose | Multi-service orchestration |
| **HTTP Client** | httpx | Async HTTP for external APIs |

## 🚀 Quick Start

### Prerequisites

- **Docker** (v24.0+) & **Docker Compose** (v2.0+)
- **Node.js** (v18+) & **npm** (for frontend development)
- **API Keys** (optional but recommended):
  - Google Gemini API key (recommended, free tier available)
  - OR OpenAI API key

### Installation & Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/YoussefAbbes/Enterprise-RAG-Document-Engine.git
cd Enterprise-RAG-Document-Engine
```

#### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys (optional but recommended for better responses)
# For Google Gemini (recommended - free tier available):
GEMINI_API_KEY=your-gemini-api-key-here
LLM_MODEL=gemini-1.5-flash
LLM_PROVIDER=gemini

# OR for OpenAI:
OPENAI_API_KEY=your-openai-api-key-here
LLM_MODEL=gpt-4-turbo-preview
LLM_PROVIDER=openai
```

#### 3. Start Backend Services

```bash
# Start all backend services (PostgreSQL, Qdrant, MinIO, FastAPI)
docker compose up -d

# View logs to ensure everything is running
docker compose logs -f backend

# Wait for "Application startup complete" message
```

#### 4. Start Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### 5. Access the Application

Open your browser and navigate to:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **API Docs** | http://localhost:8000/docs | Interactive API documentation (Swagger) |
| **API Redoc** | http://localhost:8000/redoc | Alternative API documentation |
| **MinIO Console** | http://localhost:9001 | Object storage dashboard |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | Vector database UI |

**Default Credentials:**
- MinIO Console: `minioadmin` / `minioadmin123`
- PostgreSQL: `raguser` / `ragpassword123`

## 📖 How to Use

### Uploading and Processing Documents

1. **Open the Application**
   - Navigate to http://localhost:3000
   - You'll see a clean interface with "Upload" and "Chat" tabs

2. **Upload a PDF**
   - Click on the "Upload" tab
   - Drag and drop a PDF file or click to browse
   - Supported file size: up to 100MB

3. **Automatic Processing**
   - The system automatically:
     - Uploads the PDF to MinIO storage
     - Extracts text using PyPDF
     - Chunks the text into 1000-character segments (200-char overlap)
     - Generates 384-dimensional embeddings using sentence-transformers
     - Stores vectors in Qdrant for semantic search
   - Progress indicator shows the processing status

4. **Start Chatting**
   - Switch to the "Chat" tab
   - The processed document is now searchable

### Chatting with Your Documents

**Example Questions:**
```
• "What are the main topics covered in this document?"
• "Summarize the key findings in bullet points"
• "List all the technical specifications mentioned"
• "Create a table of all parameters and their values"
• "What does section 3.2 discuss?"
• "Compare the approaches mentioned in chapters 1 and 2"
```

**Response Features:**
- **Markdown Formatting**: Answers include headers, bullet points, tables, and code blocks
- **Source Citations**: Each response shows which document chunks were used
- **Relevance Scores**: See how confident the system is about each source (0-100%)
- **Context-Aware**: The LLM only uses information from your uploaded documents

**LLM Behavior:**
- **With Gemini/OpenAI API Key**: Structured, well-formatted responses with intelligent synthesis
- **Without API Key**: Raw search results formatted as markdown (still useful for finding information)

## 📂 Project Structure

```
Enterprise-RAG-Document-Engine/
├── docker-compose.yml              # Service orchestration (4 services)
├── .env.example                    # Environment template
├── .gitignore
│
├── database/
│   └── init.sql                    # PostgreSQL schema (users, documents, chat_sessions)
│
├── backend/
│   ├── Dockerfile                  # Python 3.11 + dependencies
│   ├── requirements.txt            # FastAPI, LangChain, Qdrant, MinIO, etc.
│   └── app/
│       ├── main.py                 # FastAPI application + endpoints
│       ├── config.py               # Pydantic settings (env variables)
│       ├── clients/
│       │   ├── minio_client.py     # MinIO SDK wrapper (async)
│       │   └── qdrant_client.py    # Qdrant SDK wrapper (async)
│       └── services/
│           └── ingestion.py        # LangChain RAG pipeline
│
├── frontend/
│   ├── Dockerfile                  # Next.js production build
│   ├── package.json                # Dependencies (Next.js 14, shadcn/ui)
│   ├── tailwind.config.ts          # Tailwind CSS configuration
│   ├── next.config.js              # Next.js configuration
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Main dashboard (tabs layout)
│       │   ├── layout.tsx          # Root layout with metadata
│       │   └── globals.css         # Global styles + Tailwind
│       └── components/
│           ├── document-upload.tsx # Drag & drop upload component
│           ├── chat-interface.tsx  # Chat UI with markdown rendering
│           └── ui/                 # shadcn/ui components
│               ├── button.tsx
│               ├── card.tsx
│               ├── progress.tsx
│               └── ...
│
└── scripts/
    └── docker-cleanup.sh           # Cleanup Docker volumes/containers
```

## 🔌 API Endpoints

The FastAPI backend provides a comprehensive REST API with automatic OpenAPI documentation.

### Health & Info
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information and version |
| `GET` | `/health` | Health check for all services (MinIO, Qdrant, PostgreSQL) |

### Document Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload PDF to MinIO storage |
| `POST` | `/api/v1/documents/{id}/process` | Process uploaded PDF (chunk + embed + index) |
| `POST` | `/api/v1/documents/upload-and-process` | Combined upload + process (recommended) |

### Search & Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/search` | Semantic search returning ranked chunks with metadata |
| `POST` | `/api/v1/chat` | RAG-powered chat with LLM-generated answers |

### Example API Usage

**Upload and Process a Document:**
```bash
curl -X POST "http://localhost:8000/api/v1/documents/upload-and-process" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@document.pdf" \
  -F "user_id=00000000-0000-0000-0000-000000000001"
```

**Search Documents:**
```bash
curl -X POST "http://localhost:8000/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the main findings?",
    "limit": 5
  }'
```

**Chat with Documents:**
```bash
curl -X POST "http://localhost:8000/api/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Summarize the key points",
    "limit": 5
  }'
```

**Interactive API Docs:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## ⚙️ Configuration

### Environment Variables

All configuration is managed through `.env` file. Copy `.env.example` to `.env` and customize:

#### LLM Configuration
```bash
# Google Gemini (recommended - free tier available)
GEMINI_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-1.5-flash          # or gemini-1.5-pro
LLM_PROVIDER=gemini

# OR OpenAI
OPENAI_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4-turbo-preview       # or gpt-4, gpt-3.5-turbo
LLM_PROVIDER=openai
OPENAI_BASE_URL=                    # Optional: for OpenRouter or other proxies
```

#### Database Configuration
```bash
POSTGRES_USER=raguser
POSTGRES_PASSWORD=ragpassword123
POSTGRES_DB=ragengine
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://raguser:ragpassword123@postgres:5432/ragengine
```

#### Storage Configuration
```bash
# MinIO (S3-compatible)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_BUCKET_NAME=documents
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_SECURE=false

# Qdrant (Vector Database)
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334
QDRANT_API_KEY=                     # Optional: for authentication
QDRANT_COLLECTION_NAME=documents
```

#### Processing Configuration
```bash
# Embedding Model
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Chunking Strategy
CHUNK_SIZE=1000                     # Characters per chunk
CHUNK_OVERLAP=200                   # Overlap between chunks

# Limits
MAX_FILE_SIZE_MB=100                # Maximum PDF file size
```

#### Application Settings
```bash
DEBUG=true
LOG_LEVEL=INFO
BACKEND_PORT=8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Supported Models

#### Embedding Models
| Model | Dimensions | Size | Speed | Quality |
|-------|------------|------|-------|---------|
| `all-MiniLM-L6-v2` (default) | 384 | 90MB | Fast | Good |
| `all-mpnet-base-v2` | 768 | 420MB | Medium | Better |
| `multi-qa-mpnet-base-dot-v1` | 768 | 420MB | Medium | Best for Q&A |

#### LLM Models
| Provider | Model | Context | Best For |
|----------|-------|---------|----------|
| **Gemini** | `gemini-1.5-flash` | 1M tokens | Fast, cost-effective |
| **Gemini** | `gemini-1.5-pro` | 2M tokens | Complex reasoning |
| **OpenAI** | `gpt-4-turbo` | 128K tokens | High quality |
| **OpenAI** | `gpt-3.5-turbo` | 16K tokens | Fast, affordable |

## 🧪 Development

### Local Development Setup

**Backend Development (without Docker):**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL, Qdrant, and MinIO via Docker
docker compose up -d postgres qdrant minio

# Run FastAPI with hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend Development:**
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js dev server (hot-reload enabled)
npm run dev

# Build for production
npm run build
npm start
```

### Production Deployment

**Using Docker Compose (Recommended):**
```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (caution: deletes all data)
docker compose down -v
```

**Environment-Specific Builds:**
```bash
# Production with optimized builds
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Update only backend
docker compose up -d --build backend

# Scale services (if needed)
docker compose up -d --scale backend=3
```

### Monitoring & Troubleshooting

**Health Checks:**
```bash
# Check all services
curl http://localhost:8000/health

# Check Qdrant
curl http://localhost:6333/collections

# Check MinIO
curl http://localhost:9000/minio/health/live
```

**View Logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f qdrant

# Last 100 lines
docker compose logs --tail=100 backend
```

**Database Access:**
```bash
# Connect to PostgreSQL
docker exec -it synapse-postgres psql -U raguser -d ragengine

# View documents
SELECT id, title, processing_status, created_at FROM documents;

# View users
SELECT id, email, full_name FROM users;
```

**Cleanup & Reset:**
```bash
# Remove all containers and volumes
./scripts/docker-cleanup.sh

# Or manually:
docker compose down -v
docker system prune -af
```

## 🎯 Project Status & Roadmap

### ✅ Completed Features (Production Ready)

- [x] **Infrastructure**
  - [x] Docker Compose orchestration for 4 services
  - [x] PostgreSQL database with complete schema
  - [x] MinIO S3-compatible object storage
  - [x] Qdrant vector database v1.12.1
  - [x] Health checks and monitoring

- [x] **Backend (FastAPI)**
  - [x] Async/await architecture
  - [x] Document upload endpoint with validation
  - [x] LangChain ingestion pipeline (PDF → chunks → embeddings → vectors)
  - [x] Semantic search endpoint
  - [x] RAG chat endpoint with LLM integration
  - [x] Comprehensive error handling
  - [x] OpenAPI documentation (Swagger + ReDoc)

- [x] **LLM Integration**
  - [x] Google Gemini support (gemini-1.5-flash, gemini-1.5-pro)
  - [x] OpenAI GPT support (gpt-4, gpt-3.5-turbo)
  - [x] OpenRouter compatibility (custom base URL)
  - [x] Fallback mode without API keys

- [x] **Frontend (Next.js)**
  - [x] Modern responsive UI with Tailwind CSS
  - [x] shadcn/ui component library
  - [x] Drag & drop file upload with progress
  - [x] Chat interface with markdown rendering
  - [x] Source citations with relevance scores
  - [x] Table and code block formatting (GFM support)

- [x] **Processing Pipeline**
  - [x] PDF text extraction (PyPDF)
  - [x] Intelligent chunking (1000 chars, 200 overlap)
  - [x] Sentence-transformers embeddings (384-dim)
  - [x] Qdrant vector storage with metadata
  - [x] Multi-document support

### 🚧 Future Enhancements

- [ ] **Authentication & Authorization**
  - [ ] JWT-based authentication
  - [ ] User registration and login
  - [ ] OAuth integration (Google, GitHub)
  - [ ] Role-based access control

- [ ] **Advanced Features**
  - [ ] Conversation history persistence
  - [ ] Multi-turn conversations with context
  - [ ] Document collections and folders
  - [ ] Collaborative document sharing
  - [ ] Advanced filtering (by date, tags, metadata)
  - [ ] Full-text search alongside semantic search

- [ ] **Performance & Scalability**
  - [ ] Background job processing (Celery + Redis)
  - [ ] Batch processing for large documents
  - [ ] Caching layer (Redis)
  - [ ] Rate limiting
  - [ ] Horizontal scaling guides

- [ ] **User Experience**
  - [ ] Document preview and viewer
  - [ ] Citation highlighting in source documents
  - [ ] Export conversations (PDF, Markdown)
  - [ ] Mobile-responsive optimizations
  - [ ] Dark mode toggle

- [ ] **Monitoring & Analytics**
  - [ ] User analytics dashboard
  - [ ] Query performance metrics
  - [ ] Document usage statistics
  - [ ] LLM cost tracking
  - [ ] Prometheus/Grafana integration

- [ ] **Additional Formats**
  - [ ] Word document support (.docx)
  - [ ] PowerPoint support (.pptx)
  - [ ] HTML and Markdown ingestion
  - [ ] OCR for scanned PDFs

## 🤝 Contributing

Contributions are welcome! Whether it's bug fixes, new features, documentation improvements, or suggestions, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Keep commits atomic and well-described

### Reporting Issues

Found a bug or have a suggestion? Please open an issue with:
- Clear description of the problem/suggestion
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, Docker version, etc.)

## 📄 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

## 🙏 Acknowledgments

This project builds upon excellent open-source technologies:

- **LangChain** - RAG orchestration framework
- **FastAPI** - Modern Python web framework
- **Next.js** - React framework for production
- **Qdrant** - Vector similarity search engine
- **Sentence Transformers** - State-of-the-art embeddings
- **shadcn/ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/YoussefAbbes/Enterprise-RAG-Document-Engine/issues)
- **Documentation**: Check this README and the `/docs` endpoint
- **Discussions**: Use GitHub Discussions for questions and community support

## ⚡ Performance Notes

- **Embedding Model**: The default `all-MiniLM-L6-v2` model is loaded on first document processing (cached for subsequent use)
- **Docker Volumes**: Named volumes ensure data persists across container restarts
- **Concurrent Processing**: FastAPI's async architecture handles multiple requests efficiently
- **Vector Search**: Qdrant's HNSW algorithm provides sub-linear search time
- **Chunking Strategy**: Recursive character splitter maintains semantic coherence

## 🔒 Security Considerations

- **Change default passwords** in `.env` before production deployment
- **Enable HTTPS** for production (MinIO, API endpoints)
- **Set QDRANT_API_KEY** for Qdrant authentication in production
- **Use secrets management** (e.g., Docker secrets, Vault) for sensitive data
- **Implement rate limiting** to prevent abuse
- **Regular security updates** for all dependencies

---

**Built with ❤️ using Next.js, FastAPI, LangChain, Qdrant & Google Gemini**

*Star this repo if you find it useful!* ⭐
