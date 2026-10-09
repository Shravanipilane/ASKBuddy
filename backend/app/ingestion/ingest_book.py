import os
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

import argparse
import re
import time
from pathlib import Path

from app.ingestion.ingest_chapter import ingest_chapter
from app.db.vector_store import get_collection

# kebo101.pdf -> chapter 1, kebo119.pdf -> chapter 19 (Class 12 files like lebo101.pdf also match)
NAME_PATTERN = re.compile(r"^[a-z]{4}1(\d{2})\.pdf$", re.IGNORECASE)


def main():
    parser = argparse.ArgumentParser(description="Ingest all chapter PDFs of one textbook")
    parser.add_argument("--folder", required=True)
    parser.add_argument("--subject", required=True)
    parser.add_argument("--std", type=int, required=True)
    parser.add_argument("--chapters", type=int, nargs="*", help="only these chapter numbers")
    args = parser.parse_args()

    folder = Path(args.folder)
    if not folder.is_dir():
        raise SystemExit(f"Folder not found: {folder}")

    jobs, skipped = [], []
    for pdf in sorted(folder.glob("*.pdf")):
        m = NAME_PATTERN.match(pdf.name)
        if not m:
            skipped.append(pdf.name)
            continue
        chapter = int(m.group(1))
        if args.chapters and chapter not in args.chapters:
            continue
        jobs.append((chapter, pdf))

    jobs.sort()
    print(f"Found {len(jobs)} chapter PDFs. Skipped: {skipped or 'none'}\n")

    results, failed = [], []
    start = time.time()
    for chapter, pdf in jobs:
        t0 = time.time()
        try:
            n = ingest_chapter(str(pdf), args.subject.title(), args.std, chapter)
            results.append((chapter, pdf.name, n))
            print(f"[OK]   Chapter {chapter:>2}  {pdf.name}  {n:>3} chunks  ({time.time() - t0:.0f}s)")
        except Exception as e:
            failed.append((chapter, pdf.name, str(e)))
            print(f"[FAIL] Chapter {chapter:>2}  {pdf.name}  {type(e).__name__}: {e}")

    print("\n" + "=" * 50)
    print(f"Done in {time.time() - start:.0f}s. Success: {len(results)}  Failed: {len(failed)}")
    print(f"Total chunks stored for this run: {sum(r[2] for r in results)}")
    print(f"Total chunks in the whole database: {get_collection().count()}")
    if failed:
        print("\nFailed chapters (fix these and re-run with --chapters):")
        for chapter, name, err in failed:
            print(f"  Chapter {chapter}: {name} -> {err}")


if __name__ == "__main__":
    main()
    