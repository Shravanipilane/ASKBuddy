import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")

CHROMA_DIR = ROOT_DIR / "data" / "chroma_db"
COLLECTION_NAME = "ncert"

EMBED_MODEL = "BAAI/bge-small-en-v1.5"
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

CHUNK_MAX_CHARS = 900
CHUNK_OVERLAP = 150
TOP_K = 6
MIN_SCORE = 0.55   # below this, the question is treated as not in the book

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "")

# ---- Voice input (speech-to-text) ----
STT_MODEL_SIZE = os.getenv("STT_MODEL_SIZE", "small")       
STT_COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "int8")    
STT_LANGUAGE = os.getenv("STT_LANGUAGE", "en")               # "en", "hi", or "auto"
STT_CPU_THREADS = int(os.getenv("STT_CPU_THREADS", "0"))     # 0 = default
STT_MAX_SECONDS = int(os.getenv("STT_MAX_SECONDS", "30"))
STT_MAX_UPLOAD_MB = int(os.getenv("STT_MAX_UPLOAD_MB", "10"))
STT_PROMPT = "A student's question about an NCERT textbook: biology, physics, chemistry, mathematics."


# ---- Voice output (text-to-speech) ----
TTS_ENGINE = os.getenv("TTS_ENGINE", "kitten")
TTS_MODEL = os.getenv("TTS_MODEL", "KittenML/kitten-tts-mini-0.8")
TTS_VOICE = os.getenv("TTS_VOICE", "Kiki")
TTS_SPEED = float(os.getenv("TTS_SPEED", "1.0"))
TTS_SAMPLE_RATE = int(os.getenv("TTS_SAMPLE_RATE", "24000"))
TTS_MAX_CHARS = int(os.getenv("TTS_MAX_CHARS", "1500"))    # long answers are cut here
TTS_CHUNK_CHARS = int(os.getenv("TTS_CHUNK_CHARS", "300")) # speak in short pieces

# ---- Chat brain / API ----
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500",
    ).split(",")
    if o.strip()
]
SESSION_TTL_MINUTES = int(os.getenv("SESSION_TTL_MINUTES", "30"))
SESSION_MAX = int(os.getenv("SESSION_MAX", "500"))
HISTORY_TURNS = int(os.getenv("HISTORY_TURNS", "4"))
MAX_QUESTION_CHARS = int(os.getenv("MAX_QUESTION_CHARS", "500"))
QR_REGISTRY_PATH = Path(os.getenv("QR_REGISTRY_PATH", str(ROOT_DIR / "data" / "qr_registry.json")))
VOICE_CONCURRENCY = int(os.getenv("VOICE_CONCURRENCY", "1"))
WARM_UP_ON_START = os.getenv("WARM_UP_ON_START", "false").lower() == "true"