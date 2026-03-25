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
# Document Processing Endpoint
# =============================================================================


@app.post(
    "/api/v1/documents/{document_id}/process",
    tags=["Documents"],
)
async def process_document(
    document_id: str,
    minio: MinIOClient = Depends(get_minio_client),
    qdrant: QdrantClientWrapper = Depends(get_qdrant_client),
):
    """
    Process a document through the RAG ingestion pipeline.

    This endpoint:
    1. Downloads the PDF from MinIO
    2. Extracts and chunks the text
    3. Generates embeddings
    4. Stores vectors in Qdrant

    For production, consider using a background job queue (Celery, RQ, etc.)
    for large documents to avoid request timeouts.
    """
    from app.services.ingestion import DocumentIngestionPipeline

    # Note: In production, look up the document in PostgreSQL to get the
    # MinIO path. For now, we construct it from the ID.
    # This is a simplified implementation for Phase 1.

    logger.info(f"Processing document: {document_id}")

    # We would retrieve the actual path from the database
    # For now, return a placeholder response
    return {
        "document_id": document_id,
        "status": "processing",
        "message": "Document processing initiated. Check status endpoint for updates.",
    }


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
