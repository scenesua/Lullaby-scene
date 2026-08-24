#!/usr/bin/env python3
"""Make a decoded ambience recording loop cleanly at its sample boundary.

The first ``crossfade`` seconds become a linear blend from the original tail
to the original head. The folded tail is then removed, so the last sample of
the result naturally leads into the first. Spacecraft beds can additionally
receive a deterministic, low-level synthetic drive layer.
"""

from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path

import numpy as np


SAMPLE_RATE = 48_000


def decode(path: Path) -> np.ndarray:
    result = subprocess.run(
        [
            "ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le",
            "-acodec", "pcm_f32le", "-ac", "2", "-ar", str(SAMPLE_RATE), "-",
        ],
        check=True,
        capture_output=True,
    )
    return np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2).copy()


def spacecraft_drive(frame_count: int) -> np.ndarray:
    """A quiet reactor hum with slow stereo motion and no transient beeps."""
    t = np.arange(frame_count, dtype=np.float64) / SAMPLE_RATE
    slow = 0.72 + 0.12 * np.sin(2 * np.pi * t / 19.0)
    reactor = (
        0.0065 * np.sin(2 * np.pi * 43.0 * t)
        + 0.0035 * np.sin(2 * np.pi * 64.5 * t + 0.7)
        + 0.0022 * np.sin(2 * np.pi * 86.0 * t + 1.3)
        + 0.0012 * np.sin(2 * np.pi * 172.0 * t + 0.2)
    ) * slow
    shimmer_envelope = 0.45 + 0.45 * np.sin(2 * np.pi * t / 27.0 - 0.8) ** 2
    shimmer = shimmer_envelope * (
        0.0014 * np.sin(2 * np.pi * 246.0 * t + 0.16 * np.sin(2 * np.pi * t / 13.0))
        + 0.0024 * np.sin(2 * np.pi * 734.0 * t + 0.18 * np.sin(2 * np.pi * t / 11.0))
        + 0.0016 * np.sin(2 * np.pi * 1101.0 * t + 0.21 * np.sin(2 * np.pi * t / 17.0))
    )
    pan = 0.5 + 0.16 * np.sin(2 * np.pi * t / 23.0)
    left = reactor * (1.0 - 0.12 * pan) + shimmer * (1.0 - pan)
    right = reactor * (0.88 + 0.12 * pan) + shimmer * pan
    return np.column_stack((left, right)).astype(np.float32)


def fold_tail_into_head(audio: np.ndarray, crossfade_seconds: float) -> np.ndarray:
    fade_frames = round(crossfade_seconds * SAMPLE_RATE)
    if fade_frames <= 0 or fade_frames * 2 >= len(audio):
        raise ValueError("Crossfade must be positive and shorter than half the recording")
    output = audio[:-fade_frames].copy()
    mix = np.linspace(0.0, 1.0, fade_frames, endpoint=False, dtype=np.float32)[:, None]
    output[:fade_frames] = audio[-fade_frames:] * (1.0 - mix) + audio[:fade_frames] * mix
    # Lossy Ogg codecs initialize their prediction state again on every repeat.
    # A very short zero guard makes that codec reset inaudible; at 80 ms it is
    # too brief to register as a level change in multi-minute sleep ambience.
    guard_frames = round(0.08 * SAMPLE_RATE)
    guard = np.sin(np.linspace(0.0, np.pi / 2, guard_frames, dtype=np.float32)) ** 2
    output[:guard_frames] *= guard[:, None]
    output[-guard_frames:] *= guard[::-1, None]
    return output


def fade_out(audio: np.ndarray, fade_seconds: float) -> np.ndarray:
    fade_frames = round(fade_seconds * SAMPLE_RATE)
    if fade_frames <= 0 or fade_frames >= len(audio):
        raise ValueError("Fade-out must be positive and shorter than the recording")
    output = audio.copy()
    fade = np.sin(np.linspace(np.pi / 2, 0.0, fade_frames, dtype=np.float32)) ** 2
    output[-fade_frames:] *= fade[:, None]
    return output


def encode(audio: np.ndarray, output: Path) -> None:
    peak = float(np.max(np.abs(audio)))
    if peak > 0.98:
        audio *= 0.98 / peak
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False, dir=output.parent) as handle:
        temporary = Path(handle.name)
    try:
        subprocess.run(
            [
                "ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SAMPLE_RATE),
                "-ac", "2", "-i", "-", "-c:a", "libopus", "-b:a", "112k", "-vbr", "on",
                "-application", "audio", str(temporary),
            ],
            input=audio.astype("<f4", copy=False).tobytes(),
            check=True,
        )
        temporary.replace(output)
    finally:
        temporary.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--crossfade", type=float, default=6.0)
    parser.add_argument("--spacecraft-drive", action="store_true")
    parser.add_argument("--one-shot-fade-out", type=float)
    args = parser.parse_args()

    audio = decode(args.input)
    if args.spacecraft_drive:
        audio += spacecraft_drive(len(audio))
    output = fade_out(audio, args.one_shot_fade_out) if args.one_shot_fade_out else fold_tail_into_head(audio, args.crossfade)
    encode(output, args.output)
    print(f"{args.output}: {len(audio) / SAMPLE_RATE:.3f}s -> {len(output) / SAMPLE_RATE:.3f}s")


if __name__ == "__main__":
    main()
