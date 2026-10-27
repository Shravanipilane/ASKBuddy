import os
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TQDM_DISABLE", "1")

import time

from app.chat.pipeline import chat_turn


def _to_int(value: str):
    return int(value) if value.strip().isdigit() else None


def choose_chapter() -> dict:
    print("\nWhich chapter? (press Enter to skip any)")
    subject = input("  Subject (e.g. biology): ").strip().title() or None
    std = _to_int(input("  Class (11 or 12): "))
    chapter = _to_int(input("  Chapter number: "))
    return {"subject": subject, "std": std, "chapter": chapter}


# ---- Input: type or speak ----

def question_from_typing() -> str:
    return input("\nType your message: ").strip()


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
    t0 = time.time()
    result = transcribe(audio)
    print(f"(speech to text took {time.time() - t0:.1f}s)")
    text = result["text"]
    if not text:
        print("I could not hear anything clearly. Please try again.")
        return ""

    print(f"\nI heard: {text}")
    fixed = input("Press Enter to use this, or type the corrected message: ").strip()
    return fixed or text


# ---- Output: show, and optionally speak ----

def show_reply(reply: dict) -> None:
    print(f"\n[{reply['route']} | mood: {reply['mood']}]")
    print("\n" + reply["book_answer"])
    if reply["fun_extra"]:
        print("\n  Fun extra (not from your book): " + reply["fun_extra"])
    if reply["next_prompt"]:
        print("\n  " + reply["next_prompt"])
    if reply["sources"]:
        print("\nSources:")
        for s in reply["sources"]:
            print(f"  {s['subject']} class {s['std']}, chapter {s['chapter']}, page {s['page']} (score {s['score']})")


def play_text(text: str) -> None:
    try:
        from app.voice.tts import warm_up, speak
        from app.voice.player import play

        print("\n(Loading voice model, first time only...)")
        warm_up()
        t0 = time.time()
        result = speak(text)
        print(f"(text to speech took {time.time() - t0:.1f}s, press Ctrl+C to stop playing)")
        play(result["audio"], result["sample_rate"])
    except Exception as e:
        print(f"Could not play the answer: {e}")


def main() -> None:
    print("=== ASKBuddy ===")
    name = input("What's your name? (press Enter to skip): ").strip() or None
    scope = choose_chapter()
    session_id = None

    reply = chat_turn("hi", session_id, scope, name)
    session_id = reply["session_id"]
    print("\n" + reply["text"])
    play_text(reply["spoken_text"])

    try:
        while True:
            choice = input("\n[1] Type   [2] Speak   [c] Change chapter   [q] Quit : ").strip().lower()
            if choice == "q":
                break
            if choice == "c":
                scope = choose_chapter()
                continue
            if choice == "1":
                message = question_from_typing()
            elif choice == "2":
                message = question_from_voice()
            else:
                print("Please choose 1, 2, c or q.")
                continue
            if not message:
                continue

            print("\nThinking...")
            reply = chat_turn(message, session_id, scope, name)
            session_id = reply["session_id"]
            show_reply(reply)
            if input("\nPlay the answer aloud? [y/N]: ").strip().lower() == "y":
                play_text(reply["spoken_text"])
    except (KeyboardInterrupt, EOFError):
        pass
    print("\nBye!")


if __name__ == "__main__":
    main()