import os

from backend.app.api import catalog

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")       # models are downloaded once, ahead of time
os.environ.setdefault("TQDM_DISABLE", "1")

import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import chat, qr, voice
from app.utils import config

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("askbuddy")


def _warm_up() -> None:
    """Loads the models in the background so the first student does not wait."""
    try:
        from app.chat import rag_adapter
        from app.voice import stt, tts

        stt.warm_up()
        tts.warm_up()
        rag_adapter.warm_up_embedder()
        log.info("Warm-up finished.")
    except Exception:
        log.exception("Warm-up failed (the app still works, the first request will be slower).")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if config.WARM_UP_ON_START:
        threading.Thread(target=_warm_up, daemon=True).start()
    yield


app = FastAPI(title="ASKBuddy API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(qr.router)
app.include_router(catalog.router)


@app.get("/health")
def health():
    return {"status": "ok"}