# =============================================================================
# Enterprise RAG Document Engine - MinIO Client
# =============================================================================
# Async-compatible wrapper around the MinIO Python SDK.
#
# Why MinIO Client Wrapper?
# - Encapsulates connection management and bucket initialization
# - Provides typed methods for common operations
# - Abstracts away S3-specific error handling
# - Enables easy mocking for tests
# =============================================================================

import io
import logging
from typing import BinaryIO, Optional
from uuid import UUID

from minio import Minio
from minio.error import S3Error

from app.config import settings

logger = logging.getLogger(__name__)


class MinIOClient:
    """
    MinIO client wrapper for document storage operations.

    This class handles:
    - Connection to MinIO server
    - Bucket creation and management
    - File upload/download with proper path conventions
    - Presigned URL generation for direct browser access
    """

    def __init__(
        self,
        endpoint: str = settings.minio_endpoint,
        access_key: str = settings.minio_access_key,
        secret_key: str = settings.minio_secret_key,
        secure: bool = settings.minio_secure,
        bucket_name: str = settings.minio_bucket_name,
    ):
        """
        Initialize MinIO client.

        Args:
            endpoint: MinIO server address (host:port)
            access_key: Access key for authentication
            secret_key: Secret key for authentication
            secure: Use HTTPS if True
            bucket_name: Default bucket for operations
        """
        self.client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        self.bucket_name = bucket_name
        self._bucket_initialized = False

    async def ensure_bucket_exists(self) -> None:
        """
        Ensure the default bucket exists, creating it if necessary.

        Called during application startup to guarantee storage is ready.
        Idempotent - safe to call multiple times.
        """
        if self._bucket_initialized:
            return

        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            else:
                logger.info(f"MinIO bucket exists: {self.bucket_name}")
            self._bucket_initialized = True
        except S3Error as e:
            logger.error(f"Failed to initialize MinIO bucket: {e}")
            raise

    def generate_object_key(
        self,
        user_id: UUID,
        document_id: UUID,
        filename: str,
    ) -> str:
        """
        Generate a standardized object key for document storage.

        Path convention: documents/{user_id}/{document_id}/{filename}

        This structure enables:
        - User-level access control via prefix policies
        - Easy document grouping for bulk operations
        - Predictable paths for debugging

        Args:
            user_id: Owner's user ID
            document_id: Document's unique ID
            filename: Original filename

        Returns:
            Object key string for MinIO storage
        """
        return f"documents/{user_id}/{document_id}/{filename}"

    async def upload_file(
        self,
        object_key: str,
        file_data: BinaryIO,
        file_size: int,
        content_type: str = "application/pdf",
    ) -> str:
        """
        Upload a file to MinIO.

        Args:
            object_key: Storage path in the bucket
            file_data: File-like object with the content
            file_size: Size of the file in bytes
            content_type: MIME type of the file

        Returns:
            The object key where the file was stored

        Raises:
            S3Error: If upload fails
        """
        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_key,
                data=file_data,
                length=file_size,
                content_type=content_type,
            )
            logger.info(f"Uploaded file to MinIO: {object_key}")
            return object_key
        except S3Error as e:
            logger.error(f"Failed to upload file to MinIO: {e}")
            raise

    async def download_file(self, object_key: str) -> bytes:
        """
        Download a file from MinIO.

        Args:
            object_key: Storage path in the bucket

        Returns:
            File content as bytes

        Raises:
            S3Error: If download fails
        """
        try:
            response = self.client.get_object(
                bucket_name=self.bucket_name,
                object_name=object_key,
            )
            content = response.read()
            response.close()
            response.release_conn()
            return content
        except S3Error as e:
            logger.error(f"Failed to download file from MinIO: {e}")
            raise

    async def get_presigned_url(
        self,
        object_key: str,
        expires_hours: int = 1,
    ) -> str:
        """
        Generate a presigned URL for temporary direct access.

        Useful for:
        - Direct browser downloads without proxying through backend
        - Temporary share links
        - PDF viewer integrations

        Args:
            object_key: Storage path in the bucket
            expires_hours: URL validity period in hours

        Returns:
            Presigned URL string
        """
        from datetime import timedelta

        return self.client.presigned_get_object(
            bucket_name=self.bucket_name,
            object_name=object_key,
            expires=timedelta(hours=expires_hours),
        )

    async def delete_file(self, object_key: str) -> None:
        """
        Delete a file from MinIO.

        Args:
            object_key: Storage path in the bucket

        Raises:
            S3Error: If deletion fails
        """
        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=object_key,
            )
            logger.info(f"Deleted file from MinIO: {object_key}")
        except S3Error as e:
            logger.error(f"Failed to delete file from MinIO: {e}")
            raise

    async def file_exists(self, object_key: str) -> bool:
        """
        Check if a file exists in MinIO.

        Args:
            object_key: Storage path in the bucket

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.client.stat_object(
                bucket_name=self.bucket_name,
                object_name=object_key,
            )
            return True
        except S3Error as e:
            if e.code == "NoSuchKey":
                return False
            raise


# Singleton instance for dependency injection
_minio_client: Optional[MinIOClient] = None


def get_minio_client() -> MinIOClient:
    """
    Get or create the MinIO client singleton.

    Used as a FastAPI dependency for consistent client access.
    """
    global _minio_client
    if _minio_client is None:
        _minio_client = MinIOClient()
    return _minio_client
