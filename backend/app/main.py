import os

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import catalog, chat, qr, voice, auth
from app.utils import config
from app.db.mysql import engine
from app.db.models import Base   # if Base lives in mysql.py, use: from app.db.mysql import engine, Base


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

log = logging.getLogger("askbuddy")


def _warm_up() -> None:
    """Loads the models in the background."""
    try:
        from app.chat import rag_adapter
        from app.voice import stt, tts

        stt.warm_up()
        tts.warm_up()
        rag_adapter.warm_up_embedder()

        log.info("Warm-up finished.")

    except Exception:
        log.exception(
            "Warm-up failed (the app still works, the first request will be slower)."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create the MySQL tables (users) if they don't exist yet
    try:
        Base.metadata.create_all(bind=engine)
        log.info("MySQL tables ready.")
    except Exception:
        log.exception("Could not connect to MySQL. Check DATABASE_URL in .env")

    if config.WARM_UP_ON_START:
        threading.Thread(target=_warm_up, daemon=True).start()

    yield


app = FastAPI(
    title="ASKBuddy API",
    version="0.1.0",
    lifespan=lifespan
)

# Always allow the Vite dev server, plus anything already in config
_origins = set(config.CORS_ORIGINS or [])
_origins.update({
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
})

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(_origins),
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Existing API routes
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(qr.router)
app.include_router(catalog.router)

# Signup and Login routes
app.include_router(auth.router)


@app.get("/health")
def health():
    return {"status": "ok"}