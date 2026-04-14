import os
from pydantic_settings import BaseSettings
import uuid


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_PUBLIC_KEY_FILE: str = "/run/secrets/public.pem"
    JWT_ALGORITHM: str = "RS256"
    FRONTEND_URL: str = "http://localhost:5173"
    WORKER_ID: str = str(uuid.uuid4())

    class Config:
        env_file = ".env"
        extra = "ignore"

    def get_public_key(self) -> str:
        if os.path.exists(self.JWT_PUBLIC_KEY_FILE):
            with open(self.JWT_PUBLIC_KEY_FILE) as f:
                return f.read()
        key = os.environ.get("JWT_PUBLIC_KEY", "")
        if key:
            return key.replace("\\n", "\n")
        raise ValueError("JWT public key not found. Set JWT_PUBLIC_KEY env var.")


settings = Settings()
