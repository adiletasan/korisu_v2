from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
import httpx
from config import settings
from security import get_current_user

router = APIRouter()

async def _proxy(request: Request, path: str):
    token = request.cookies.get("access_token")
    headers = {"Cookie": f"access_token={token}"} if token else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.request(
            method=request.method,
            url=f"{settings.CONFERENCE_SERVICE_URL}/lobby/{path}",
            headers=headers,
            content=await request.body(),
        )
    return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.content else None)

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def lobby_proxy(path: str, request: Request):
    return await _proxy(request, path)
