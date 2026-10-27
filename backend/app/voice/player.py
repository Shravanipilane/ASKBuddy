import numpy as np
import sounddevice as sd


def play(audio: np.ndarray, sample_rate: int) -> None:
    try:
        sd.play(audio, sample_rate)
        sd.wait()
    except KeyboardInterrupt:
        sd.stop()
        print("\n(Stopped.)")
