"""
Configuration settings for the Health Insights API.
Loads environment variables and provides settings instance.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    
    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: Optional[str] = None
    supabase_service_key: str
    
    # OpenAI Configuration
    openai_api_key: str
    
    # Environment
    environment: str = "development"
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # CORS Origins (comma-separated list)
    cors_origins: str = "*"
    
    # ML Configuration
    min_data_points: int = 30  # Minimum days of data for analysis
    baseline_days: int = 90    # Days to use for baseline calculation
    anomaly_contamination: float = 0.08  # Expected proportion of anomalies
    
    # Cache Configuration
    cache_ttl: int = 3600  # Cache TTL in seconds (1 hour)
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are loaded only once.
    """
    return Settings()


# Export settings instance for convenience
settings = get_settings()

