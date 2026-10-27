"""The ONLY file in app/chat that touches the RAG team's code.

The chat brain needs just two things from the RAG code:
    retrieve(question, where=...)   -> list of hits
    generate(prompt)                -> text from Gemini
Everything else here (filters, reading the chapter list) is done directly on
ChromaDB, so changes in the RAG code cannot break it.

If one of the two functions changes, fix it in this file and nothing else.
"""


# ---------- helpers owned by the chat brain (no RAG code needed) ----------

def _build_where(scope: dict | None) -> dict | None:
    """Builds the ChromaDB filter from {"subject", "std", "chapter"}."""
    scope = scope or {}
    conds = [{key: scope[key]} for key in ("subject", "std", "chapter") if scope.get(key)]
    if not conds:
        return None
    return conds[0] if len(conds) == 1 else {"$and": conds}


def _normalize_hit(hit: dict) -> dict:
    """Accepts small changes in the shape of a hit and returns {"text", "meta", "score"}."""
    meta = hit.get("meta") or hit.get("metadata") or {}
    text = hit.get("text") or hit.get("document") or ""
    score = hit.get("score")
    if score is None and hit.get("distance") is not None:
        score = 1 - hit["distance"]
    return {"text": text, "meta": meta, "score": float(score or 0.0)}


# ---------- what the chat brain calls ----------

def search(query: str, scope: dict | None) -> list[dict]:
    from app.retrieval.retriever import retrieve        # RAG team's code (1 of 2)

    hits = retrieve(query, where=_build_where(scope))
    return [_normalize_hit(h) for h in hits]


def good_enough(hits: list[dict]) -> bool:
    from app.utils import config

    return bool(hits) and hits[0]["score"] >= config.MIN_SCORE


def llm(prompt: str) -> str:
    from app.generation.llm import generate             # RAG team's code (2 of 2)

    return generate(prompt)


def collection():
    """Read-only handle on the ChromaDB collection, used to list the loaded chapters."""
    import chromadb
    from app.utils import config

    client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return client.get_collection(config.COLLECTION_NAME)


def warm_up_embedder() -> None:
    try:
        from app.db.vector_store import embed_query

        embed_query("warm up")
    except Exception:
        pass       # warm-up is optional