# =============================================================================
# Enterprise RAG Document Engine - LangChain Ingestion Pipeline
# =============================================================================
# This module implements the document processing pipeline for RAG:
#
# 1. Load PDF -> Extract text from uploaded documents
# 2. Chunk Text -> Split into semantically meaningful segments
# 3. Embed Chunks -> Convert text to vectors using HuggingFace models
# 4. Store Vectors -> Upsert to Qdrant with metadata for filtering
#
# Why LangChain?
# - Unified interface for document loaders (PDF, Word, HTML, etc.)
# - Battle-tested text splitters optimized for LLM context windows
# - Easy swapping of embedding models (OpenAI, HuggingFace, Cohere, etc.)
# - Production-ready patterns for chunking strategies
#
# Architecture Notes:
# - This pipeline is designed to be stateless and idempotent
# - Each document gets a unique namespace in Qdrant (via document_id filter)
# - Chunks maintain positional metadata for citation and context
# =============================================================================

import logging
import uuid
from pathlib import Path
from typing import Any, BinaryIO, Optional

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
from sentence_transformers import SentenceTransformer

from app.config import settings
from app.clients.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)


class DocumentIngestionPipeline:
    """
    End-to-end document ingestion pipeline for RAG.

    This class orchestrates the full ingestion workflow:
    1. PDF Loading: Extract text while preserving page structure
    2. Text Chunking: Split into optimal-size chunks for retrieval
    3. Embedding: Generate vector representations
    4. Storage: Upsert to Qdrant with rich metadata

    Design Decisions:
    - Synchronous embedding for simplicity; async batch for production
    - Lazy model loading to reduce startup time
    - Chunk overlap ensures context continuity across boundaries
    - Page numbers preserved for accurate citations
    """

    def __init__(
        self,
        embedding_model_name: str = settings.embedding_model,
        chunk_size: int = settings.chunk_size,
        chunk_overlap: int = settings.chunk_overlap,
    ):
        """
        Initialize the ingestion pipeline.

        Args:
            embedding_model_name: HuggingFace model identifier
                - "sentence-transformers/all-MiniLM-L6-v2": Fast, 384 dims
                - "sentence-transformers/all-mpnet-base-v2": Accurate, 768 dims
            chunk_size: Target chunk size in characters
            chunk_overlap: Overlap between consecutive chunks
        """
        self.embedding_model_name = embedding_model_name
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # Lazy-loaded embedding model
        self._embedding_model: Optional[SentenceTransformer] = None

        # Configure text splitter
        # RecursiveCharacterTextSplitter is preferred because:
        # 1. It respects semantic boundaries (paragraphs, sentences)
        # 2. Falls back gracefully to character splits
        # 3. Handles code and tables better than naive splitting
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            # Split hierarchy: paragraphs -> sentences -> words -> chars
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
            is_separator_regex=False,
        )

        logger.info(
            f"Initialized ingestion pipeline: "
            f"model={embedding_model_name}, "
            f"chunk_size={chunk_size}, "
            f"overlap={chunk_overlap}"
        )

    @property
    def embedding_model(self) -> SentenceTransformer:
        """
        Lazy-load the embedding model.

        Why lazy loading?
        - Model download/init takes several seconds
        - Not all API endpoints need embeddings
        - Reduces memory if embeddings not used
        """
        if self._embedding_model is None:
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self._embedding_model = SentenceTransformer(self.embedding_model_name)
            logger.info("Embedding model loaded successfully")
        return self._embedding_model

    def load_pdf(self, file_path: str | Path) -> list[Document]:
        """
        Load a PDF file and extract text with metadata.

        Uses LangChain's PyPDFLoader which:
        - Extracts text page by page
        - Preserves page numbers in metadata
        - Handles most PDF encodings

        Args:
            file_path: Path to the PDF file

        Returns:
            List of Document objects, one per page
        """
        logger.info(f"Loading PDF: {file_path}")

        loader = PyPDFLoader(str(file_path))
        documents = loader.load()

        logger.info(f"Loaded {len(documents)} pages from PDF")
        return documents

    def load_pdf_from_bytes(
        self,
        pdf_bytes: bytes,
        filename: str = "document.pdf",
    ) -> list[Document]:
        """
        Load a PDF from bytes (useful for MinIO downloads).

        Creates a temporary file for PyPDFLoader compatibility.
        In production, consider using pypdf directly for memory efficiency.

        Args:
            pdf_bytes: Raw PDF bytes
            filename: Original filename for metadata

        Returns:
            List of Document objects, one per page
        """
        import tempfile
        import os

        # Write to temp file (PyPDFLoader requires file path)
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False,
        ) as tmp_file:
            tmp_file.write(pdf_bytes)
            tmp_path = tmp_file.name

        try:
            documents = self.load_pdf(tmp_path)
            # Add original filename to metadata
            for doc in documents:
                doc.metadata["source_filename"] = filename
            return documents
        finally:
            # Clean up temp file
            os.unlink(tmp_path)

    def chunk_documents(self, documents: list[Document]) -> list[Document]:
        """
        Split documents into chunks optimized for retrieval.

        Why chunking matters for RAG:
        - LLM context windows are limited
        - Smaller chunks = more precise retrieval
        - But too small = loss of context
        - Overlap ensures ideas spanning boundaries are captured

        Args:
            documents: List of page-level documents

        Returns:
            List of chunk-level documents with enhanced metadata
        """
        logger.info(f"Chunking {len(documents)} documents...")

        chunks = self.text_splitter.split_documents(documents)

        # Enhance metadata with chunk position info
        for i, chunk in enumerate(chunks):
            chunk.metadata["chunk_index"] = i
            chunk.metadata["chunk_total"] = len(chunks)

        logger.info(f"Created {len(chunks)} chunks")
        return chunks

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for a list of texts.

        Uses sentence-transformers for high-quality embeddings:
        - Trained specifically for semantic similarity
        - Efficient batched inference
        - Normalized vectors for cosine similarity

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (list of floats)
        """
        logger.info(f"Embedding {len(texts)} texts...")

        # SentenceTransformer returns numpy array, convert to list
        embeddings = self.embedding_model.encode(
            texts,
            show_progress_bar=len(texts) > 100,
            convert_to_numpy=True,
            normalize_embeddings=True,  # Important for cosine similarity
        )

        logger.info("Embedding complete")
        return embeddings.tolist()

    def embed_documents(self, documents: list[Document]) -> list[list[float]]:
        """
        Generate embeddings for LangChain documents.

        Args:
            documents: List of LangChain Document objects

        Returns:
            List of embedding vectors
        """
        texts = [doc.page_content for doc in documents]
        return self.embed_texts(texts)

    async def ingest_document(
        self,
        document_id: str,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        additional_metadata: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Full ingestion pipeline: load, chunk, embed, and store.

        This is the main entry point for document processing.

        Pipeline steps:
        1. Parse PDF and extract text
        2. Split into retrieval-optimized chunks
        3. Generate embeddings for each chunk
        4. Store in Qdrant with metadata

        Args:
            document_id: Unique identifier for this document
            pdf_bytes: Raw PDF bytes from MinIO
            filename: Original filename
            user_id: Owner's user ID
            additional_metadata: Extra metadata to attach to vectors

        Returns:
            Processing statistics and vector IDs
        """
        logger.info(f"Starting ingestion for document: {document_id}")

        # Step 1: Load PDF
        documents = self.load_pdf_from_bytes(pdf_bytes, filename)

        if not documents:
            raise ValueError("PDF contains no extractable text")

        # Step 2: Chunk documents
        chunks = self.chunk_documents(documents)

        if not chunks:
            raise ValueError("Chunking produced no chunks")

        # Step 3: Generate embeddings
        embeddings = self.embed_documents(chunks)

        # Step 4: Prepare payloads with rich metadata
        payloads = []
        for i, chunk in enumerate(chunks):
            payload = {
                # Core identifiers
                "document_id": document_id,
                "user_id": user_id,

                # Content
                "text": chunk.page_content,

                # Position info (for ordering and citations)
                "chunk_index": i,
                "chunk_total": len(chunks),
                "page_number": chunk.metadata.get("page", 0),

                # Source info
                "filename": filename,
                "source": chunk.metadata.get("source", ""),
            }

            # Merge additional metadata if provided
            if additional_metadata:
                payload.update(additional_metadata)

            payloads.append(payload)

        # Step 5: Upsert to Qdrant
        qdrant_client = get_qdrant_client()
        point_ids = await qdrant_client.upsert_vectors(
            vectors=embeddings,
            payloads=payloads,
        )

        logger.info(
            f"Ingestion complete for {document_id}: "
            f"{len(documents)} pages, {len(chunks)} chunks, {len(point_ids)} vectors"
        )

        return {
            "document_id": document_id,
            "filename": filename,
            "page_count": len(documents),
            "chunk_count": len(chunks),
            "vector_ids": point_ids,
            "status": "completed",
        }

    async def delete_document_vectors(self, document_id: str) -> None:
        """
        Remove all vectors for a document from Qdrant.

        Called when a document is deleted to maintain consistency.

        Args:
            document_id: Document to remove vectors for
        """
        qdrant_client = get_qdrant_client()
        await qdrant_client.delete_by_document_id(uuid.UUID(document_id))
        logger.info(f"Deleted vectors for document: {document_id}")


