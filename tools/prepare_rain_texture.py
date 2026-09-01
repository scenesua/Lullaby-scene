"""Turn the approved CC0 tongue-drum previews into short rain-on-metal hits.

Usage: python tools/prepare_rain_texture.py INPUT_DIRECTORY OUTPUT_DIRECTORY
"""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt


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
        direct_length = int(rate * 1.35)
        output_length = int(rate * 3.20)
        dry = np.pad(source[:direct_length], ((0, max(0, direct_length - len(source))), (0, 0)))[:direct_length]
        body = sosfilt(butter(2, [280, 5200], btype="bandpass", fs=rate, output="sos"), dry, axis=0)
        t = np.arange(direct_length) / rate
        body *= np.exp(-t[:, None] * (5.8 + index * .22))

        rng = np.random.default_rng(7200 + index)
        transient = rng.normal(size=(direct_length, 2))
        transient = sosfilt(butter(2, [900, 8200], btype="bandpass", fs=rate, output="sos"), transient, axis=0)
        transient *= (np.exp(-t * 90) * .085)[:, None]
        direct = body * .72 + transient
        direct[:int(rate * .002)] *= np.linspace(0, 1, int(rate * .002))[:, None]
        direct[-int(rate * .16):] *= np.linspace(1, 0, int(rate * .16))[:, None]

        # A dark, diffuse room tail restores space without extending the pitched
        # body into another sustained tongue-drum note.
        ir_length = int(rate * 1.90)
        ir_t = np.arange(ir_length) / rate
        impulse = rng.normal(size=(ir_length, 2)) * np.exp(-ir_t[:, None] * 1.65)
        impulse = sosfilt(butter(2, [420, 5600], btype="bandpass", fs=rate, output="sos"), impulse, axis=0)
        impulse[:int(rate * .032)] = 0
        impulse /= np.sqrt(np.sum(impulse ** 2, axis=0))
        mono = direct.mean(axis=1)
        wet = np.column_stack([fftconvolve(mono, impulse[:, channel])[:output_length] for channel in range(2)])
        wet = np.pad(wet, ((0, max(0, output_length - len(wet))), (0, 0)))[:output_length]

        hit = np.zeros((output_length, 2))
        hit[:direct_length] += direct * .78
        hit += wet * .52
        for delay_seconds, level, swap in ((.047, .18, False), (.083, .13, True), (.139, .09, False)):
            delay = int(rate * delay_seconds)
            reflected = direct[:, ::-1] if swap else direct
            end = min(output_length, delay + direct_length)
            hit[delay:end] += reflected[:end - delay] * level
        hit[-int(rate * .40):] *= np.linspace(1, 0, int(rate * .40))[:, None]
        hit *= .28 / max(np.max(np.abs(hit)), 1e-9)

        rendered = temporary / f"rendered-{note}.wav"
        wavfile.write(rendered, rate, (hit * 32767).astype(np.int16))
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(rendered),
            "-c:a", "libvorbis", "-q:a", "5", str(output_folder / f"{note}.ogg"),
        ], check=True)
        print(f"{note}: {len(hit) / rate:.2f}s rain-metal hit with dark room tail")
