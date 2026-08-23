#!/usr/bin/env python3
"""Materialize the Train Journey beds from staged public-domain recordings."""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
from pathlib import Path


SOURCES = {
    "doors": "Train_doors_closing.ogg",
    "accelerate": "E233-3000Accelerate.ogg",
    "bed": "Стук_колёс_поезда.ogg",
    "decelerate": "E231Deceleration.ogg",
}


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def encode(inputs: list[Path], output: Path, filter_complex: str) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for source in inputs:
        command += ["-i", str(source)]
    command += [
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-ar", "48000", "-ac", "2",
        "-c:a", "libopus", "-b:a", "96k", "-vbr", "on", "-compression_level", "10",
        str(output),
    ]
    run(*command)


def probe(path: Path) -> dict:
    data = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name,sample_rate,channels",
        "-show_entries", "format=duration,size", "-of", "json", str(path),
    ], text=True))
    stream = data["streams"][0]
    duration = float(data["format"]["duration"])
    if stream.get("codec_name") != "opus" or stream.get("sample_rate") != "48000" or int(stream.get("channels", 0)) != 2:
        raise RuntimeError(f"Unexpected encoded format for {path}: {data}")
    return {
        "duration_ms": round(duration * 1000),
        "bytes": int(data["format"]["size"]),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
    }


def build(staging: Path, android_root: Path, web_root: Path) -> None:
    missing = [name for name in SOURCES.values() if not (staging / name).is_file()]
    if missing:
        raise FileNotFoundError(f"Missing staged Train Journey audio: {missing}")

    with tempfile.TemporaryDirectory() as temp_dir:
        temp = Path(temp_dir)
        departure = temp / "train_journey_departure_001.ogg"
        bed = temp / "train_journey_bed_001.ogg"
        arrival = temp / "train_journey_arrival_001.ogg"

        encode(
            [staging / SOURCES["doors"], staging / SOURCES["accelerate"]],
            departure,
            "[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=8.55:d=0.35[d];"
            "[1:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.35[a];"
            "[d][a]acrossfade=d=0.35:c1=qsin:c2=qsin[out]",
        )
        encode(
            [staging / SOURCES["bed"]],
            bed,
            "[0:a]aresample=48000,aformat=channel_layouts=stereo,highpass=f=25,"
            "afade=t=in:st=0:d=0.2,afade=t=out:st=240.2:d=0.4[out]",
        )
        encode(
            [staging / SOURCES["decelerate"]],
            arrival,
            "[0:a]aresample=48000,aformat=channel_layouts=stereo,"
            "afade=t=in:st=0:d=0.25,afade=t=out:st=31.7:d=0.45[out]",
        )

        outputs = [departure, bed, arrival]
        metadata = {}
        for built in outputs:
            info = probe(built)
            metadata[built.name] = info
            for root in (android_root, web_root):
                target = root / built.name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(built, target)
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
