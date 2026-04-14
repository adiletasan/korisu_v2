from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import httpx
from config import settings

router = APIRouter()

@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def lobby_proxy(path: str, request: Request):
    cookies = request.cookies
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.request(
            method=request.method,
            url=f"{settings.CONFERENCE_SERVICE_URL}/lobby/{path}",
            cookies=cookies,
            content=await request.body(),
            params=request.query_params,
        )
    try:
        content = resp.json()
    except Exception:
        content = None
    return JSONResponse(status_code=resp.status_code, content=content)
