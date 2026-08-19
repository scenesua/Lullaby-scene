#!/usr/bin/env python3
"""Materialize the Passenger Aircraft taxi bed from Freesound 627056.

The processing profile was chosen after inspecting the WAV supplied in chat:
48 kHz, 24-bit stereo, 295.402 s. We keep the natural level/stereo field and
use a stable 50..230 s region. The only loop treatment is a 180 ms equal-power
bridge; there is no loudness normalisation, denoise, EQ notch bank or widening.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

SOURCE_ID = "627056"
SOURCE_PAGE = f"https://freesound.org/s/{SOURCE_ID}/"
USER_AGENT = "Lullaby-Scene-aircraft-taxi-materializer/1.0"
EXPECTED_DURATION_SECONDS = 180.18


def resolve_hq_ogg() -> str:
    override = os.environ.get("AIRCRAFT_TAXI_SOURCE_URL", "").strip()
    if override:
        if SOURCE_ID not in override or not re.search(r"\.(?:ogg|mp3)(?:\?|$)", override, re.I):
            raise RuntimeError(f"Resolved preview does not belong to Freesound {SOURCE_ID}: {override}")
        return override

    request = urllib.request.Request(SOURCE_PAGE, headers={"User-Agent": USER_AGENT})
    page = urllib.request.urlopen(request, timeout=45).read().decode("utf-8", "replace")
    page = html.unescape(page).replace("\\/", "/").replace("\\u002F", "/").replace("\\u003A", ":")
    candidates = re.findall(r"[^\"'<>\s]*627056[^\"'<>\s]*\.(?:ogg|mp3)(?:\?[^\"'<>\s]*)?", page, re.I)
    for candidate in candidates:
        candidate = candidate.rstrip("\\,]")
        if "hq" not in candidate.lower():
            continue
        if candidate.startswith("//"):
            candidate = "https:" + candidate
        elif candidate.startswith("/"):
            candidate = urllib.parse.urljoin(SOURCE_PAGE, candidate)
        if candidate.startswith(("http://", "https://")):
            return candidate
    raise RuntimeError(f"Could not resolve Freesound {SOURCE_ID} HQ preview")


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def probe(path: Path) -> dict:
    return json.loads(subprocess.check_output([
        "ffprobe", "-v", "error",
        "-show_entries", "stream=codec_name,sample_rate,channels",
        "-show_entries", "format=duration,size,bit_rate",
        "-of", "json", str(path),
    ], text=True))


def build(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "source.ogg"
        request = urllib.request.Request(resolve_hq_ogg(), headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=90) as response, source.open("wb") as handle:
            while chunk := response.read(1024 * 1024):
                handle.write(chunk)
        if source.stat().st_size < 1_000_000:
            raise RuntimeError(f"Downloaded preview is unexpectedly small: {source.stat().st_size}")

        # body: 50.00..230.00 s from the supplied recording
        # bridge: 230.00..230.18 fades into 49.82..50.00 s. The bridge ends at
        # exactly the source point where the encoded file begins, so end->start
        # is continuous without the old five-second overlapping drone.
        filter_complex = (
            "[0:a]highpass=f=20,asplit=3[a][b][c];"
            "[a]atrim=start=50:end=230,asetpts=PTS-STARTPTS[body];"
            "[b]atrim=start=230:end=230.18,asetpts=PTS-STARTPTS,"
            "afade=t=out:st=0:d=0.18:curve=qsin[tail];"
            "[c]atrim=start=49.82:end=50,asetpts=PTS-STARTPTS,"
            "afade=t=in:st=0:d=0.18:curve=qsin[head];"
            "[tail][head]amix=inputs=2:duration=longest:normalize=0[bridge];"
            "[body][bridge]concat=n=2:v=0:a=1[out]"
        )
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source), "-filter_complex", filter_complex, "-map", "[out]",
            "-ar", "48000", "-ac", "2", "-c:a", "libopus", "-b:a", "112k",
            "-vbr", "on", "-compression_level", "10", str(output),
        )

    info = probe(output)
    stream = info["streams"][0]
    fmt = info["format"]
    duration = float(fmt["duration"])
    size = int(fmt["size"])
    if stream.get("codec_name") != "opus" or stream.get("sample_rate") != "48000" or int(stream.get("channels", 0)) != 2:
        raise RuntimeError(info)
    if not 179.9 <= duration <= 180.5:
        raise RuntimeError(f"Unexpected taxi loop duration: {duration}")
    if size < 1_500_000:
        raise RuntimeError(f"Encoded taxi loop is unexpectedly small: {size}")
    print(json.dumps({
        "source_id": SOURCE_ID,
        "source_page": SOURCE_PAGE,
        "duration_seconds": duration,
        "bytes": size,
        "sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "channels": 2,
        "sample_rate": 48000,
        "codec": "opus",
        "processing": "20 Hz HPF; stable 50..230 s body; 180 ms circular equal-power bridge; no loudness-normalization/denoise/EQ/widening",
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
