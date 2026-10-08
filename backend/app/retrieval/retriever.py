from app.db.vector_store import embed_query, get_collection
from app.utils import config


def build_where(subject=None, std=None, chapter=None):
    conds = []
    if subject:
        conds.append({"subject": subject})
    if std:
        conds.append({"std": std})
    if chapter:
        conds.append({"chapter": chapter})
    if not conds:
        return None
    return conds[0] if len(conds) == 1 else {"$and": conds}


def retrieve(question: str, k: int = config.TOP_K, where=None) -> list[dict]:
    res = get_collection().query(
        query_embeddings=[embed_query(question)], n_results=k, where=where
    )
    hits = []
    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
        hits.append({"text": doc, "meta": meta, "score": round(1 - dist, 3)})
    return hits