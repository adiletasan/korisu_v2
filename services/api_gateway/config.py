import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str

    JWT_PRIVATE_KEY_FILE: str = "/run/secrets/private.pem"
    JWT_PUBLIC_KEY_FILE: str = "/run/secrets/public.pem"
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    SENDGRID_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    FROM_EMAIL: str = "noreply@korisu.online"

    FRONTEND_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"
    CHAT_SERVICE_URL: str = "http://chat_service:8001"
    CONFERENCE_SERVICE_URL: str = "http://conference_service:8002"

    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""
    LIVEKIT_SECRET_ENCRYPTION_KEY: str = ""

    INTERNAL_KEY: str = "korisu-internal"
    DEBUG: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_private_key(self) -> str:
        if os.path.exists(self.JWT_PRIVATE_KEY_FILE):
            with open(self.JWT_PRIVATE_KEY_FILE) as f:
                return f.read()
        key = os.environ.get("JWT_PRIVATE_KEY", "")
        if key:
            return key.replace("\\n", "\n")
        raise ValueError("JWT private key not found. Set JWT_PRIVATE_KEY env var or provide private.pem file.")

    def get_public_key(self) -> str:
        if os.path.exists(self.JWT_PUBLIC_KEY_FILE):
            with open(self.JWT_PUBLIC_KEY_FILE) as f:
                return f.read()
        key = os.environ.get("JWT_PUBLIC_KEY", "")
        if key:
            return key.replace("\\n", "\n")
        raise ValueError("JWT public key not found. Set JWT_PUBLIC_KEY env var or provide public.pem file.")


settings = Settings()
