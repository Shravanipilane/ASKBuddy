"""Look at, clean and reset the ChromaDB collection.

    python -m app.db_admin summary
    python -m app.db_admin delete --subject biology --std 11 --chapter 1
    python -m app.db_admin dedupe
    python -m app.db_admin wipe

Stop the API server and any other program that uses the database before changing it.
A backup copy is saved in data/backups before anything is deleted.
"""
import argparse
import hashlib
import shutil
import time
from collections import defaultdict
from pathlib import Path

import chromadb

from app.utils import config

BATCH = 500


def _client():
    return chromadb.PersistentClient(path=str(config.CHROMA_DIR))


def _collection():
    try:
        return _client().get_collection(config.COLLECTION_NAME)
    except Exception:
        return None


def _backup() -> Path:
    base = config.ROOT_DIR / "data" / "backups"
    base.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("chroma_%Y%m%d_%H%M%S")
    dest, n = base / stamp, 1
    while dest.exists():                       # two backups in the same second
        n += 1
        dest = base / f"{stamp}_{n}"
    shutil.copytree(config.CHROMA_DIR, dest)
    return dest


def _delete_ids(col, ids: list[str]) -> None:
    for i in range(0, len(ids), BATCH):
        col.delete(ids=ids[i:i + BATCH])


def _subject(m: dict) -> str:
    return str(m.get("subject", "")).lower()


def cmd_summary(args) -> None:
    col = _collection()
    if col is None:
        print("No collection yet. Nothing has been ingested.")
        return
    data = col.get(include=["documents", "metadatas"])
    groups = defaultdict(lambda: {"count": 0, "ids": set(), "sources": set(), "subjects": set()})
    texts = defaultdict(int)
    for doc, m in zip(data["documents"], data["metadatas"]):
        g = groups[(_subject(m), m.get("std") or 0, m.get("chapter") or 0)]
        g["count"] += 1
        g["ids"].add(m.get("doc_id"))
        g["sources"].add(m.get("source"))
        g["subjects"].add(m.get("subject"))
        texts[(_subject(m), m.get("std"), m.get("chapter"), " ".join(doc.split()).lower())] += 1

    print(f"Total chunks: {len(data['ids'])}\n")
    print(f"{'subject':<14}{'class':<7}{'chap':<6}{'chunks':<8}doc_id / source")
    for key in sorted(groups):
        g = groups[key]
        flag = ""
        if len(g["ids"]) > 1 or len(g["sources"]) > 1 or len(g["subjects"]) > 1:
            flag = "   <-- check: more than one doc_id, source or spelling"
        ids = ",".join(sorted(str(i) for i in g["ids"]))
        srcs = ",".join(sorted(str(s) for s in g["sources"]))
        print(f"{key[0]:<14}{key[1]:<7}{key[2]:<6}{g['count']:<8}{ids} / {srcs}{flag}")
    dups = sum(c - 1 for c in texts.values() if c > 1)
    print(f"\nExact duplicate chunks (same chapter, same text): {dups}")


def _match(m: dict, args) -> bool:
    if args.doc_id and m.get("doc_id") != args.doc_id:
        return False
    if args.subject and _subject(m) != args.subject.lower():
        return False
    if args.std is not None and m.get("std") != args.std:
        return False
    if args.chapter is not None and m.get("chapter") != args.chapter:
        return False
    if args.source and m.get("source") != args.source:
        return False
    return True


def _confirm_and_delete(col, ids: list[str], what: str, assume_yes: bool) -> None:
    if not ids:
        print("Nothing to delete.")
        return
    print(f"{len(ids)} chunks will be deleted ({what}).")
    if not assume_yes and input("Type yes to continue: ").strip().lower() != "yes":
        print("Cancelled.")
        return
    print("Backup saved to", _backup())
    _delete_ids(col, ids)
    print(f"Deleted {len(ids)} chunks. {col.count()} remain.")


def cmd_delete(args) -> None:
    if not any([args.doc_id, args.subject, args.std is not None, args.chapter is not None, args.source]):
        print("Give at least one filter: --doc-id, --subject, --std, --chapter or --source.")
        return
    col = _collection()
    if col is None:
        print("No collection yet.")
        return
    data = col.get(include=["metadatas"])
    ids = [i for i, m in zip(data["ids"], data["metadatas"]) if _match(m, args)]
    _confirm_and_delete(col, ids, "matching your filters", args.yes)


def cmd_dedupe(args) -> None:
    col = _collection()
    if col is None:
        print("No collection yet.")
        return
    data = col.get(include=["documents", "metadatas"])
    seen, to_delete = set(), []
    for id_, doc, m in sorted(zip(data["ids"], data["documents"], data["metadatas"]), key=lambda x: x[0]):
        norm = " ".join(doc.split()).lower()
        key = hashlib.md5(f"{_subject(m)}|{m.get('std')}|{m.get('chapter')}|{norm}".encode()).hexdigest()
        if key in seen:
            to_delete.append(id_)
        else:
            seen.add(key)
    _confirm_and_delete(col, to_delete, "exact duplicates, one copy of each is kept", args.yes)


def cmd_wipe(args) -> None:
    col = _collection()
    if col is None:
        print("No collection yet.")
        return
    n = col.count()
    if not args.yes and input(f"This deletes all {n} chunks (a backup is saved first). Type wipe to continue: ").strip().lower() != "wipe":
        print("Cancelled.")
        return
    print("Backup saved to", _backup())
    _client().delete_collection(config.COLLECTION_NAME)
    from app.db.vector_store import get_collection     # recreate it with the project's own settings
    get_collection()
    print("Collection is empty now. Ingest your books again.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="db_admin")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("summary", help="Show what is stored, and flag possible duplicates").set_defaults(func=cmd_summary)

    d = sub.add_parser("delete", help="Delete chunks matching filters")
    d.add_argument("--doc-id")
    d.add_argument("--subject")
    d.add_argument("--std", type=int)
    d.add_argument("--chapter", type=int)
    d.add_argument("--source", help="PDF file name")
    d.add_argument("--yes", action="store_true", help="Do not ask for confirmation")
    d.set_defaults(func=cmd_delete)

    dd = sub.add_parser("dedupe", help="Remove exact duplicate chunks")
    dd.add_argument("--yes", action="store_true")
    dd.set_defaults(func=cmd_dedupe)

    w = sub.add_parser("wipe", help="Delete everything (backup first)")
    w.add_argument("--yes", action="store_true")
    w.set_defaults(func=cmd_wipe)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()