import uuid
import random
import string
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from database import get_db
from models import Meeting, MeetingParticipant, User
from security import get_current_user
from schemas import CreateMeetingRequest
from config import settings

router = APIRouter()


def generate_invite_code() -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=4)) + "-" + "".join(random.choices(chars, k=4))


@router.post("/create")
async def create_meeting(
    body: CreateMeetingRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    meeting_id = uuid.uuid4()
    invite_code = generate_invite_code()

    # Ensure unique invite code
    while True:
        existing = await db.execute(select(Meeting).where(Meeting.invite_code == invite_code))
        if not existing.scalar_one_or_none():
            break
        invite_code = generate_invite_code()

    meeting = Meeting(
        id=meeting_id,
        title=body.title,
        host_id=user_id,
        invite_code=invite_code,
        status="active",
    )
    db.add(meeting)
    await db.flush()

    participant = MeetingParticipant(
        meeting_id=meeting_id,
        user_id=user_id,
        role="host",
        livekit_identity=user_id,
    )
    db.add(participant)
    await db.commit()

    # Request host token from conference service
    host_token = ""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"{settings.CONFERENCE_SERVICE_URL}/internal/token",
                json={"meeting_id": str(meeting_id), "user_id": user_id, "role": "host"},
                headers={"X-Internal-Key": settings.INTERNAL_KEY if hasattr(settings, 'INTERNAL_KEY') else "korisu-internal"},
            )
            host_token = resp.json().get("token", "")
    except Exception:
        pass

    return {
        "meeting_id": str(meeting_id),
        "invite_code": invite_code,
        "invite_link": f"https://korisu.online/room/{meeting_id}",
        "host_token": host_token,
    }


@router.get("/join/{code}")
async def join_meeting(
    code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Try UUID first
    try:
        meeting_id = uuid.UUID(code)
        result = await db.execute(
            select(Meeting).where(Meeting.id == meeting_id, Meeting.status == "active")
        )
    except ValueError:
        result = await db.execute(
            select(Meeting).where(Meeting.invite_code == code.upper(), Meeting.status == "active")
        )

    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(404, "MEETING_NOT_FOUND")

    return {
        "meeting_id": str(meeting.id),
        "invite_code": meeting.invite_code,
        "title": meeting.title,
    }


@router.get("/history")
async def meeting_history(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    result = await db.execute(
        select(Meeting)
        .join(MeetingParticipant, MeetingParticipant.meeting_id == Meeting.id)
        .where(
            MeetingParticipant.user_id == user_id,
            Meeting.created_at >= cutoff,
        )
        .order_by(Meeting.created_at.desc())
        .limit(50)
    )
    meetings = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "title": m.title,
            "invite_code": m.invite_code,
            "status": m.status,
            "created_at": m.created_at.isoformat(),
            "ended_at": m.ended_at.isoformat() if m.ended_at else None,
            "participant_count": m.participant_count,
        }
        for m in meetings
    ]
