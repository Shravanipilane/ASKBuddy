import os
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")        # model is already downloaded
os.environ.setdefault("TQDM_DISABLE", "1")          # hides the "Loading weights" bar

import argparse
from app.ingestion.ingest_chapter import ingest_chapter
from app.retrieval.retriever import retrieve, build_where
from app.generation.rag_chain import answer


def main():
    parser = argparse.ArgumentParser(prog="askbuddy")
    sub = parser.add_subparsers(dest="cmd", required=True)

    ing = sub.add_parser("ingest", help="Load one chapter PDF into ChromaDB")
    ing.add_argument("--pdf", required=True)
    ing.add_argument("--subject", required=True)
    ing.add_argument("--std", type=int, required=True)
    ing.add_argument("--chapter", type=int, required=True)

    ask = sub.add_parser("ask", help="Ask a question")
    ask.add_argument("question")
    ask.add_argument("--no-llm", action="store_true", help="Show retrieved chunks only")
    ask.add_argument("--subject")
    ask.add_argument("--std", type=int)
    ask.add_argument("--chapter", type=int)

    args = parser.parse_args()

    if args.cmd == "ingest":
        n = ingest_chapter(args.pdf, args.subject.title(), args.std, args.chapter)
        print(f"Done. Stored {n} chunks.")
        return

    where = build_where(args.subject.title() if args.subject else None, args.std, args.chapter)
    if args.no_llm:
        for h in retrieve(args.question, where=where):
            print(f"\n--- Page {h['meta']['page']} | score {h['score']} ---")
            print(h["text"][:600])
    else:
        out = answer(args.question, where=where)
        print("\n" + out["answer"])
        if out["sources"]:
            print("\nSources:")
            for s in out["sources"]:
                print(f"  Chapter {s['chapter']}, page {s['page']} (score {s['score']})")


if __name__ == "__main__":
    main()