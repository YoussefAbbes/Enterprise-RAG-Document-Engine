# =============================================================================
# Enterprise RAG Document Engine - FastAPI Application
# =============================================================================
# Main application entry point with:
# - CORS configuration for frontend integration
# - Lifespan management for client initialization
# - Health check endpoints for container orchestration
# - Modular router structure for API organization
#
# Architecture Notes:
# - Uses lifespan context manager (FastAPI 0.100+) instead of deprecated on_event
# - Dependency injection pattern for database/storage clients
# - Structured logging for production observability
# =============================================================================

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.config import settings
from app.clients.minio_client import MinIOClient, get_minio_client
from app.clients.qdrant_client import QdrantClientWrapper, get_qdrant_client

# Configure structured logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# =============================================================================
# Application Lifespan Management
# =============================================================================
# The lifespan context manager handles startup/shutdown events.
# This ensures storage backends are ready before accepting requests.
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.

    Startup:
    - Initialize MinIO bucket
    - Initialize Qdrant collection
    - Validate connections

    Shutdown:
    - Clean up resources (if needed)
    """
    logger.info("Starting RAG Document Engine...")

    # Initialize storage clients
    minio_client = get_minio_client()
    qdrant_client = get_qdrant_client()

    try:
        # Ensure storage backends are ready
        await minio_client.ensure_bucket_exists()
        await qdrant_client.ensure_collection_exists()

        logger.info("All storage backends initialized successfully")
        yield  # Application runs here

    except Exception as e:
        logger.error(f"Failed to initialize storage backends: {e}")
        raise

    finally:
        # Cleanup on shutdown (add any necessary cleanup here)
        logger.info("Shutting down RAG Document Engine...")


# =============================================================================
# FastAPI Application Instance
# =============================================================================
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    Enterprise RAG Document Engine API

    Upload PDF documents, process them into vector embeddings,
    and chat with them using LLMs.

    ## Features
    - **Document Upload**: Store PDFs in MinIO object storage
    - **Vector Indexing**: Chunk and embed documents into Qdrant
    - **Semantic Search**: Find relevant passages using embeddings
    - **RAG Chat**: Query documents with natural language (Phase 2)
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# =============================================================================
# CORS Middleware Configuration
# =============================================================================
# CORS is critical for frontend-backend communication.
#
# Security considerations:
# - In development: Allow localhost origins
# - In production: Restrict to your domain(s)
# - Never use "*" for allow_origins in production with credentials
# =============================================================================
app.add_middleware(
    CORSMiddleware,
    # Origins allowed to make requests
    allow_origins=settings.cors_origins,
    # Allow cookies/auth headers in cross-origin requests
    allow_credentials=True,
    # HTTP methods allowed
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    # Headers allowed in requests
    allow_headers=["*"],
    # Headers exposed to frontend JS
    expose_headers=["X-Total-Count", "X-Page", "X-Page-Size"],
)


# =============================================================================
# Pydantic Models for API
# =============================================================================


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str
    version: str
    services: dict[str, str]


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""

    document_id: str
    filename: str
    file_size: int
    minio_path: str
    message: str


class SearchRequest(BaseModel):
    """Request model for semantic search."""

    query: str
    document_ids: list[str] | None = None
    limit: int = 5


class SearchResult(BaseModel):
    """Single search result."""

    chunk_id: str
    score: float
    text: str
    document_id: str
    chunk_index: int


class SearchResponse(BaseModel):
    """Response model for semantic search."""

    query: str
    results: list[SearchResult]
    total: int


class ProcessRequest(BaseModel):
    """Request model for document processing."""

    minio_path: str
    user_id: str = "00000000-0000-0000-0000-000000000001"


class ProcessResponse(BaseModel):
    """Response after document processing."""

    document_id: str
    filename: str
    status: str
    page_count: int
    chunk_count: int
    vector_count: int
    message: str


class DocumentInfo(BaseModel):
    """Document information model."""

    document_id: str
    filename: str
    file_size: int
    minio_path: str
    status: str
    page_count: int | None = None
    chunk_count: int | None = None


class ChatRequest(BaseModel):
    """Request model for RAG chat."""

    question: str
    document_ids: list[str] | None = None
    limit: int = 5


class Source(BaseModel):
    """Source reference for chat response."""

    text: str
    document_id: str
    chunk_index: int
    relevance: float


class ChatResponse(BaseModel):
    """Response model for RAG chat."""

    question: str
    answer: str
    sources: list[Source]
    model: str


# =============================================================================
# Health Check Endpoints
# =============================================================================
# Health checks are essential for:
# - Container orchestration (Docker, Kubernetes)
# - Load balancer health probes
# - Monitoring and alerting
# =============================================================================


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check(
    minio: MinIOClient = Depends(get_minio_client),
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
) -> HealthResponse:
    """
    Comprehensive health check endpoint.

    Verifies connectivity to all backend services:
    - MinIO object storage
    - Qdrant vector database
    - PostgreSQL (TODO: add in Phase 2)
    """
    services = {}

    # Check MinIO
    try:
        await minio.ensure_bucket_exists()
        services["minio"] = "healthy"
    except Exception as e:
        services["minio"] = f"unhealthy: {str(e)}"

    # Check Qdrant
    try:
        info = await qdrant.get_collection_info()
        services["qdrant"] = f"healthy ({info['points_count']} vectors)"
    except Exception as e:
        services["qdrant"] = f"unhealthy: {str(e)}"

    # Determine overall status
    all_healthy = all("healthy" in v for v in services.values())

    return HealthResponse(
        status="healthy" if all_healthy else "degraded",
        version=settings.app_version,
        services=services,
    )


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/docs",
        "health": "/health",
    }


# =============================================================================
# Document Upload Endpoint
# =============================================================================
# This endpoint handles PDF upload to MinIO storage.
# The actual processing (chunking, embedding) is handled by the ingestion
# pipeline, which can be triggered synchronously or via background job.
# =============================================================================


@app.post(
    "/api/v1/documents/upload",
    response_model=DocumentUploadResponse,
    tags=["Documents"],
)
async def upload_document(
    file: UploadFile = File(..., description="PDF file to upload"),
    user_id: str = Form(
        default="00000000-0000-0000-0000-000000000001",
        description="User ID (from auth in production)",
    ),
    minio: MinIOClient = Depends(get_minio_client),
) -> DocumentUploadResponse:
    """
    Upload a PDF document for RAG processing.

    This endpoint:
    1. Validates the file is a PDF
    2. Generates a unique document ID
    3. Stores the file in MinIO
    4. Returns metadata for tracking

    Processing (chunking/embedding) is handled separately via:
    - POST /api/v1/documents/{document_id}/process (sync)
    - Or background job queue (recommended for large files)
    """
    import uuid

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    # Validate content type
    if file.content_type and "pdf" not in file.content_type.lower():
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content type: {file.content_type}",
        )

    # Generate document ID
    document_id = str(uuid.uuid4())

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Generate storage path
    object_key = minio.generate_object_key(
        user_id=uuid.UUID(user_id),
        document_id=uuid.UUID(document_id),
        filename=file.filename,
    )

    # Upload to MinIO
    import io

    await minio.upload_file(
        object_key=object_key,
        file_data=io.BytesIO(content),
        file_size=file_size,
        content_type="application/pdf",
    )

    logger.info(f"Uploaded document {document_id} to {object_key}")

    return DocumentUploadResponse(
        document_id=document_id,
        filename=file.filename,
        file_size=file_size,
        minio_path=object_key,
        message="Document uploaded successfully. Call /process to index for RAG.",
    )


# =============================================================================
# Search Endpoint (Preview)
# =============================================================================
# Basic semantic search endpoint. Full implementation requires:
# - Embedding model integration (done in ingestion.py)
# - Document filtering (done in qdrant_client.py)
# =============================================================================


@app.post(
    "/api/v1/search",
    response_model=SearchResponse,
    tags=["Search"],
)
async def search_documents(
    request: SearchRequest,
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
) -> SearchResponse:
    """
    Search across documents using semantic similarity.

    This endpoint:
    1. Embeds the query using the same model as documents
    2. Searches Qdrant for similar chunks
    3. Optionally filters to specific documents
    4. Returns ranked results with text and metadata

    Note: Requires documents to be processed via ingestion pipeline first.
    """
    # Import embedding model (lazy load for faster startup)
    from app.services.ingestion import DocumentIngestionPipeline

    pipeline = DocumentIngestionPipeline()

    # Embed the query
    query_embedding = pipeline.embed_texts([request.query])[0]

    # Parse document IDs
    document_ids = None
    if request.document_ids:
        from uuid import UUID

        document_ids = [UUID(doc_id) for doc_id in request.document_ids]

    # Search Qdrant
    results = await qdrant.search(
        query_vector=query_embedding,
        document_ids=document_ids,
        limit=request.limit,
    )

    # Format results
    search_results = [
        SearchResult(
            chunk_id=r["id"],
            score=r["score"],
            text=r["payload"].get("text", ""),
            document_id=r["payload"].get("document_id", ""),
            chunk_index=r["payload"].get("chunk_index", 0),
        )
        for r in results
    ]

    return SearchResponse(
        query=request.query,
        results=search_results,
        total=len(search_results),
    )


# =============================================================================
# RAG Chat Endpoint (LLM-powered)
# =============================================================================


@app.post(
    "/api/v1/chat",
    response_model=ChatResponse,
    tags=["Chat"],
)
async def chat_with_documents(
    request: ChatRequest,
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
) -> ChatResponse:
    """
    Chat with your documents using RAG (Retrieval-Augmented Generation).

    This endpoint:
    1. Searches for relevant document chunks
    2. Sends the context + question to an LLM
    3. Returns a structured, formatted answer

    Supports OpenAI GPT models. Set OPENAI_API_KEY in environment.
    """
    from app.services.ingestion import DocumentIngestionPipeline
    import os

    # Embed the query
    pipeline = DocumentIngestionPipeline()
    query_embedding = pipeline.embed_texts([request.question])[0]

    # Parse document IDs
    document_ids = None
    if request.document_ids:
        from uuid import UUID
        document_ids = [UUID(doc_id) for doc_id in request.document_ids]

    # Search Qdrant for relevant chunks
    results = await qdrant.search(
        query_vector=query_embedding,
        document_ids=document_ids,
        limit=request.limit,
    )

    # Prepare sources
    sources = [
        Source(
            text=r["payload"].get("text", "")[:500],
            document_id=r["payload"].get("document_id", ""),
            chunk_index=r["payload"].get("chunk_index", 0),
            relevance=round(r["score"] * 100, 1),
        )
        for r in results
    ]

    if not results:
        return ChatResponse(
            question=request.question,
            answer="I couldn't find any relevant information in the uploaded documents. Please make sure you have uploaded and processed some documents first.",
            sources=[],
            model="none",
        )

    # Build context from search results
    context_parts = []
    for i, r in enumerate(results):
        text = r["payload"].get("text", "")
        context_parts.append(f"[Source {i+1}]\n{text}")

    context = "\n\n".join(context_parts)

    # Check which LLM provider to use
    gemini_key = settings.gemini_api_key
    openai_key = settings.openai_api_key

    system_prompt = """You are a helpful assistant that answers questions based on the provided document context.

