import os
os.environ["HF_HUB_OFFLINE"] = "0"     # allow download for this one run

from faster_whisper import WhisperModel
from app.utils import config

if __name__ == "__main__":
    print(f"Downloading Whisper '{config.STT_MODEL_SIZE}' ...")
    WhisperModel(config.STT_MODEL_SIZE, device="cpu", compute_type=config.STT_COMPUTE_TYPE)
    print("Done. Model is cached.")