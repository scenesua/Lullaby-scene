#!/usr/bin/env python3
"""Materialize Ferry, Spacecraft and Submarine journey audio for Android and Web."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


ASSETS = {
    "ferry_journey_departure_001.ogg": ("ferry_journey", "continuous", "74916__mrmayo__back-of-ferry-boat.wav", None),
    "ferry_journey_bed_001.ogg": ("ferry_journey", "continuous", "338035__alcappuccino__cruiseship-inside-crew-area-near-the-engine.wav", None),
    "ferry_journey_arrival_001.ogg": ("ferry_journey", "continuous", "758917__hajohansen__ferry-boat-in-northern-norway-senja-brensholmen-botnhamn-waves.wav", None),
    "spacecraft_journey_transition_001.ogg": ("spacecraft_journey", "continuous", "221570__alaskarobotics__ambient-spacecraft-hum.wav", None),
    "spacecraft_journey_bed_001.ogg": ("spacecraft_journey", "continuous", "256269__jmayoff__space-ship-atmosphere.wav", None),
    "submarine_journey_departure_001.ogg": ("submarine_journey", "continuous", "484187__tim_verberne__underwater-movement.wav", None),
    "submarine_journey_engine_bed_001.ogg": ("submarine_journey", "continuous", "438726__craigsmith__g45-24-submarine-interior-engine-room.wav", None),
    "submarine_journey_water_bed_001.ogg": ("submarine_journey", "continuous", "482167__tim_verberne__underwater-ambience.wav", None),
    "submarine_journey_arrival_001.ogg": ("submarine_journey", "continuous", "438724__craigsmith__g45-22-submarine-air-conditioner.wav", None),
    "submarine_sonar_event_001.ogg": ("submarine_journey", "events", "493162__breviceps__submarine-sonar.wav", 5.0),
}


def probe(path: Path) -> dict:
    data = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,sample_rate,channels",
        "-show_entries", "format=duration,size", "-of", "json", str(path),
    ], text=True))
    stream = data["streams"][0]
    return {
        "duration_ms": round(float(data["format"]["duration"]) * 1000),
        "bytes": int(data["format"]["size"]),
        "codec": stream["codec_name"],
        "sample_rate": int(stream["sample_rate"]),
        "channels": int(stream["channels"]),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def build(staging: Path, android_root: Path, web_root: Path) -> None:
    missing = [source for _, _, source, _ in ASSETS.values() if not (staging / source).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing staged journey audio: {missing}")

    metadata = {}
    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        for output_name, (scene, kind, source_name, trim_seconds) in ASSETS.items():
            source, output = staging / source_name, temp / output_name
            filters = ["aresample=48000", "aformat=channel_layouts=stereo", "highpass=f=22", "afade=t=in:st=0:d=0.2"]
            if trim_seconds:
                filters.insert(0, f"atrim=0:{trim_seconds}")
                filters += [f"afade=t=out:st={trim_seconds - 0.4}:d=0.35"]
            command = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                "-af", ",".join(filters), "-ar", "48000", "-ac", "2",
                "-c:a", "libopus", "-b:a", "96k", "-vbr", "on", "-compression_level", "10", str(output),
            ]
            subprocess.run(command, check=True)
            info = probe(output)
            if (info["codec"], info["sample_rate"], info["channels"]) != ("opus", 48000, 2):
                raise RuntimeError(f"Unexpected output format: {output}: {info}")
            metadata[output_name] = info
            for root in (android_root / scene / kind, web_root / scene):
                root.mkdir(parents=True, exist_ok=True)
                target = root / output_name
                shutil.copy2(output, target)
                if hashlib.sha256(target.read_bytes()).hexdigest() != info["sha256"]:
                    raise RuntimeError(f"Copy verification failed: {target}")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("staging", type=Path)
    parser.add_argument("android_root", type=Path)
    parser.add_argument("web_root", type=Path)
    args = parser.parse_args()
    build(args.staging, args.android_root, args.web_root)


if __name__ == "__main__":
    main()
