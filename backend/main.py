from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from db.session import engine
from routes.articles import router as articles_router
from routes.images import router as images_router
from routes.translations import router as translations_router
from routes.publish import router as publish_router
from routes.supervisor import router as supervisor_router
from routes.webhook import router as webhook_router
from routes.social import router as social_router
from routes.rss import router as rss_router
from ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio
    from services.queue_watchdog import watchdog_loop
    watchdog_task = asyncio.create_task(watchdog_loop())
    yield
    watchdog_task.cancel()
    await engine.dispose()


app = FastAPI(
    title="clnpth — KI-Redaktionssystem",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.frontend_port}",
        "http://localhost:4173",  # Vite preview
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles_router)
app.include_router(images_router)
app.include_router(publish_router)
app.include_router(supervisor_router)
app.include_router(translations_router)
app.include_router(webhook_router)
app.include_router(social_router)
app.include_router(rss_router)

# Serve generated images
_img_dir = Path(settings.image_storage_path)
_img_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=str(_img_dir)), name="images")

# Serve frontend SPA in production (built files in static/frontend/)
_frontend_dir = Path("static/frontend")
if _frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dir / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve frontend SPA — all non-API routes return index.html."""
        file_path = _frontend_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(_frontend_dir / "index.html")


@app.get("/api/health")
async def health():
    from services.feature_flags import get_active_features
    return {
        "status": "ok",
        "version": "0.1.0",
        "ws_connections": manager.count,
        "features": get_active_features(),
    }


@app.websocket("/ws/status")
async def websocket_status(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Keep connection alive, receive pings
            await ws.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect(ws)
