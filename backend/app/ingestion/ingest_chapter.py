from pathlib import Path
from app.ingestion.pdf_loader import load_pdf_pages
from app.ingestion.chunker import chunk_pages
from app.db.vector_store import embed_passages, get_collection
from app.utils import config


def ingest_chapter(pdf_path: str, subject: str, std: int, chapter: int,
                   stream: str = "", book: str = "", part: int = 0) -> int:
    doc_id = f"{book}_ch{chapter}" if book else f"{subject.lower()}_class{std}_ch{chapter}"
    name = Path(pdf_path).name

    pages = load_pdf_pages(pdf_path)
    printed = {p["page"]: p.get("printed_page", 0) for p in pages}
    if not any(printed.values()):
        print(f"      note: {name}: printed page numbers not found; using PDF pages")
    fixed = sum(p.get("repaired", 0) for p in pages)
    lost = sum(p.get("dropped", 0) for p in pages)
    if fixed or lost:
        print(f"      note: {name}: repaired {fixed} garbled text blocks, dropped {lost} unreadable ones")

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
            "stream": stream,
            "std": std,
            "book": book,
            "part": part,                            # 0 = subject has only one book
            "chapter": chapter,
            "page": c["page"],                       # page in the PDF file
            "book_page": printed.get(c["page"], 0),  # page printed in the real book (0 = unknown)
            "source": name,
        })

    col = get_collection()
    col.delete(where={"doc_id": doc_id})
    col.add(ids=ids, documents=docs, embeddings=embed_passages(docs), metadatas=metas)
    return len(chunks)