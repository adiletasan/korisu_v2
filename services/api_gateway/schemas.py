from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class CreateMeetingRequest(BaseModel):
    title: Optional[str] = None


class AddContactRequest(BaseModel):
    email: EmailStr
    nickname: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    email_notifications: Optional[bool] = None
    language: Optional[str] = None
    theme: Optional[str] = None
