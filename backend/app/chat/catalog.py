"""Lists the chapters that are actually loaded in ChromaDB (for the chapter dropdown)."""
import time

from app.chat import rag_adapter as rag

_cache = {"t": 0.0, "data": []}
_TTL = 60  # seconds


def list_chapters() -> list[dict]:
    now = time.time()
    if _cache["data"] and now - _cache["t"] < _TTL:
        return _cache["data"]
    metas = rag.collection().get(include=["metadatas"])["metadatas"]
    seen: dict = {}
    for m in metas:
        key = (m.get("subject"), m.get("std"), m.get("chapter"))
        if None in key:
            continue
        seen[key] = {"subject": key[0], "std": key[1], "chapter": key[2]}
    data = sorted(seen.values(), key=lambda d: (str(d["subject"]), d["std"], d["chapter"]))
    _cache["data"], _cache["t"] = data, now
    return data