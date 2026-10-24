import re
import sys
from collections import Counter
import pymupdf
from app.ingestion.pdf_loader import _clean, _header_number

path = sys.argv[1]
show = int(sys.argv[2]) if len(sys.argv) > 2 else 4

with pymupdf.open(path) as doc:
    print(f"{path}: {len(doc)} PDF pages")
    cands = []
    for i, page in enumerate(doc, start=1):
        h = page.rect.height
        texts = []
        for b in page.get_text("blocks", sort=True):
            if b[6] != 0:
                continue
            t = _clean(b[4])
            if not t:
                continue
            top, bottom = b[1] / h, b[3] / h
            texts.append((round(top, 2), t))
            num = _header_number(t)
            if num is None and re.fullmatch(r"\d{1,4}", t) and (bottom < 0.12 or top > 0.88):
                num = int(t)
            if num is not None:
                cands.append((i, num))
        if i <= show:
            print(f"\n--- PDF page {i} ---")
            for y, t in texts[:2]:
                print(f"  first  (y={y}): {t[:70]}")
            for y, t in texts[-2:]:
                print(f"  last   (y={y}): {t[:70]}")

    print("\nNumbers found (PDF page, number):", cands[:25])
    print("Votes for the gap (printed minus PDF):", Counter(n - p for p, n in cands).most_common(5))