# =============================================================================
# Standalone Ingestion Script
# =============================================================================
# Can be run directly for testing or batch processing:
# python -m app.services.ingestion /path/to/document.pdf
# =============================================================================

async def main():
    """
    Example usage of the ingestion pipeline.

    This demonstrates the complete workflow for processing a PDF.
    """
    import sys
    import asyncio

    if len(sys.argv) < 2:
        print("Usage: python -m app.services.ingestion <pdf_path>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    # Read PDF file
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # Initialize pipeline
    pipeline = DocumentIngestionPipeline()

    # Generate a test document ID
    document_id = str(uuid.uuid4())
    user_id = "00000000-0000-0000-0000-000000000001"  # Test user

    print(f"Processing document: {pdf_path}")
    print(f"Document ID: {document_id}")

    # Ensure Qdrant collection exists
    qdrant_client = get_qdrant_client()
    await qdrant_client.ensure_collection_exists()

    # Run ingestion
    result = await pipeline.ingest_document(
        document_id=document_id,
        pdf_bytes=pdf_bytes,
        filename=Path(pdf_path).name,
        user_id=user_id,
    )

    print("\nIngestion Results:")
    print(f"  Pages: {result['page_count']}")
    print(f"  Chunks: {result['chunk_count']}")
    print(f"  Vectors stored: {len(result['vector_ids'])}")
    print(f"  Status: {result['status']}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
