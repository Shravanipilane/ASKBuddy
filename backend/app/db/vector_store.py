import chromadb
from sentence_transformers import SentenceTransformer
from app.utils import config

_model = None


def _embedder() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(config.EMBED_MODEL, device="cpu")
    return _model


def embed_passages(texts: list[str]) -> list[list[float]]:
    return _embedder().encode(
        texts, normalize_embeddings=True, batch_size=32, show_progress_bar=True
    ).tolist()


def embed_query(question: str) -> list[float]:
    return _embedder().encode(
        config.QUERY_PREFIX + question, normalize_embeddings=True
    ).tolist()


def get_collection():
    client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
    return client.get_or_create_collection(
        name=config.COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )