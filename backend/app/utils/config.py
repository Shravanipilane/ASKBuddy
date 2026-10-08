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