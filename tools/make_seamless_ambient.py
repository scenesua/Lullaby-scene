"""Move a loop boundary into untouched ambience and crossfade the old cut."""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile


source, destination, fade_seconds = Path(sys.argv[1]), Path(sys.argv[2]), float(sys.argv[3])
with tempfile.TemporaryDirectory() as temporary:
    decoded = Path(temporary) / "decoded.wav"
    rendered = Path(temporary) / "rendered.wav"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source), "-ar", "44100", "-ac", "2", str(decoded)], check=True)
    rate, pcm = wavfile.read(decoded)
    audio = pcm.astype(np.float64) / 32768.0
    middle, fade = len(audio) // 2, min(int(rate * fade_seconds), len(audio) // 4)
    first, second = audio[middle:], audio[:middle]
    t = np.linspace(0, 1, fade)[:, None]
    overlap = first[-fade:] * np.cos(t * np.pi / 2) + second[:fade] * np.sin(t * np.pi / 2)
    loop = np.concatenate((first[:-fade], overlap, second[fade:]))
    loop[:256] *= np.linspace(.999, 1, 256)[:, None]
    wavfile.write(rendered, rate, np.clip(loop * 32767, -32768, 32767).astype(np.int16))
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(rendered), "-c:a", "libvorbis", "-q:a", "3", str(destination)], check=True)
    print(f"{destination}: {len(loop) / rate:.3f}s, {fade_seconds:.2f}s repaired boundary")
