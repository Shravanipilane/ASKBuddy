import os
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import sys
import numpy as np
from kittentts import KittenTTS
from app.utils import config
from app.voice.player import play

TEXT = sys.argv[1] if len(sys.argv) > 1 else (
    "Hi! I'm Ask Buddy, your study buddy. Ask me anything from your N C E R T book!"
)

model = KittenTTS(config.TTS_MODEL)
for voice in model.available_voices:
    print("Voice:", voice)
    audio = model.generate(TEXT, voice=voice, speed=config.TTS_SPEED)
    play(np.asarray(audio, dtype=np.float32).flatten(), config.TTS_SAMPLE_RATE)