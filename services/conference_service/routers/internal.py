from fastapi import APIRouter, Depends, HTTPException, Header
from livekit_service import create_host_token, create_guest_token, create_room

router = APIRouter()


def verify_internal(x_internal_key: str = Header(...)):
    from config import settings
    if x_internal_key != settings.INTERNAL_KEY:
        raise HTTPException(403, "Forbidden")


@router.post("/token")
async def issue_token(
    body: dict,
    _: None = Depends(verify_internal),
):
    meeting_id = body["meeting_id"]
    user_id = body["user_id"]
    user_name = body.get("user_name", "")
    role = body.get("role", "guest")

    await create_room(meeting_id)

    if role == "host":
        token = create_host_token(meeting_id, user_id, user_name)
    else:
        token = create_guest_token(meeting_id, user_id, user_name)

    return {"token": token}
