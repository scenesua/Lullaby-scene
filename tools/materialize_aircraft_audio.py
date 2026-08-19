#!/usr/bin/env python3
"""Build the Passenger Aircraft Cabin cruise bed from verified CC0 source 853736.

The source is a two-minute stereo field recording. We intentionally avoid the
end of the take where the engine texture dwindles, then make one equal-power
cyclic overlap. No broadband denoising, mono fold-down, or aggressive EQ is
used.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

SOURCE_ID = "853736"
SOURCE_PAGE = f"https://freesound.org/people/jasonm911/sounds/{SOURCE_ID}/"
USER_AGENT = "Lullaby-Scene-audio-materializer/2.0"


def resolve_hq_ogg() -> str:
    request = urllib.request.Request(SOURCE_PAGE, headers={"User-Agent": USER_AGENT})
    page = urllib.request.urlopen(request, timeout=45).read().decode("utf-8", "replace")
    page = html.unescape(page).replace("\\/", "/")
    patterns = [
        rf'https://cdn\.freesound\.org/previews/853/{SOURCE_ID}_[^"\'<>\s]+-hq\.ogg',
        rf'https://freesound\.org/data/previews/853/{SOURCE_ID}_[^"\'<>\s]+-hq\.ogg',
    ]
    for pattern in patterns:
        match = re.search(pattern, page)
        if match:
            return match.group(0)
    raise RuntimeError(f"Could not resolve Freesound {SOURCE_ID} HQ OGG preview")


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def probe(path: Path) -> dict:
    return json.loads(
        subprocess.check_output(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "stream=codec_name,sample_rate,channels",
                "-show_entries", "format=duration,size,bit_rate",
                "-of", "json", str(path),
            ],
            text=True,
        )
    )


def build(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temp:
        source = Path(temp) / "source.ogg"
        url = resolve_hq_ogg()
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=90) as response, source.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                handle.write(chunk)
        if source.stat().st_size < 500_000:
            raise RuntimeError(f"Downloaded preview is unexpectedly small: {source.stat().st_size}")

        # Keep 10s..95s of the calm take. The 10s..16s head is crossfaded with
        # 89s..95s and placed at the file end; playback therefore crosses from
        # the end of that overlap directly into the original 16s point.
        filter_complex = (
            "[0:a]atrim=start=16:end=89,asetpts=PTS-STARTPTS[mid];"
            "[0:a]atrim=start=89:end=95,asetpts=PTS-STARTPTS[tail];"
            "[0:a]atrim=start=10:end=16,asetpts=PTS-STARTPTS[head];"
            "[tail][head]acrossfade=d=6:c1=qsin:c2=qsin[xf];"
            "[mid][xf]concat=n=2:v=0:a=1[out]"
        )
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source),
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-ar", "48000", "-ac", "2",
            "-c:a", "libopus", "-b:a", "128k", "-vbr", "on", "-compression_level", "10",
            str(output),
        )

    info = probe(output)
    stream = info["streams"][0]
    fmt = info["format"]
    duration = float(fmt["duration"])
    size = int(fmt["size"])
    if stream.get("codec_name") != "opus":
        raise RuntimeError(info)
    if stream.get("sample_rate") != "48000" or int(stream.get("channels", 0)) != 2:
        raise RuntimeError(info)
    if not 78.8 <= duration <= 79.2:
        raise RuntimeError(f"Unexpected loop duration: {duration}")
    if size < 850_000:
        raise RuntimeError(f"Encoded loop is unexpectedly small: {size}")
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(json.dumps({
        "source_id": SOURCE_ID,
        "source_page": SOURCE_PAGE,
        "duration_seconds": duration,
        "bytes": size,
        "sha256": digest,
        "channels": 2,
        "sample_rate": 48000,
        "codec": "opus",
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
