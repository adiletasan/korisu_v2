from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    checks = {}
    try:
        await request.app.state.redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    return {"status": "healthy" if all(v == "ok" for v in checks.values()) else "degraded", "checks": checks}
