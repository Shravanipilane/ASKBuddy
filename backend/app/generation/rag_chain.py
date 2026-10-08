from app.retrieval.retriever import retrieve
from app.generation.llm import generate
from app.utils import config

PROMPT = """You are ASKBuddy, a study assistant for NCERT students.
Answer the question using ONLY the context below. Explain simply and clearly.
Start directly with the answer. Do not greet the student.
Mention page numbers like (p. 4) where useful.
If the answer is not in the context, say you could not find it in the provided chapter.

Context:
{context}

Question: {question}

Answer:"""

NOT_FOUND = "I could not find the answer to this in the provided chapter."


def answer(question: str, where=None) -> dict:
    hits = retrieve(question, where=where)
    if not hits or hits[0]["score"] < config.MIN_SCORE:
        return {"answer": NOT_FOUND, "sources": []}   # skips the LLM call

    context = "\n\n".join(f"[Page {h['meta']['page']}] {h['text']}" for h in hits)
    text = generate(PROMPT.format(context=context, question=question))

    best = {}
    for h in hits:
        key = (h["meta"]["chapter"], h["meta"]["page"])
        if key not in best or h["score"] > best[key]["score"]:
            best[key] = {"chapter": key[0], "page": key[1], "score": h["score"]}
    sources = sorted(best.values(), key=lambda s: -s["score"])
    return {"answer": text, "sources": sources}