Rules:
- Only use information from the provided context
- Format your answers clearly using markdown (tables, bullet points, headers)
- If information is in a tabular format, present it as a markdown table
- Be concise but comprehensive
- If you can't find the answer in the context, say so
- Always cite which source number the information came from"""

    user_prompt = f"""Context from documents:
{context}

Question: {request.question}

Please provide a well-structured answer using markdown formatting."""

    if gemini_key:
        # Use Google Gemini
        try:
            import google.generativeai as genai

            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(settings.llm_model)

            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            response = model.generate_content(full_prompt)

            answer = response.text
            model_used = settings.llm_model

        except Exception as e:
            logger.error(f"Gemini error: {e}")
            answer = _format_raw_results(request.question, results)
            model_used = "fallback (Gemini error)"

    elif openai_key:
        # Use OpenAI (or OpenRouter) for structured response
        try:
            from openai import OpenAI

            # Support custom base URL for OpenRouter
            base_url = getattr(settings, 'openai_base_url', None)
            client = OpenAI(api_key=openai_key, base_url=base_url) if base_url else OpenAI(api_key=openai_key)

            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1000,
            )

            answer = response.choices[0].message.content
            model_used = settings.llm_model

        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            answer = _format_raw_results(request.question, results)
            model_used = "fallback (OpenAI error)"
    else:
        # No LLM key configured
        answer = _format_raw_results(request.question, results)
        model_used = "none (set GEMINI_API_KEY or OPENAI_API_KEY for better responses)"

    return ChatResponse(
        question=request.question,
        answer=answer,
        sources=sources,
        model=model_used,
    )


def _format_raw_results(question: str, results: list) -> str:
    """Format raw search results into a readable response."""
    answer_parts = [f"## Results for: {question}\n"]

    for i, r in enumerate(results[:5]):
        score = r["score"] * 100
        text = r["payload"].get("text", "")

        # Clean up text
        text = text.strip()
        if len(text) > 400:
            text = text[:400] + "..."

        answer_parts.append(f"### Source {i+1} (Relevance: {score:.1f}%)\n")
        answer_parts.append(f"> {text}\n")

    answer_parts.append("\n---\n*For better formatted answers, set your OPENAI_API_KEY in the environment.*")

    return "\n".join(answer_parts)


# =============================================================================
# Document Processing Endpoint
# =============================================================================


@app.post(
    "/api/v1/documents/{document_id}/process",
    response_model=ProcessResponse,
    tags=["Documents"],
)
async def process_document(
    document_id: str,
    request: ProcessRequest,
    minio: MinIOClient = Depends(get_minio_client),
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
) -> ProcessResponse:
    """
    Process a document through the RAG ingestion pipeline.

    This endpoint:
    1. Downloads the PDF from MinIO
    2. Extracts and chunks the text
    3. Generates embeddings
    4. Stores vectors in Qdrant
    """
    from app.services.ingestion import DocumentIngestionPipeline
    import os

    logger.info(f"Processing document: {document_id}")

    try:
        # Download PDF from MinIO
        logger.info(f"Downloading from MinIO: {request.minio_path}")
        pdf_bytes = await minio.download_file(request.minio_path)

        # Extract filename from path
        filename = os.path.basename(request.minio_path)

        # Initialize ingestion pipeline
        pipeline = DocumentIngestionPipeline()

        # Ensure collection exists
        await qdrant.ensure_collection_exists()

        # Process the document
        result = await pipeline.ingest_document(
            document_id=document_id,
            pdf_bytes=pdf_bytes,
            filename=filename,
            user_id=request.user_id,
        )

        logger.info(f"Processing complete for {document_id}")

        return ProcessResponse(
            document_id=document_id,
            filename=filename,
            status="completed",
            page_count=result["page_count"],
            chunk_count=result["chunk_count"],
            vector_count=len(result["vector_ids"]),
            message=f"Successfully processed {result['chunk_count']} chunks into {len(result['vector_ids'])} vectors",
        )

    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {str(e)}",
        )


@app.post(
    "/api/v1/documents/upload-and-process",
    response_model=ProcessResponse,
    tags=["Documents"],
)
async def upload_and_process_document(
    file: UploadFile = File(..., description="PDF file to upload and process"),
    user_id: str = Form(
        default="00000000-0000-0000-0000-000000000001",
        description="User ID",
    ),
    minio: MinIOClient = Depends(get_minio_client),
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
) -> ProcessResponse:
    """
    Upload AND process a PDF in one step.

    This is a convenience endpoint that combines:
    1. Upload to MinIO
    2. Process through ingestion pipeline
    3. Store vectors in Qdrant

    Perfect for testing and smaller documents.
    """
    import uuid
    import io
    from app.services.ingestion import DocumentIngestionPipeline

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    # Generate document ID
    document_id = str(uuid.uuid4())

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    max_size_bytes = settings.max_file_size_mb * 1024 * 1024
    if file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Generate storage path
    object_key = minio.generate_object_key(
        user_id=uuid.UUID(user_id),
        document_id=uuid.UUID(document_id),
        filename=file.filename,
    )

    try:
        # Upload to MinIO
        await minio.upload_file(
            object_key=object_key,
            file_data=io.BytesIO(content),
            file_size=file_size,
            content_type="application/pdf",
        )

        logger.info(f"Uploaded document {document_id} to {object_key}")

        # Initialize ingestion pipeline
        pipeline = DocumentIngestionPipeline()

        # Ensure collection exists
        await qdrant.ensure_collection_exists()

        # Process the document
        result = await pipeline.ingest_document(
            document_id=document_id,
            pdf_bytes=content,
            filename=file.filename,
            user_id=user_id,
        )

        logger.info(f"Processing complete for {document_id}")

        return ProcessResponse(
            document_id=document_id,
            filename=file.filename,
            status="completed",
            page_count=result["page_count"],
            chunk_count=result["chunk_count"],
            vector_count=len(result["vector_ids"]),
            message=f"Successfully uploaded and processed into {len(result['vector_ids'])} searchable vectors",
        )

    except Exception as e:
        logger.error(f"Failed to upload/process document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {str(e)}",
        )


# =============================================================================
# Error Handlers
# =============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "status_code": 500,
        },
    )


# =============================================================================
# Main Entry Point
# =============================================================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
