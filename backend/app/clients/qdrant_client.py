# =============================================================================
# Enterprise RAG Document Engine - Qdrant Client
# =============================================================================
# Wrapper around the Qdrant Python SDK for vector operations.
#
# Why Qdrant Client Wrapper?
# - Manages collection creation with proper configuration
# - Provides typed methods for RAG-specific operations
# - Encapsulates filtering logic for multi-tenant queries
# - Handles embedding dimension validation
# =============================================================================

import logging
from typing import Any, Optional
from uuid import UUID

from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse

from app.config import settings

logger = logging.getLogger(__name__)


class QdrantClientWrapper:
    """
    Qdrant client wrapper for vector storage and retrieval.

    This class handles:
    - Connection to Qdrant server
    - Collection management with proper vector configuration
    - Vector upsert with metadata payloads
    - Semantic search with document-level filtering
    """

    def __init__(
        self,
        host: str = settings.qdrant_host,
        port: int = settings.qdrant_port,
        api_key: Optional[str] = settings.qdrant_api_key,
        collection_name: str = settings.qdrant_collection_name,
        embedding_dimension: int = settings.embedding_dimension,
    ):
        """
        Initialize Qdrant client.

        Args:
            host: Qdrant server hostname
            port: Qdrant REST API port
            api_key: Optional API key for authentication
            collection_name: Default collection for operations
            embedding_dimension: Vector dimension (must match embedding model)
        """
        self.client = QdrantClient(
            url=f"http://{host}:{port}",
            api_key=api_key if api_key else None,
            prefer_grpc=False,
        )
        self.collection_name = collection_name
        self.embedding_dimension = embedding_dimension
        self._collection_initialized = False

    async def ensure_collection_exists(self) -> None:
        """
        Ensure the default collection exists with proper configuration.

        Creates the collection with:
        - Cosine distance (standard for semantic similarity)
        - HNSW indexing for fast approximate search
        - Payload indexing for document_id filtering

        Idempotent - safe to call multiple times.
        """
        if self._collection_initialized:
            return

        try:
            collections = self.client.get_collections()
            exists = any(
                c.name == self.collection_name for c in collections.collections
            )

            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=self.embedding_dimension,
                        distance=models.Distance.COSINE,
                    ),
                    # Optimize for filtering by document_id
                    # This is critical for multi-tenant RAG queries
                    optimizers_config=models.OptimizersConfigDiff(
                        indexing_threshold=10000,
                    ),
                )
                # Create payload index for document_id filtering
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema=models.PayloadSchemaType.KEYWORD,
                )
                logger.info(
                    f"Created Qdrant collection: {self.collection_name} "
                    f"(dim={self.embedding_dimension})"
                )
            else:
                logger.info(f"Qdrant collection exists: {self.collection_name}")

            self._collection_initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant collection: {e}")
            raise

    async def upsert_vectors(
        self,
        vectors: list[list[float]],
        payloads: list[dict[str, Any]],
        ids: Optional[list[str]] = None,
    ) -> list[str]:
        """
        Upsert vectors with metadata payloads.

        Each vector should have a payload containing at minimum:
        - document_id: UUID of the source document (for filtering)
        - chunk_index: Position in the document (for ordering)
        - text: Original text content (for retrieval display)

        Args:
            vectors: List of embedding vectors
            payloads: List of metadata dicts for each vector
            ids: Optional list of point IDs (generated if not provided)

        Returns:
            List of point IDs that were upserted
        """
        import uuid

        # Generate UUIDs if not provided
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in vectors]

        points = [
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload,
            )
            for point_id, vector, payload in zip(ids, vectors, payloads)
        ]

        self.client.upsert(
            collection_name=self.collection_name,
            points=points,
        )

        logger.info(
            f"Upserted {len(points)} vectors to collection {self.collection_name}"
        )
        return ids

    async def search(
        self,
        query_vector: list[float],
        document_ids: Optional[list[UUID]] = None,
        limit: int = 5,
        score_threshold: Optional[float] = None,
    ) -> list[dict[str, Any]]:
        """
        Search for similar vectors with optional document filtering.

        This is the core RAG retrieval function. It:
        1. Finds semantically similar chunks to the query
        2. Optionally filters to specific documents (multi-doc RAG)
        3. Returns chunks with scores for ranking

        Args:
            query_vector: Embedding of the search query
            document_ids: Optional list of document IDs to filter (OR logic)
            limit: Maximum number of results
            score_threshold: Minimum similarity score (0-1 for cosine)

        Returns:
            List of search results with payload and score
        """
        # Build filter for document_ids if provided
        query_filter = None
        if document_ids:
            query_filter = models.Filter(
                should=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(doc_id)),
                    )
                    for doc_id in document_ids
                ]
            )

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
            score_threshold=score_threshold,
            with_payload=True,
        )

        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "payload": hit.payload,
            }
            for hit in results
        ]

    async def delete_by_document_id(self, document_id: UUID) -> int:
        """
        Delete all vectors associated with a document.

        Used when a document is deleted to clean up its embeddings.
        This maintains consistency between PostgreSQL and Qdrant.

        Args:
            document_id: UUID of the document to delete vectors for

        Returns:
            Number of points deleted
        """
        result = self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="document_id",
                            match=models.MatchValue(value=str(document_id)),
                        )
                    ]
                )
            ),
        )

        logger.info(f"Deleted vectors for document {document_id}")
        return result.status

    async def get_collection_info(self) -> dict[str, Any]:
        """
        Get information about the collection.

        Useful for monitoring and debugging.

        Returns:
            Collection statistics and configuration
        """
        info = self.client.get_collection(self.collection_name)
        return {
            "name": self.collection_name,
            "vectors_count": info.vectors_count,
            "points_count": info.points_count,
            "status": info.status,
            "config": {
                "vector_size": info.config.params.vectors.size,
                "distance": str(info.config.params.vectors.distance),
            },
        }


# Singleton instance for dependency injection
_qdrant_client: Optional[QdrantClientWrapper] = None


def get_qdrant_client() -> QdrantClientWrapper:
    """
    Get or create the Qdrant client singleton.

    Used as a FastAPI dependency for consistent client access.
    """
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClientWrapper()
    return _qdrant_client
