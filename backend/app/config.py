"""Application configuration via pydantic-settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Defaults are development-safe; override in production via .env or env vars.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/willcraft"

    # Security
    SECRET_KEY: str = "change-me-in-production"

    # Debug mode
    DEBUG: bool = False

    # POPIA consent versioning
    CONSENT_VERSION: str = "1.0"
    PRIVACY_POLICY_VERSION: str = "1.0"

    # Clerk authentication (RS256 via JWKS)
    CLERK_JWKS_URL: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Gemini (verification layer)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Application
    APP_NAME: str = "WillCraft SA"
    APP_VERSION: str = "0.1.0"


settings = Settings()
