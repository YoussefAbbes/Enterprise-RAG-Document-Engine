# =============================================================================
# Enterprise RAG Document Engine - Configuration
# =============================================================================
# Centralized configuration using Pydantic Settings.
#
# Why Pydantic Settings?
# - Type validation for all config values
# - Automatic environment variable parsing
# - Default values with override capability
# - Clear documentation via type hints
# =============================================================================

from functools import lru_cache
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Environment variables can be set directly or via a .env file.
    All settings have sensible defaults for local development.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # Application Settings
    # -------------------------------------------------------------------------
    app_name: str = "Enterprise RAG Document Engine"
    app_version: str = "1.0.0"
    debug: bool = Field(default=True, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")

    # -------------------------------------------------------------------------
    # Database Configuration
    # -------------------------------------------------------------------------
    database_url: str = Field(
        default="postgresql+asyncpg://raguser:ragpassword123@localhost:5432/ragengine",
        description="PostgreSQL connection string with asyncpg driver",
    )

    # -------------------------------------------------------------------------
    # MinIO Configuration
    # -------------------------------------------------------------------------
    minio_endpoint: str = Field(
        default="localhost:9000",
        description="MinIO server endpoint (host:port)",
    )
    minio_access_key: str = Field(
        default="minioadmin",
        description="MinIO access key (username)",
    )
    minio_secret_key: str = Field(
        default="minioadmin123",
        description="MinIO secret key (password)",
    )
    minio_bucket_name: str = Field(
        default="documents",
        description="Default bucket for document storage",
    )
    minio_secure: bool = Field(
        default=False,
        description="Use HTTPS for MinIO connections",
    )

    # -------------------------------------------------------------------------
    # Qdrant Configuration
    # -------------------------------------------------------------------------
    qdrant_host: str = Field(
        default="localhost",
        description="Qdrant server hostname",
    )
    qdrant_port: int = Field(
        default=6333,
        description="Qdrant REST API port",
    )
    qdrant_api_key: Optional[str] = Field(
        default=None,
        description="Qdrant API key for authentication",
    )
    qdrant_collection_name: str = Field(
        default="documents",
        description="Default collection for document vectors",
    )

    # -------------------------------------------------------------------------
    # Embedding Model Configuration
    # -------------------------------------------------------------------------
    embedding_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="HuggingFace model for text embeddings",
    )
    embedding_dimension: int = Field(
        default=384,
        description="Vector dimension of the embedding model",
    )

    # -------------------------------------------------------------------------
    # LLM Configuration
    # -------------------------------------------------------------------------
    openai_api_key: Optional[str] = Field(
        default=None,
        description="OpenAI API key for chat functionality",
    )
    openai_base_url: Optional[str] = Field(
        default=None,
        description="Custom base URL for OpenAI-compatible APIs (e.g., OpenRouter)",
    )
    gemini_api_key: Optional[str] = Field(
        default=None,
        description="Google Gemini API key for chat functionality",
    )
    llm_model: str = Field(
        default="gemini-1.5-flash",
        description="LLM model for RAG responses",
    )
    llm_provider: str = Field(
        default="gemini",
        description="LLM provider: 'openai' or 'gemini'",
    )

    # -------------------------------------------------------------------------
    # Document Processing Configuration
    # -------------------------------------------------------------------------
    chunk_size: int = Field(
        default=1000,
        description="Target size for text chunks (characters)",
    )
    chunk_overlap: int = Field(
        default=200,
        description="Overlap between consecutive chunks",
    )
    max_file_size_mb: int = Field(
        default=100,
        description="Maximum file upload size in megabytes",
    )

    # -------------------------------------------------------------------------
    # CORS Configuration
    # -------------------------------------------------------------------------
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS origins from comma-separated string or list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Using lru_cache ensures settings are loaded once and reused,
    avoiding repeated environment variable parsing.
    """
    return Settings()


# Convenience export for direct import
settings = get_settings()
