"""Build a long, softly looping CC0 forest bed for debug audition.

Source: https://freesound.org/people/priesjensen/sounds/488328/
License: CC0 1.0 (verified 2026-09-01)
Input: the public Freesound HQ preview for sound 488328.
Usage: python tools/prepare_forest_bed.py INPUT OUTPUT [OUTPUT ...]
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt


source, *outputs = map(Path, sys.argv[1:])
if not outputs:
    raise SystemExit("Provide at least one output path")

with tempfile.TemporaryDirectory() as temporary:
    temporary = Path(temporary)
    decoded, rendered, encoded = (temporary / name for name in ("decoded.wav", "rendered.wav", "forest.ogg"))
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", "60", "-t", "240",
        "-i", str(source), "-ar", "44100", "-ac", "2", str(decoded),
    ], check=True)
    rate, pcm = wavfile.read(decoded)
    audio = pcm.astype(np.float64) / 32768.0
    audio = sosfilt(butter(2, [70, 14500], btype="bandpass", fs=rate, output="sos"), audio, axis=0)

    # Move the final loop boundary into continuous source audio. The original
    # trim boundary is hidden inside a long equal-power ambience crossfade.
    middle, fade = len(audio) // 2, int(rate * 14)
    first, second = audio[middle:], audio[:middle]
    t = np.linspace(0, 1, fade)[:, None]
    overlap = first[-fade:] * np.cos(t * np.pi / 2) + second[:fade] * np.sin(t * np.pi / 2)
    loop = np.concatenate((first[:-fade], overlap, second[fade:]))

    rms = np.sqrt(np.mean(loop ** 2))
    loop *= min(1.0, (10 ** (-25 / 20)) / max(rms, 1e-9), .72 / max(np.max(np.abs(loop)), 1e-9))
    wavfile.write(rendered, rate, np.clip(loop * 32767, -32768, 32767).astype(np.int16))
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(rendered),
        "-c:a", "libvorbis", "-q:a", "3", str(encoded),
    ], check=True)
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(encoded, output)
        print(f"{output}: {len(loop) / rate:.3f}s, 14.0s repaired boundary")
