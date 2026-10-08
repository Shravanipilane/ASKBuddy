import re


def _split_long(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    sentences = re.split(r"(?<=[.!?])\s+", text)
    pieces, cur = [], ""
    for s in sentences:
        if cur and len(cur) + len(s) + 1 > max_chars:
            pieces.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        pieces.append(cur)
    return pieces


def chunk_pages(pages: list[dict], max_chars: int = 900, overlap: int = 150) -> list[dict]:
    """Chunks flow across page breaks. 'page' is where the chunk's text starts."""
    chunks = []
    buf, buf_page = "", None
    for page in pages:
        for para in page["paragraphs"]:
            for piece in _split_long(para, max_chars):
                if buf and len(buf) + len(piece) + 1 > max_chars:
                    chunks.append({"page": buf_page, "text": buf})
                    tail = buf[-overlap:]
                    tail = tail[tail.find(" ") + 1:]
                    buf = f"{tail} {piece}".strip()
                    buf_page = page["page"]
                else:
                    if not buf:
                        buf_page = page["page"]
                    buf = f"{buf} {piece}".strip()
    if buf:
        chunks.append({"page": buf_page, "text": buf})
    return [c for c in chunks if len(c["text"]) >= 100]