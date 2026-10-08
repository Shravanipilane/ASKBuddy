import re
import pymupdf

# Running headers such as "6 BIOLOGY" or "THE LIVING WORLD 7"
HEADER_PATTERNS = [
    re.compile(r"^\d{1,3}\s+[A-Z][A-Z ]{2,}$"),
    re.compile(r"^[A-Z][A-Z ]{2,}\s+\d{1,3}$"),
]


def _clean(text: str) -> str:
    text = text.replace("\xad", "")
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _is_noise(text: str) -> bool:
    if len(text) < 3 or re.fullmatch(r"\d+", text):
        return True
    if re.match(r"^Reprint\s*\d{4}", text):
        return True
    if len(text) <= 40 and any(p.match(text) for p in HEADER_PATTERNS):
        return True
    return False


def load_pdf_pages(pdf_path: str) -> list[dict]:
    """Return [{'page': 1, 'paragraphs': [...]}, ...]"""
    pages = []
    with pymupdf.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            paragraphs = []
            for block in page.get_text("blocks", sort=True):
                if block[6] != 0:
                    continue
                text = _clean(block[4])
                if _is_noise(text):
                    continue
                paragraphs.append(text)
            pages.append({"page": i, "paragraphs": paragraphs})
    return pages