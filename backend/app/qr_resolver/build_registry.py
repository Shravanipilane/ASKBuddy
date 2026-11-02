"""Reads the QR codes printed inside the chapter PDFs and writes data/qr_registry.json.

    python -m app.qr_resolver.build_registry --dry-run     (show what it finds, write nothing)
    python -m app.qr_resolver.build_registry               (write data/qr_registry.json)
    python -m app.qr_resolver.build_registry --only class11_physics --pages 5

It uses the same folders and file names as the book loader:
    data/raw_pdfs/class11_physics/keph101.pdf  ->  Physics, class 11, Part 1, chapter 1

Needs one extra package, only for this tool:   pip install opencv-python-headless
"""
import argparse
import json
import re

import numpy as np
import pymupdf

from app.qr_resolver.resolver import NCERT_CODE, _candidate_keys
from app.utils import config

RAW_DIR = config.ROOT_DIR / "data" / "raw_pdfs"
FOLDER_PATTERN = re.compile(r"^class(11|12)_([a-z_]+)$")
FILE_PATTERN = re.compile(r"^([a-z]{4}\d)(\d{2})\.pdf$", re.IGNORECASE)
DPIS = (200, 300)       # a small QR code may need a sharper picture
# The code is also printed in small text under the QR, e.g. 11080CH01. This works even if the picture cannot be read.
PRINTED_ID = re.compile(r"(?<![0-9A-Za-z])(\d{5}CH\d{1,2})(?![0-9A-Za-z])", re.IGNORECASE)


def part_numbers(codes):
    """Same rule as the book loader: parts 1, 2... only if the subject has several books, else 0."""
    multi = len(codes) > 1 or any(c[-1] != "1" for c in codes)
    return {c: (int(c[-1]) if multi else 0) for c in codes}


def discover(only):
    """[(subject, std, part, chapter, pdf_path), ...]"""
    chapters, notes = [], []
    for folder in sorted(p for p in RAW_DIR.iterdir() if p.is_dir()):
        if only and folder.name not in only:
            continue
        m = FOLDER_PATTERN.match(folder.name)
        if not m:
            notes.append(f"{folder.name}: folder name must look like class11_biology")
            continue
        std, subject = int(m.group(1)), m.group(2).replace("_", " ").title()
        pdfs = []
        for pdf in sorted(folder.glob("*.pdf")):
            fm = FILE_PATTERN.match(pdf.name)
            if fm:
                pdfs.append((fm.group(1).lower(), int(fm.group(2)), pdf))
        parts = part_numbers(sorted({c for c, _, _ in pdfs}))
        for code, chapter, pdf in pdfs:
            chapters.append((subject, std, parts[code], chapter, pdf))
    return chapters, notes


def decode_page(detector, page) -> set[str]:
    found: set[str] = set()
    for dpi in DPIS:
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        try:
            ok, texts, _, _ = detector.detectAndDecodeMulti(img)
        except Exception:
            ok, texts = False, ()
        if ok:
            found |= {t.strip() for t in texts if t and t.strip()}
        if found:
            break
    return found


def printed_codes(page) -> set[str]:
    """The code printed in small text under the QR, e.g. 11080CH01."""
    return {m.upper() for m in PRINTED_ID.findall(page.get_text())}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build data/qr_registry.json from the QR codes inside the chapter PDFs")
    parser.add_argument("--only", nargs="*", help="folder names, e.g. class11_physics")
    parser.add_argument("--pages", type=int, default=3, help="how many pages from the start of each PDF to scan (default 3)")
    parser.add_argument("--dry-run", action="store_true", help="show the result, write nothing")
    args = parser.parse_args()

    try:
        import cv2
    except ImportError:
        raise SystemExit("Install the QR reader first:  pip install opencv-python-headless")
    detector = cv2.QRCodeDetector()

    chapters, notes = discover(args.only)
    by_code: dict[str, list] = {}
    without_qr = []
    for subject, std, part, chapter, pdf in chapters:
        codes: set[str] = set()
        with pymupdf.open(pdf) as doc:
            for page in list(doc)[: args.pages]:
                codes |= decode_page(detector, page)
                codes |= printed_codes(page)
        label = f"{subject} class {std}" + (f" part {part}" if part else "") + f" ch{chapter}"
        if codes:
            print(f"[QR]   {label:<34} {', '.join(sorted(codes))}")
        else:
            without_qr.append(label)
        for c in codes:
            by_code.setdefault(c, []).append((subject, std, part, chapter))

    # ePathshala codes such as ...?id=11080CH01: learn "book 11080 = Biology class 11" instead of one line per chapter
    books: dict[str, set] = {}
    code_book: dict[str, str] = {}
    for code, places in by_code.items():
        for key in _candidate_keys(code):
            m = NCERT_CODE.match(key)
            if m:
                for subject, std, part, chapter in places:
                    if chapter == int(m["ch"]):               # the chapter in the code matches the PDF file name
                        books.setdefault(m["book"], set()).add((subject, std, part))
                        code_book[code] = m["book"]
    book_table, book_conflicts = {}, []
    for prefix, owners in sorted(books.items()):
        if len(owners) == 1:
            subject, std, part = next(iter(owners))
            book_table[prefix] = {"subject": subject, "std": std, "part": part}
        else:
            book_conflicts.append((prefix, sorted(owners)))

    registry, shared = {}, []
    for code, places in by_code.items():
        if code_book.get(code) in book_table:
            continue                                          # the book table already covers this code
        if len(places) == 1:
            subject, std, part, chapter = places[0]
            registry[code] = {"subject": subject, "std": std, "part": part, "chapter": chapter}
        else:
            shared.append((code, places))                     # the same code in several chapters: it cannot pick one

    print(f"\nChapters scanned: {len(chapters)}   with a QR code: {len(chapters) - len(without_qr)}   "
          f"books learned: {len(book_table)}   single codes: {len(registry)}")
    for prefix, t in book_table.items():
        print(f"  book {prefix} = {t['subject']} class {t['std']}" + (f" part {t['part']}" if t["part"] else ""))
    for prefix, owners in book_conflicts:
        print(f"  CHECK: book code {prefix} matches several books: {owners}")
    if shared:
        print("\nThese codes appear in more than one chapter, so they were NOT added (probably a book-level code):")
        for code, places in shared:
            print(f"  {code}  ->  {len(places)} chapters")
    if without_qr:
        print(f"\nNo QR code found in: {', '.join(without_qr[:15])}{' ...' if len(without_qr) > 15 else ''}")
    for n in notes:
        print("  note:", n)

    if args.dry_run:
        print("\nDry run: nothing written.")
        return
    path = config.QR_REGISTRY_PATH
    existing = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    existing.update(registry)
    if book_table:
        existing.setdefault("_books", {}).update(book_table)
    existing.setdefault("_readme", "Maps a QR code key to a chapter. Built by app.qr_resolver.build_registry.")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWritten: {path}  ({len(book_table)} books and {len(registry)} single codes added or updated)")


if __name__ == "__main__":
    main()