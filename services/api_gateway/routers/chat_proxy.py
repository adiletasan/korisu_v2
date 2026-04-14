from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx
from config import settings

router = APIRouter()

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def chat_proxy(path: str, request: Request):
    token = request.cookies.get("access_token")
    headers = {"Cookie": f"access_token={token}"} if token else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.request(
            method=request.method,
            url=f"{settings.CHAT_SERVICE_URL}/chats/{path}",
            headers=headers,
            content=await request.body(),
        )
    return JSONResponse(status_code=resp.status_code, content=resp.json() if resp.content else None)
