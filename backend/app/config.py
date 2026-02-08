"""Application configuration via pydantic-settings."""

from pydantic import model_validator
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

    # Database — Railway provides postgresql://, asyncpg needs postgresql+asyncpg://
    DATABASE_URL: str = "postgresql+asyncpg://user:pass@localhost/willcraft"

    @model_validator(mode="after")
    def _fix_database_url(self) -> "Settings":
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            self.DATABASE_URL = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgres://"):
            self.DATABASE_URL = url.replace("postgres://", "postgresql+asyncpg://", 1)
        return self

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

    # PayFast
    PAYFAST_MERCHANT_ID: str = "10000100"  # Sandbox default
    PAYFAST_MERCHANT_KEY: str = "46f0cd694581a"  # Sandbox default
    PAYFAST_PASSPHRASE: str = "jt7NOE43FZPn"  # Sandbox default
    PAYFAST_SANDBOX: bool = True
    PAYFAST_RETURN_URL: str = "http://localhost:5173/payment/return"
    PAYFAST_CANCEL_URL: str = "http://localhost:5173/payment/cancel"
    PAYFAST_NOTIFY_URL: str = "http://localhost:8000/api/payment/notify"

    # Will pricing
    WILL_PRICE: str = "199.00"

    # Download tokens
    DOWNLOAD_TOKEN_SECRET: str = ""  # Falls back to SECRET_KEY if empty
    DOWNLOAD_TOKEN_MAX_AGE: int = 86400  # 24 hours

    # Email (SMTP)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@willcraft.co.za"
    MAIL_FROM_NAME: str = "WillCraft SA"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = ""
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False
    MAIL_SUPPRESS_SEND: bool = True  # True in dev, False in production

    # CORS — comma-separated origins for production
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Application
    APP_NAME: str = "WillCraft SA"
    APP_VERSION: str = "0.1.0"


settings = Settings()
