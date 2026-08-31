"""Debug audition: soften CC0 hollandm tongue-drum notes, bake a diffuse tail.

Inputs are the public HQ previews (not the original WAV downloads):
https://freesound.org/people/hollandm/sounds/692569/ (C3)
https://freesound.org/people/hollandm/sounds/692570/ (D3)
https://freesound.org/people/hollandm/sounds/692571/ (E3)
https://freesound.org/people/hollandm/sounds/692568/ (G3)
https://freesound.org/people/hollandm/sounds/692561/ (A3)
All five source pages verified CC0-1.0 on 2026-09-01.
Usage: python tools/prepare_rain_drum.py INPUT_DIRECTORY OUTPUT_DIRECTORY
"""
import sys
import subprocess
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

source, destination = map(Path, sys.argv[1:])
destination.mkdir(parents=True, exist_ok=True)
for sound_id, note in [(692569, 'c3'), (692570, 'd3'), (692571, 'e3'), (692568, 'g3'), (692561, 'a3')]:
    rate, pcm = wavfile.read(source / f'{sound_id}.wav')
    assert rate == 44100 and pcm.ndim == 2
    dry = pcm[:rate * 5].astype(np.float64) / 32768
    dry = sosfilt(butter(2, [110, 2400], btype='bandpass', fs=rate, output='sos'), dry, axis=0)
    dry[:441] *= np.linspace(0, 1, 441)[:, None]
    dry[-rate:] *= np.linspace(1, 0, rate)[:, None]
    rng = np.random.default_rng(sound_id)
    t = np.arange(int(rate * 2.4)) / rate
    impulse = rng.normal(size=(len(t), 2)) * np.exp(-t[:, None] * 3.2)
    impulse = sosfilt(butter(2, [240, 1900], btype='bandpass', fs=rate, output='sos'), impulse, axis=0)
    impulse[:int(rate * .025)] = 0
    impulse /= np.sqrt(np.sum(impulse ** 2, axis=0))
    wet = np.column_stack([fftconvolve(dry.mean(axis=1), impulse[:, channel]) for channel in range(2)])
    wet *= np.sqrt(np.mean(dry ** 2)) / max(1e-9, np.sqrt(np.mean(wet ** 2)))
    mixed = wet * .42
    mixed[:len(dry)] += dry * .58
    mixed *= .38 / max(1e-9, np.max(np.abs(mixed)))
    mixed[-rate:] *= np.linspace(1, 0, rate)[:, None]
    assert np.isfinite(mixed).all() and np.max(np.abs(mixed)) < .4
    temporary = source / f'processed-{note}.wav'
    wavfile.write(temporary, rate, (mixed * 32767).astype(np.int16))
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(temporary),
                    '-c:a', 'libvorbis', '-q:a', '5', str(destination / f'{note}.ogg')], check=True)
    print(f'{note}: {len(mixed)/rate:.2f}s, peak {20*np.log10(np.max(np.abs(mixed))):.1f} dBFS')
