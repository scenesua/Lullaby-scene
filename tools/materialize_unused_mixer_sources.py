"""Build reviewed mixer loops from unused Journey candidates."""

from __future__ import annotations

import argparse
import hashlib
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np

import deploy_loop_assets as loops
from repair_loop_boundaries import _seam_metrics


@dataclass(frozen=True)
class Source:
    source_id: str
    filename: str


SOURCES = (
    Source("lighthouse", "503422__awr1001__lighthouse-by-the-jetty.mp3"),
    Source("snowy_night", "845502__tsp-talk__quiet-winter-night-with-light-snow-wind-altenthann-ambience-260215_001.wav"),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def build(source: Source, input_root: Path, android_root: Path, web_root: Path,
          ffmpeg: str, ffprobe: str) -> dict:
    original = input_root / source.filename
    info = loops._probe(original, ffprobe)
    analysis = loops._decode(original, ffmpeg)
    if info is None or analysis is None:
        raise RuntimeError(f"Cannot decode {original}")
    features = loops._features(analysis, loops.ANALYSIS_RATE)
    candidates = loops._candidate_ranges(features, analysis, info.duration, variable=True)
    if not candidates:
        raise RuntimeError(f"No stable loop region in {original}")
    rate = min(max(info.sample_rate, 8_000), 48_000)
    selected = None
    failures = []
    for start_frame, end_frame, _, _ in candidates:
        start = start_frame * loops.HOP_SECONDS
        duration = (end_frame - start_frame) * loops.HOP_SECONDS
        segment = loops._decode_segment(original, ffmpeg, info, start, duration)
        if segment is None:
            failures.append({"start_seconds": start, "reason": "decode_failed"})
            continue
        segment, _ = loops._refine_zero_crossing(segment, rate)
        audio = loops._equal_power_loop(segment, rate, fade_seconds=10.0)
        peak = float(np.max(np.abs(audio)))
        if peak > 0.98:
            audio *= 0.98 / peak
        seam = _seam_metrics(audio, rate)
        if seam["passed"]:
            selected = start, duration, audio, seam
            break
        failures.append({"start_seconds": start, "seam": seam})
    if selected is None:
        raise RuntimeError(f"Loop seam QA failed for {source.source_id}: {failures}")
    start, duration, audio, seam = selected

    name = f"{source.source_id}_loop_001.ogg"
    android = android_root / source.source_id / "continuous" / name
    error = loops._encode(audio, rate, android, ffmpeg)
    if error:
        raise RuntimeError(error)
    web = web_root / name
    web.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(android, web)
    output_info = loops._probe(android, ffprobe)
    return {
        "id": source.source_id,
        "duration_ms": round((output_info.duration if output_info else len(audio) / rate) * 1000),
        "bytes": android.stat().st_size,
        "sha256": sha256(android),
        "original_sha256": sha256(original),
        "start_seconds": round(start, 3),
        "source_seconds": round(duration, 3),
        "seam": seam,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-root", required=True, type=Path)
    parser.add_argument("--android-root", default="app/src/main/assets/ambience", type=Path)
    parser.add_argument("--web-root", default="web/audio", type=Path)
    parser.add_argument("--ffmpeg", default="ffmpeg")
    parser.add_argument("--ffprobe", default="ffprobe")
    args = parser.parse_args()
    for source in SOURCES:
        print(build(source, args.input_root, args.android_root, args.web_root, args.ffmpeg, args.ffprobe))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
