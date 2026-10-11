import os
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

from app.retrieval.retriever import build_where
from app.generation.rag_chain import answer


def _to_int(value: str):
    return int(value) if value.strip().isdigit() else None


def choose_chapter():
    print("\nWhich chapter? (press Enter to skip any)")
    subject = input("  Subject (e.g. biology): ").strip().title() or None
    std = _to_int(input("  Class (11 or 12): "))
    chapter = _to_int(input("  Chapter number: "))
    return build_where(subject, std, chapter)


# ---- Step 1: get the question as text, by typing or speaking ----

def question_from_typing() -> str:
    return input("\nType your question: ").strip()


def question_from_voice() -> str:
    from app.voice.recorder import record_until_enter
    from app.voice.stt import warm_up, transcribe

    print("\n(Loading speech model, first time only...)")
    warm_up()
    audio = record_until_enter()
    if audio.size < 8000:                       # less than 0.5 second
        print("Nothing recorded. Check your microphone.")
        return ""

    print("Converting speech to text...")
    result = transcribe(audio)
    text = result["text"]
    if not text:
        print("I could not hear anything clearly. Please try again.")
        return ""

    print(f"\nI heard: {text}")
    fixed = input("Press Enter to use this, or type the corrected question: ").strip()
    return fixed or text


# ---- Step 2: send the text to the RAG chain ----

def show_answer(question: str, where) -> None:
    print("\nThinking...")
    try:
        out = answer(question, where=where)
    except Exception as e:
        print(f"Error: {e}")
        return
    print("\n" + out["answer"])
    if out["sources"]:
        print("\nSources:")
        for s in out["sources"]:
            print(f"  Chapter {s['chapter']}, page {s['page']} (score {s['score']})")


def main():
    print("=== ASKBuddy ===")
    where = choose_chapter()
    try:
        while True:
            choice = input("\n[1] Type   [2] Speak   [c] Change chapter   [q] Quit : ").strip().lower()
            if choice == "q":
                break
            if choice == "c":
                where = choose_chapter()
                continue
            if choice == "1":
                question = question_from_typing()
            elif choice == "2":
                question = question_from_voice()
            else:
                print("Please choose 1, 2, c or q.")
                continue
            if question:
                show_answer(question, where)
    except (KeyboardInterrupt, EOFError):
        pass
    print("\nBye!")


if __name__ == "__main__":
    main()