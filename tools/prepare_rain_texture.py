"""Turn the approved CC0 tongue-drum previews into short rain-on-metal hits.

Usage: python tools/prepare_rain_texture.py INPUT_DIRECTORY OUTPUT_DIRECTORY
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt


source_folder, output_folder = Path(sys.argv[1]), Path(sys.argv[2])
output_folder.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    temporary = Path(temporary)
    for index, note in enumerate(("c3", "d3", "e3", "g3", "a3")):
        decoded = temporary / f"{note}.wav"
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source_folder / f"{note}.ogg"),
            "-ar", "44100", "-ac", "2", str(decoded),
        ], check=True)
        rate, pcm = wavfile.read(decoded)
        source = pcm.astype(np.float64) / 32768.0
        length = int(rate * 1.35)
        dry = np.pad(source[:length], ((0, max(0, length - len(source))), (0, 0)))[:length]
        body = sosfilt(butter(2, [280, 5200], btype="bandpass", fs=rate, output="sos"), dry, axis=0)
        t = np.arange(length) / rate
        body *= np.exp(-t[:, None] * (5.8 + index * .22))

        rng = np.random.default_rng(7200 + index)
        transient = rng.normal(size=(length, 2))
        transient = sosfilt(butter(2, [900, 8200], btype="bandpass", fs=rate, output="sos"), transient, axis=0)
        transient *= (np.exp(-t * 90) * .085)[:, None]
        hit = body * .72 + transient
        hit[:int(rate * .002)] *= np.linspace(0, 1, int(rate * .002))[:, None]
        hit[-int(rate * .16):] *= np.linspace(1, 0, int(rate * .16))[:, None]
        hit *= .28 / max(np.max(np.abs(hit)), 1e-9)

        rendered = temporary / f"rendered-{note}.wav"
        wavfile.write(rendered, rate, (hit * 32767).astype(np.int16))
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(rendered),
            "-c:a", "libvorbis", "-q:a", "5", str(output_folder / f"{note}.ogg"),
        ], check=True)
        print(f"{note}: {len(hit) / rate:.2f}s rain-metal hit")
