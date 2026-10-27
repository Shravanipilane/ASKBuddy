import os
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

import argparse
import re
import time

from app.ingestion.ingest_chapter import ingest_chapter
from app.db.vector_store import get_collection
from app.utils import config

RAW_DIR = config.ROOT_DIR / "data" / "raw_pdfs"

# Folder subject name -> stream. Add new subjects here.
STREAMS = {
    "physics": "Science", "chemistry": "Science", "biology": "Science", "mathematics": "Science",
    "accountancy": "Commerce", "business_studies": "Commerce", "economics": "Commerce",
    "history": "Humanities", "geography": "Humanities", "political_science": "Humanities",
    "sociology": "Humanities", "psychology": "Humanities",
}

FOLDER_PATTERN = re.compile(r"^class(11|12)_([a-z_]+)$")
# keph101.pdf -> book "keph1" (Part 1), chapter 1. Chapters restart at 1 in every part.
FILE_PATTERN = re.compile(r"^([a-z]{4}\d)(\d{2})\.pdf$", re.IGNORECASE)


def part_numbers(codes):
    """{'keph1': 1, 'keph2': 2} for multi-part subjects, all 0 for single-book subjects."""
    multi = len(codes) > 1 or any(c[-1] != "1" for c in codes)
    return {c: (int(c[-1]) if multi else 0) for c in codes}


def discover(only):
    plan, notes = [], []
    for folder in sorted(p for p in RAW_DIR.iterdir() if p.is_dir()):
        if only and folder.name not in only:
            continue
        m = FOLDER_PATTERN.match(folder.name)
        if not m:
            notes.append(f"{folder.name}: folder name must look like class11_biology")
            continue
        std, slug = int(m.group(1)), m.group(2)
        if slug not in STREAMS:
            notes.append(f"{folder.name}: unknown subject '{slug}' (add it to STREAMS)")
            continue
        pdfs = []
        for pdf in sorted(folder.glob("*.pdf")):
            fm = FILE_PATTERN.match(pdf.name)
            if fm:
                pdfs.append((fm.group(1).lower(), int(fm.group(2)), pdf))
            else:
                notes.append(f"{folder.name}\\{pdf.name}: skipped (not a chapter file)")
        if pdfs:
            codes = sorted({c for c, _, _ in pdfs})
            plan.append({
                "folder": folder.name, "std": std,
                "subject": slug.replace("_", " ").title(),
                "stream": STREAMS[slug],
                "parts": part_numbers(codes),
                "pdfs": sorted(pdfs),
            })
    return plan, notes


def main():
    parser = argparse.ArgumentParser(description="Ingest every book folder under data/raw_pdfs")
    parser.add_argument("--only", nargs="*", help="folder names, e.g. class11_physics")
    parser.add_argument("--dry-run", action="store_true", help="show the plan, ingest nothing")
    args = parser.parse_args()

    plan, notes = discover(args.only)
    for b in plan:
        counts = {}
        for code, _, _ in b["pdfs"]:
            counts[code] = counts.get(code, 0) + 1
        books = ", ".join(
            f"{c} ({'Part ' + str(b['parts'][c]) if b['parts'][c] else 'single book'}): {n} chapters"
            for c, n in sorted(counts.items())
        )
        print(f"{b['folder']:<26} {b['stream']:<10} {books}")
    if notes:
        print("\nNotes:")
        for n in notes:
            print("  -", n)
    if args.dry_run:
        return

    col = get_collection()
    ok, failed, total = 0, [], 0
    start = time.time()
    for b in plan:
        print(f"\n=== {b['folder']} ({b['stream']}) ===")
        for code in b["parts"]:
            col.delete(where={"book": code})          # clears this book's old entries
        for code, chapter, pdf in b["pdfs"]:
            t0 = time.time()
            try:
                n = ingest_chapter(str(pdf), b["subject"], b["std"], chapter,
                                   stream=b["stream"], book=code, part=b["parts"][code])
                ok += 1
                total += n
                print(f"[OK]   {code} ch{chapter:>2}  {n:>3} chunks  ({time.time() - t0:.0f}s)")
            except Exception as e:
                failed.append((b["folder"], pdf.name, f"{type(e).__name__}: {e}"))
                print(f"[FAIL] {pdf.name}  {type(e).__name__}: {e}")

    print("\n" + "=" * 50)
    print(f"Done in {time.time() - start:.0f}s. Success: {ok}  Failed: {len(failed)}  Chunks added: {total}")
    print(f"Total chunks in the database: {col.count()}")
    for folder, name, err in failed:
        print(f"  FAILED {folder}\\{name}: {err}")


if __name__ == "__main__":
    main()