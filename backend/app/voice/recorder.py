import numpy as np
import sounddevice as sd

SAMPLE_RATE = 16000   # Whisper expects 16 kHz mono


def record_until_enter() -> np.ndarray:
    chunks = []

    def callback(indata, frames, time_info, status):
        chunks.append(indata.copy())

    input("Press Enter to start recording...")
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32", callback=callback):
        input("Recording... speak now. Press Enter to stop.")

    if not chunks:
        return np.zeros(0, dtype="float32")
    return np.concatenate(chunks, axis=0).flatten()