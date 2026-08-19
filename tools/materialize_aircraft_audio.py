#!/usr/bin/env python3
"""Build the Passenger Aircraft Cabin bed from Freesound 853735.

The source matches the 2-minute 44.1 kHz stereo WAV supplied for the project.
The uploaded WAV was analysed locally before these processing values were set.
We keep its natural level and stereo field, remove only two persistent narrow
whistles, and construct a circular equal-power loop. No broadband denoising,
mono fold-down, loudness normalisation, synthetic rumble, or widening is used.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

SOURCE_ID = "853735"
SOURCE_PAGE = f"https://freesound.org/people/jasonm911/sounds/{SOURCE_ID}/"
USER_AGENT = "Lullaby-Scene-audio-materializer/3.0"
EXPECTED_DURATION_SECONDS = 105.0


def resolve_hq_ogg() -> str:
    request = urllib.request.Request(SOURCE_PAGE, headers={"User-Agent": USER_AGENT})
    page = urllib.request.urlopen(request, timeout=45).read().decode("utf-8", "replace")
    page = (
        html.unescape(page)
        .replace("\\/", "/")
        .replace("\\u002F", "/")
        .replace("\\u003A", ":")
    )
    candidates = re.findall(r"[^\"'<>\\s]*853735[^\"'<>\\s]*\.ogg(?:\?[^\"'<>\\s]*)?", page)
    for candidate in candidates:
        candidate = candidate.rstrip("\\,]")
        if "hq" not in candidate.lower():
            continue
        if candidate.startswith("//"):
            candidate = "https:" + candidate
        elif candidate.startswith("/"):
            candidate = urllib.parse.urljoin(SOURCE_PAGE, candidate)
        if candidate.startswith("http://") or candidate.startswith("https://"):
            return candidate
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

        # The supplied WAV contains persistent narrow tones around 10.544 kHz
        # and 3.574 kHz. Notch only those tones; do not raise the noise floor.
        #
        # Circular loop construction:
        #   body   = original 10s..110s
        #   bridge = 110s..115s faded into 5s..10s
        # The bridge finishes immediately before the body's first sample in the
        # original recording, so the encoded end -> start boundary is natural.
        filter_complex = (
            "[0:a]highpass=f=20,"
            "equalizer=f=10544:t=q:w=12:g=-11,"
            "equalizer=f=3574:t=q:w=10:g=-5,asplit=3[a][b][c];"
            "[a]atrim=start=10:end=110,asetpts=PTS-STARTPTS[body];"
            "[b]atrim=start=110:end=115,asetpts=PTS-STARTPTS,"
            "afade=t=out:st=0:d=5:curve=qsin[tail];"
            "[c]atrim=start=5:end=10,asetpts=PTS-STARTPTS,"
            "afade=t=in:st=0:d=5:curve=qsin[head];"
            "[tail][head]amix=inputs=2:duration=longest:normalize=0[bridge];"
            "[body][bridge]concat=n=2:v=0:a=1[out]"
        )
        run(
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(source),
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-ar", "48000", "-ac", "2",
            "-c:a", "libopus", "-b:a", "112k", "-vbr", "on", "-compression_level", "10",
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
    if not 104.8 <= duration <= 105.2:
        raise RuntimeError(f"Unexpected loop duration: {duration}")
    if size < 900_000:
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
        "processing": "20 Hz HPF; narrow -11 dB @ 10.544 kHz; narrow -5 dB @ 3.574 kHz; 5 s circular equal-power bridge; no loudnorm",
    }, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
