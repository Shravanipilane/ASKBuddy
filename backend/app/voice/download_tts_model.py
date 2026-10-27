import os
os.environ["HF_HUB_OFFLINE"] = "0"     # allow download for this one run

from app.utils import config

if __name__ == "__main__":
    print(f"Downloading TTS model '{config.TTS_MODEL}' ...")
    from kittentts import KittenTTS
    model = KittenTTS(config.TTS_MODEL)
    print("Available voices:", model.available_voices)
    print("Done. Model is cached.")
