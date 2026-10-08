from pathlib import Path
from app.ingestion.pdf_loader import load_pdf_pages
from app.ingestion.chunker import chunk_pages
from app.db.vector_store import embed_passages, get_collection
from app.utils import config


def ingest_chapter(pdf_path: str, subject: str, std: int, chapter: int) -> int:
    doc_id = f"{subject.lower()}_class{std}_ch{chapter}"

    pages = load_pdf_pages(pdf_path)
    chunks = chunk_pages(pages, config.CHUNK_MAX_CHARS, config.CHUNK_OVERLAP)
    if not chunks:
        raise ValueError("No text found. Is this a scanned PDF?")

    ids, docs, metas = [], [], []
    for i, c in enumerate(chunks):
        ids.append(f"{doc_id}_{i:04d}")
        docs.append(c["text"])
        metas.append({
            "doc_id": doc_id,
            "subject": subject,
            "std": std,
            "chapter": chapter,
            "page": c["page"],
            "source": Path(pdf_path).name,
        })

    col = get_collection()
    col.delete(where={"doc_id": doc_id})        # re-ingesting replaces old data
    col.add(ids=ids, documents=docs, embeddings=embed_passages(docs), metadatas=metas)
    return len(chunks)