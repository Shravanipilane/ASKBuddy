"""API tests with fake models. Run from the backend folder:  python -m pytest tests -q"""
import base64
import numpy as np
from fastapi.testclient import TestClient

from app.chat import rag_adapter, catalog as chapter_catalog
from app.chat.session import clear_all
from app.main import app
from app.utils import config
from app.voice import tts

client = TestClient(app)


ORIGIN = config.CORS_ORIGINS[0]


def test_health_and_cors():
    assert client.get("/health").json() == {"status": "ok"}
    r = client.options("/ask", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == ORIGIN


def test_ask_flow(monkeypatch):
    clear_all()
    hit = {"text": "x", "meta": {"subject": "Biology", "std": 11, "chapter": 1, "page": 8}, "score": 0.7}
    monkeypatch.setattr(rag_adapter, "search", lambda q, s: [hit])
    monkeypatch.setattr(rag_adapter, "good_enough", lambda h: True)
    monkeypatch.setattr(rag_adapter, "llm", lambda p: "BOOK: Answer (p. 8).\nFUN: Fun.\nNEXT: More?\nMOOD: happy")
    r = client.post("/ask", json={"message": "hi", "name": "Asha"}).json()
    assert r["route"] == "greeting" and r["session_id"]
    r2 = client.post("/ask", json={"message": "What is osmosis?", "session_id": r["session_id"],
                                   "subject": "Biology", "std": 11, "chapter": 1}).json()
    assert r2["route"] == "study" and r2["session_id"] == r["session_id"] and r2["sources"][0]["page"] == 8


def test_ask_validation():
    assert client.post("/ask", json={}).status_code == 422


def test_chapters(monkeypatch):
    class Col:
        def get(self, include):
            return {"metadatas": [
                {"subject": "Biology", "std": 11, "chapter": 2, "page": 1},
                {"subject": "Biology", "std": 11, "chapter": 1, "page": 1},
                {"subject": "Biology", "std": 11, "chapter": 1, "page": 2},
            ]}
    chapter_catalog._cache.update(t=0.0, data=[])
    monkeypatch.setattr(rag_adapter, "collection", lambda: Col())
    data = client.get("/chapters").json()["chapters"]
    assert [c["chapter"] for c in data] == [1, 2]


def test_chapters_failure_returns_empty(monkeypatch):
    chapter_catalog._cache.update(t=0.0, data=[])
    def boom():
        raise RuntimeError("no db")
    monkeypatch.setattr(rag_adapter, "collection", boom)
    assert client.get("/chapters").json() == {"chapters": []}


def test_qr():
    assert client.post("/qr/resolve", json={"code": "bio11-ch2"}).json()["chapter"] == 2
    assert client.post("/qr/resolve", json={"code": "nonsense"}).status_code == 404


def test_voice_speak_endpoints(monkeypatch):
    class Fake:
        def synth(self, text):
            return np.zeros(config.TTS_SAMPLE_RATE, dtype=np.float32)
    monkeypatch.setattr(tts, "_engine", Fake())
    wav = client.post("/voice/speak", json={"text": "Hello there."})
    assert wav.status_code == 200 and wav.headers["content-type"] == "audio/wav" and wav.content[:4] == b"RIFF"
    j = client.post("/voice/speak_json", json={"text": "Hello there."}).json()
    assert base64.b64decode(j["audio_base64"])[:4] == b"RIFF" and j["words"] == ["Hello", "there."]
    assert client.post("/voice/speak_json", json={"text": "(p. 4)"}).status_code == 422


def test_voice_transcribe(monkeypatch):
    import app.api.voice as v
    monkeypatch.setattr(v, "transcribe", lambda data, lang: {"text": "hello", "language": "en", "duration": 1.0})
    r = client.post("/voice/transcribe", files={"file": ("a.webm", b"1234", "audio/webm")})
    assert r.json()["text"] == "hello"
    assert client.post("/voice/transcribe", files={"file": ("a.webm", b"", "audio/webm")}).status_code == 400

    def too_long(data, lang):
        raise ValueError("Audio too long")
    monkeypatch.setattr(v, "transcribe", too_long)
    assert client.post("/voice/transcribe", files={"file": ("a.webm", b"1234", "audio/webm")}).status_code == 422

    def broken(data, lang):
        raise RuntimeError("bad codec")
    monkeypatch.setattr(v, "transcribe", broken)
    assert client.post("/voice/transcribe", files={"file": ("a.webm", b"1234", "audio/webm")}).status_code == 422