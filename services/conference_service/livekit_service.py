from livekit import api
from config import settings


def get_livekit_client():
    return api.LiveKitAPI(
        url=settings.LIVEKIT_URL,
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
    )


def create_host_token(meeting_id: str, user_id: str, user_name: str = "") -> str:
    at = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    at.with_identity(user_id)
    at.with_name(user_name or user_id)
    at.with_grants(
        api.VideoGrants(
            room_join=True,
            room=meeting_id,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            room_admin=True,
        )
    )
    return at.to_jwt()


def create_guest_token(meeting_id: str, user_id: str, user_name: str = "") -> str:
    at = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    at.with_identity(user_id)
    at.with_name(user_name or user_id)
    at.with_grants(
        api.VideoGrants(
            room_join=True,
            room=meeting_id,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
            room_admin=False,
        )
    )
    return at.to_jwt()


async def create_room(meeting_id: str):
    lk = get_livekit_client()
    try:
        await lk.room.create_room(
            api.CreateRoomRequest(
                name=meeting_id,
                empty_timeout=300,
                max_participants=50,
            )
        )
    except Exception:
        pass
    finally:
        await lk.aclose()


async def end_room(meeting_id: str):
    lk = get_livekit_client()
    try:
        await lk.room.delete_room(api.DeleteRoomRequest(room=meeting_id))
    except Exception:
        pass
    finally:
        await lk.aclose()


async def kick_participant(meeting_id: str, identity: str):
    lk = get_livekit_client()
    try:
        await lk.room.remove_participant(
            api.RoomParticipantIdentity(room=meeting_id, identity=identity)
        )
    except Exception:
        pass
    finally:
        await lk.aclose()
