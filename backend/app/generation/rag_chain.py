from app.retrieval.retriever import retrieve, label
from app.generation.llm import generate
from app.utils import config

PROMPT = """You are ASKBuddy, a study assistant for NCERT students.
Answer the question using ONLY the context below. Explain simply and clearly.
Start directly with the answer. Do not greet the student.
Cite the book, chapter and page like (Physics Part 2, Ch 4, p. 226) where useful.
If the answer is not in the context, say you could not find it in the provided chapter.

Context:
{context}

Question: {question}

Answer:"""

NOT_FOUND = "I could not find the answer to this in the provided chapter."


def _shown_page(meta: dict) -> int:
    """Page printed in the real book, or the PDF page if that is unknown."""
    return meta.get("book_page") or meta["page"]


def answer(question: str, where=None) -> dict:
    hits = retrieve(question, where=where)
    if not hits or hits[0]["score"] < config.MIN_SCORE:
        return {"answer": NOT_FOUND, "sources": []}   # skips the LLM call

    context = "\n\n".join(
        f"[{label(h['meta'])}, Chapter {h['meta']['chapter']}, Page {_shown_page(h['meta'])}] {h['text']}"
        for h in hits
    )
    text = generate(PROMPT.format(context=context, question=question))

    best = {}
    for h in hits:
        m = h["meta"]
        key = (m.get("book", ""), m["chapter"], m["page"])
        if key not in best or h["score"] > best[key]["score"]:
            best[key] = {
                "label": label(m),
                "chapter": m["chapter"],
                "page": _shown_page(m),
                "pdf_page": m["page"],
                "score": h["score"],
            }
    sources = sorted(best.values(), key=lambda s: -s["score"])
    return {"answer": text, "sources": sources}