import re
from collections import Counter
import pymupdf

UPPER_TITLE = r"[A-Z][A-Z ,&'’:;\-–()/]{2,}"
MIXED_TITLE = r"[A-Za-z][A-Za-z ,&'’:;\-–()/]{2,}"

# Capitalised headers ("6 BIOLOGY", "THE LIVING WORLD 7"): accepted anywhere on the page
UPPER_HEADERS = [
    re.compile(rf"^(\d{{1,3}})\s+{UPPER_TITLE}$"),
    re.compile(rf"^{UPPER_TITLE}\s+(\d{{1,3}})$"),
]
# Lowercase / mixed-case headers ("2 chemistry"): accepted only in the top or bottom margin
MIXED_HEADERS = [
    re.compile(rf"^(\d{{1,3}})\s+{MIXED_TITLE}$"),
    re.compile(rf"^{MIXED_TITLE}\s+(\d{{1,3}})$"),
]
# "UNIT 1" and "CHAPTER 3" are titles, not page numbers
NOT_A_HEADER = re.compile(r"^(unit|chapter|appendix|reprint)\b", re.IGNORECASE)

COMMON_WORDS = set(
    "the of and is in to a that are for with as by on this be from which can or it an at not have has was were these".split()
)


def _clean(text: str) -> str:
    text = text.replace("\xad", "")
    text = re.sub(r"-\n(?=[a-z])", "", text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _header_number(text: str, top=None):
    """Printed page number if the text looks like a running header, else None.
    top = vertical position of the block as a fraction of the page height (0 = top)."""
    if len(text) > 70 or NOT_A_HEADER.match(text):
        return None
    for pattern in UPPER_HEADERS:
        m = pattern.match(text)
        if m:
            return int(m.group(1))
    if top is not None and (top < 0.10 or top > 0.93):
        for pattern in MIXED_HEADERS:
            m = pattern.match(text)
            if m:
                return int(m.group(1))
    return None


def _is_noise(text: str) -> bool:
    if len(text) < 3 or re.fullmatch(r"\d+", text):
        return True
    return bool(re.match(r"^Reprint\s*\d{4}", text))


# ---- broken-font repair -------------------------------------------------

def _english_score(text: str) -> float:
    words = re.findall(r"[a-z]+", text.lower())
    if not words:
        return 0.0
    return sum(w in COMMON_WORDS for w in words) / len(words)


def _looks_garbled(text: str) -> bool:
    letters = [c for c in text if c.isalpha()]
    if len(text.split()) < 6 or len(letters) < 25:
        return False
    upper = sum(c.isupper() for c in letters) / len(letters)
    return upper > 0.5 and _english_score(text) < 0.04


def _undo_shift(text: str):
    """Some PDFs store letters shifted by 29 character codes. Undo it, and keep
    the result only if it reads like English."""
    fixed = "".join(chr(ord(c) + 29) if 33 <= ord(c) <= 93 else c for c in text)
    return fixed if _english_score(fixed) >= 0.10 else None


# ---- printed page numbers ----------------------------------------------

def _detect_offset(candidates):
    """candidates: set of (pdf_page, printed_number). Returns the gap, or None."""
    if not candidates:
        return None
    pages_with_votes = len({p for p, _ in candidates})
    offset, votes = Counter(n - p for p, n in candidates).most_common(1)[0]
    if votes >= 2 and votes >= 0.5 * pages_with_votes:
        return offset
    return None


def load_pdf_pages(pdf_path: str) -> list[dict]:
    """Return [{'page', 'printed_page', 'paragraphs', 'repaired', 'dropped'}, ...]
    printed_page is 0 when the book's page number could not be found."""
    pages, candidates = [], set()
    with pymupdf.open(pdf_path) as doc:
        for i, page in enumerate(doc, start=1):
            height = page.rect.height
            paragraphs, repaired, dropped = [], 0, 0
            for block in page.get_text("blocks", sort=True):
                if block[6] != 0:                       # skip image blocks
                    continue
                text = _clean(block[4])

                if _looks_garbled(text):
                    fixed = _undo_shift(text)
                    if fixed is None:
                        dropped += 1                    # unreadable: keep junk out of the database
                        continue
                    text, repaired = fixed, repaired + 1

                top, bottom = block[1] / height, block[3] / height
                num = _header_number(text, top)
                if num is not None:
                    candidates.add((i, num))
                    continue
                if re.fullmatch(r"\d{1,4}", text) and (bottom < 0.12 or top > 0.88):
                    candidates.add((i, int(text)))      # lone number in the margin
                    continue
                if _is_noise(text):
                    continue
                paragraphs.append(text)
            pages.append({"page": i, "printed_page": 0, "paragraphs": paragraphs,
                          "repaired": repaired, "dropped": dropped})

    offset = _detect_offset(candidates)
    if offset is not None:
        for p in pages:
            printed = p["page"] + offset
            p["printed_page"] = printed if printed >= 1 else 0
    return pages