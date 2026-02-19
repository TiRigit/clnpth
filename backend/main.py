from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.session import engine
from routes.articles import router as articles_router
from routes.images import router as images_router
from routes.translations import router as translations_router
from routes.supervisor import router as supervisor_router
from routes.webhook import router as webhook_router
from ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
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
app.include_router(supervisor_router)
app.include_router(translations_router)
app.include_router(webhook_router)

# Serve generated images
_img_dir = Path(settings.image_storage_path)
_img_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=str(_img_dir)), name="images")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "version": "0.1.0",
        "ws_connections": manager.count,
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
