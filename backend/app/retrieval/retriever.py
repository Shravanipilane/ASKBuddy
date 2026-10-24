from app.db.vector_store import embed_query, get_collection
from app.utils import config


def build_where(subject=None, std=None, chapter=None, stream=None, part=None):
    conds = []
    if subject:
        conds.append({"subject": subject})
    if stream:
        conds.append({"stream": stream})
    if std:
        conds.append({"std": std})
    if part:
        conds.append({"part": part})
    if chapter:
        conds.append({"chapter": chapter})
    if not conds:
        return None
    return conds[0] if len(conds) == 1 else {"$and": conds}


def label(meta: dict) -> str:
    """'Physics Part 2' for multi-part subjects, 'Biology' otherwise."""
    part = f" Part {meta['part']}" if meta.get("part") else ""
    return f"{meta['subject']}{part}"


def retrieve(question: str, k: int = config.TOP_K, where=None) -> list[dict]:
    res = get_collection().query(
        query_embeddings=[embed_query(question)], n_results=k, where=where
    )
    hits = []
    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        hits.append({"text": doc, "meta": meta, "score": round(1 - dist, 3)})
    return hits