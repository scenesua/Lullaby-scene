#!/usr/bin/env python3
"""prepare_sound_library.py

Development-only tool that turns raw sound files and archives dropped into
`sound_effect_library/` into the packaged Android asset library at
`app/src/main/assets/ambience/`.

Responsibilities
----------------
1.  Scan the whole `sound_effect_library/` tree (including `inbox/`).
2.  Find ZIP / 7Z / RAR archives and extract them safely (zip-slip guard).
3.  Validate audio files (ffprobe, with a header-based fallback).
4.  Classify every file into a category and continuous/event/hybrid kind.
5.  Deduplicate by SHA-256 + size.
6.  Normalize file names to short safe names.
7.  Generate distribution OGG assets with ffmpeg (kept out of the repo).
8.  Generate sound_library.json, category_presets.json, licenses.json.
9.  Copy everything into app/src/main/assets/ambience/.
10. Delete archives that completed the whole pipeline; preserve failures in
    sound_effect_library/failed_archives/ with a reason file.

Only standard library Python is required. ffmpeg/ffprobe are used when present;
7z/rar support is enabled only when the corresponding external program is
available on PATH. numpy speeds up the loop-candidate analysis when installed.

Usage
-----
    python tools/prepare_sound_library.py [--root sound_effect_library]
        [--assets app/src/main/assets/ambience]
        [--ffmpeg PATH] [--ffprobe PATH]
        [--verified-only]        # exclude license_status != verified from assets
        [--dry-run]              # do not delete archives or write assets
        [--make-loop-candidates] # only: build seamless loop candidates for
                                 # continuous beds into sound_effect_library/
                                 # loop_candidates/ (reads the master library,
                                 # writes nothing else; Ogg Vorbis q:a 5)
        [--loop-candidates-dir PATH]
        [--deploy-loops]         # analyze continuous masters, select verified
                                 # loop assets and stage an Android library
        [--loop-staging-dir PATH]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import wave
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SUPPORTED_AUDIO_EXTS = {".ogg", ".oga", ".wav", ".mp3", ".flac", ".m4a", ".aac", ".opus", ".aiff", ".aif"}
ARCHIVE_EXTS = {".zip", ".7z", ".rar"}

CATEGORIES = [
    "rain", "thunder", "wind", "ocean", "stream", "fire", "forest",
    "birds", "crickets", "cafe", "city", "train", "fan", "ventilation",
    "water", "miscellaneous",
]
KINDS = ["continuous", "event", "hybrid"]

# category -> keyword list (matched against file name, folder names, archive name)
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "rain": ["rain", "rainfall", "drizzle", "downpour", "raindrop", "precip"],
    "thunder": ["thunder", "storm", "rumble", "lightning"],
    "wind": ["wind", "gust", "breeze", "blizzard", "stormwind"],
    "ocean": ["ocean", "wave", "sea", "surf", "beach", "tide", "shore"],
    "stream": ["stream", "river", "creek", "brook", "waterfall", "flow", "watersplash", "water-splash"],
    "fire": ["fire", "fireplace", "crackle", "campfire", "hearth", "bonfire", "flame"],
    "forest": ["forest", "woods", "jungle", "wildlife"],
    "birds": ["bird", "songbird", "birdcall", "chirp", "owl", "robin"],
    "crickets": ["cricket", "insect", "grasshopper", "cicada", "nightbug", "night-insect"],
    "cafe": ["cafe", "coffee", "restaurant", "barista", "bistro", "coffeeshop"],
    "city": ["city", "traffic", "street", "urban", "town", "cars", "highway"],
    "train": ["train", "railway", "railroad", "rail", "subway", "metro", "locomotive"],
    "fan": ["fan", "ceilingfan", "boxfan"],
    "ventilation": ["ventilation", "vent", "aircon", "air_conditioner", "airconditioner", "hvac", "acunit", "air-conditioner"],
    "water": ["water", "drip", "splash", "aquarium", "puddle", "droplet", "waterfall-splash"],
    "miscellaneous": ["ambience", "ambient", "roomtone", "atmosphere", "noise", "loop", "sfx"],
}

# event-ish keywords (a file containing these is more likely an event sound)
EVENT_KEYWORDS = [
    "thunder", "crackle", "pop", "bird", "chirp", "owl", "drip", "splash",
    "droplet", "click", "clatter", "cup", "dish", "passing", "horn", "gust",
    "knock", "bark", "insect", "cicada",
]
CONTINUOUS_KEYWORDS = ["loop", "ambience", "background", "continuous", "roomtone", "bed"]

# source display-name keys in the app strings, and conservative default volumes
SOURCE_DEFAULTS = {
    "rain": ("source_rain", 0.35),
    "thunder": ("source_thunder", 0.30),
    "wind": ("source_wind", 0.35),
    "ocean": ("source_ocean", 0.35),
    "stream": ("source_stream", 0.30),
    "fire": ("source_fire", 0.35),
    "forest": ("source_forest", 0.30),
    "birds": ("source_birds", 0.30),
    "crickets": ("source_crickets", 0.30),
    "cafe": ("source_cafe", 0.30),
    "city": ("source_city", 0.30),
    "train": ("source_train", 0.35),
    "fan": ("source_fan", 0.40),
    "ventilation": ("source_ventilation", 0.40),
    "water": ("source_water", 0.35),
    "miscellaneous": ("source_miscellaneous", 0.30),
}

EVENT_INTERVALS = {
    "rain": (20, 90, "low"),
    "thunder": (30, 180, "low"),
    "wind": (25, 120, "low"),
    "ocean": (60, 300, "low"),
    "stream": (15, 60, "medium"),
    "fire": (1, 8, "medium-high"),
    "forest": (8, 40, "medium"),
    "birds": (4, 25, "medium"),
    "crickets": (3, 15, "medium-high"),
    "cafe": (20, 90, "low"),
    "city": (15, 60, "medium"),
    "train": (45, 240, "low"),
    "fan": (60, 600, "low"),
    "ventilation": (60, 600, "low"),
    "water": (2, 12, "high"),
    "miscellaneous": (10, 60, "medium"),
}
DEFAULT_INTERVAL = (10, 60, "medium")

LIBRARY_VERSION = 1

NORMALIZED_RE = re.compile(
    r"^(?P<cat>[a-z]+)_(?P<kind>continuous|event|hybrid|[ceh])_(?P<num>\d{3})\.(?P<ext>[a-z0-9]+)$"
)


# ---------------------------------------------------------------------------
# Logging / helpers
# ---------------------------------------------------------------------------

def log(msg: str) -> None:
    print(msg, flush=True)


def warn(msg: str) -> None:
    print(f"[warn] {msg}", flush=True)


def error(msg: str) -> None:
    print(f"[error] {msg}", flush=True)


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def find_program(candidates: list[str]) -> Optional[str]:
    for name in candidates:
        found = shutil.which(name)
        if found:
            return found
    return None


def safe_short_temp(prefix: str = "AMB") -> Path:
    """Short temp path (Windows long-path safety), e.g. %TEMP%\\AMB\\job_0001."""
    base = Path(tempfile.gettempdir()) / prefix
    base.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(prefix="job_", dir=str(base)))


@dataclass
class AudioInfo:
    duration_ms: float = 0.0
    sample_rate: int = 0
    channels: int = 0
    codec: str = ""
    bit_rate: Optional[int] = None


def probe_audio(path: Path, ffprobe: Optional[str]) -> Optional[AudioInfo]:
    if ffprobe:
        try:
            out = subprocess.run(
                [ffprobe, "-v", "quiet", "-print_format", "json",
                 "-show_format", "-show_streams", str(path)],
                capture_output=True, text=True, timeout=120,
            )
            if out.returncode == 0:
                data = json.loads(out.stdout)
                fmt = data.get("format", {})
                dur = float(fmt.get("duration", "0") or 0)
                info = AudioInfo(duration_ms=dur * 1000.0)
                streams = data.get("streams", [])
                audio_streams = [s for s in streams if s.get("codec_type") == "audio"]
                if audio_streams:
                    s = audio_streams[0]
                    info.codec = s.get("codec_name", "")
                    info.sample_rate = int(s.get("sample_rate", "0") or 0)
                    info.channels = int(s.get("channels", "0") or 0)
                    br = s.get("bit_rate") or fmt.get("bit_rate")
                    info.bit_rate = int(br) if br else None
                return info
        except (subprocess.TimeoutExpired, OSError, ValueError, json.JSONDecodeError) as e:
            warn(f"ffprobe failed for {path}: {e}")
    return probe_audio_basic(path)


def probe_audio_basic(path: Path) -> Optional[AudioInfo]:
    """Minimal header-based validation when ffprobe is unavailable."""
    ext = path.suffix.lower()
    try:
        if ext == ".wav":
            with wave.open(str(path), "rb") as w:
                frames = w.getnframes()
                rate = w.getframerate()
                return AudioInfo(
                    duration_ms=frames * 1000.0 / rate if rate else 0.0,
                    sample_rate=rate,
                    channels=w.getnchannels(),
                    codec="pcm",
                )
        if ext in (".ogg", ".oga"):
            with open(path, "rb") as f:
                if f.read(4) != b"OggS":
                    return None
            return AudioInfo(duration_ms=0.0)
        if ext == ".mp3":
            with open(path, "rb") as f:
                head = f.read(3)
            if head != b"ID3" and (head[0] != 0xFF or (head[1] & 0xE0) != 0xE0):
                return None
            return AudioInfo(duration_ms=0.0)
        if ext == ".flac":
            with open(path, "rb") as f:
                if f.read(4) != b"fLaC":
                    return None
            return AudioInfo(duration_ms=0.0)
    except (wave.Error, OSError, EOFError):
        return None
    return AudioInfo(duration_ms=0.0) if path.stat().st_size > 0 else None


# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

def classify_category(candidates: list[str]) -> str:
    """Return category id based on keywords in file/folder/archive names."""
    text = " ".join(candidates).lower().replace("_", " ").replace("-", " ")
    # avoid false positives: 'watersplash' must hit water/stream before 'water' generic
    if "watersplash" in text or "water-splash" in text:
        return "stream"
    best: Optional[str] = None
    best_hits = 0
    for cat, kws in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in kws if kw in text)
        if hits > best_hits:
            best, best_hits = cat, hits
        elif hits == best_hits and hits > 0 and best is None:
            best = cat
    if best_hits == 0:
        return "unclassified"
    # disambiguation heuristics
    if "water" in text and "fall" in text and best in ("water", "stream"):
        return "stream"
    if "storm" in text and ("thunder" in text or "lightning" in text):
        return "thunder"
    return best


def classify_kind(filename: str, folder_names: list[str]) -> str:
    text = " ".join([filename] + folder_names).lower()
    if "event" in folder_names:
        return "event"
    if "continuous" in folder_names:
        return "continuous"
    if "hybrid" in folder_names:
        return "hybrid"
    if any(kw in text for kw in EVENT_KEYWORDS):
        return "event"
    if any(kw in text for kw in CONTINUOUS_KEYWORDS):
        return "continuous"
    return "hybrid"


# ---------------------------------------------------------------------------
# Archive handling
# ---------------------------------------------------------------------------

@dataclass
class ExtractedFile:
    path: Path
    archive_name: str
    member_name: str


def extract_archive(archive: Path, dest: Path, tool: str) -> tuple[list[ExtractedFile], str]:
    """Extract safely. Returns (files, error_reason). Never follows zip-slip."""
    ext = archive.suffix.lower()
    if ext == ".zip":
        try:
            with zipfile.ZipFile(archive) as zf:
                infos = zf.infolist()
                out = []
                for info in infos:
                    name = info.filename
                    target = (dest / name).resolve()
                    if not str(target).startswith(str(dest.resolve()) + os.sep) and target != dest.resolve():
                        return [], f"unsafe path in archive: {name}"
                    if info.is_dir():
                        continue
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src, open(target, "wb") as dst:
                        shutil.copyfileobj(src, dst, length=1 << 20)
                    out.append(ExtractedFile(target, archive.name, name))
                return out, ""
        except (zipfile.BadZipFile, OSError, RuntimeError) as e:
            return [], f"corrupt or unsupported zip: {e}"
    if ext in (".7z", ".rar"):
        if not tool:
            return [], f"{ext.upper()} support requires an external tool (7z/7za/unrar) which is not installed; archive preserved"
        try:
            res = subprocess.run([tool, "x", "-y", f"-o{dest}", str(archive)],
                                 capture_output=True, text=True, timeout=600)
            if res.returncode != 0:
                return [], f"extraction failed: {res.stderr.strip()[:300] or res.stdout.strip()[:300]}"
        except (subprocess.TimeoutExpired, OSError) as e:
            return [], f"extraction error: {e}"
        out = []
        for p in dest.rglob("*"):
            if p.is_file():
                rel = str(p.relative_to(dest)).replace("\\", "/")
                out.append(ExtractedFile(p, archive.name, rel))
        return out, ""
    return [], "unsupported archive type"


# ---------------------------------------------------------------------------
# Master library + dedup
# ---------------------------------------------------------------------------

@dataclass
class LibraryEntry:
    category: str
    kind: str
    source_path: Path          # master library file
    original_name: str
    original_archive: Optional[str]
    license_status: str
    sha256: str
    size: int
    audio: AudioInfo = field(default_factory=AudioInfo)


def adopt_master_library(master_root: Path, ffprobe: Optional[str]) -> list[LibraryEntry]:
    """Files that were already normalized by a previous run live in
    sound_effect_library/library/<category>/<kind>/<cat>_<c|e|h>_NNN.ext."""
    entries: list[LibraryEntry] = []
    if not master_root.is_dir():
        return entries
    for cat_dir in master_root.iterdir():
        if not cat_dir.is_dir() or cat_dir.name not in CATEGORIES and cat_dir.name != "unclassified":
            continue
        cat = "miscellaneous" if cat_dir.name == "unclassified" else cat_dir.name
        for kind_dir in cat_dir.iterdir():
            if not kind_dir.is_dir() or kind_dir.name not in KINDS:
                continue
            for f in kind_dir.iterdir():
                if not f.is_file():
                    continue
                m = NORMALIZED_RE.match(f.name)
                if not m or m.group("cat") != cat_dir.name or m.group("kind")[0] != kind_dir.name[0]:
                    continue
                info = probe_audio(f, ffprobe)
                if info is None:
                    warn(f"skipping unreadable master file: {f}")
                    continue
                entries.append(LibraryEntry(
                    category=cat,
                    kind=kind_dir.name,
                    source_path=f,
                    original_name=f.name,
                    original_archive=None,
                    license_status="unknown",
                    sha256=sha256_of(f),
                    size=f.stat().st_size,
                    audio=info,
                ))
    return entries


def move_to_master(entry_path: Path, category: str, kind: str, master_root: Path,
                   archive_name: Optional[str], ffprobe: Optional[str]) -> tuple[LibraryEntry, str]:
    """Move a loose/extracted file into the master library with a normalized name."""
    kind_dir = master_root / category / kind
    kind_dir.mkdir(parents=True, exist_ok=True)
    # find next free number, starting at 001, reusing gaps is not required
    taken = {NORMALIZED_RE.match(p.name).group("num") for p in kind_dir.iterdir()
             if p.is_file() and NORMALIZED_RE.match(p.name)}
    num = 1
    while f"{num:03d}" in taken:
        num += 1
    ext = entry_path.suffix.lower() or ".bin"
    new_name = f"{category}_{kind[0]}_{num:03d}{ext}"
    dest = kind_dir / new_name
    shutil.move(str(entry_path), str(dest))
    return (LibraryEntry(
        category=category,
        kind=kind,
        source_path=dest,
        original_name=entry_path.name,
        original_archive=archive_name,
        license_status="unknown",
        sha256=sha256_of(dest),
        size=dest.stat().st_size,
        audio=probe_audio(dest, ffprobe) or AudioInfo(),
    ), new_name)


def dedup_entries(entries: list[LibraryEntry]) -> tuple[list[LibraryEntry], list[dict]]:
    """SHA-256 dedup. Returns (unique_entries, duplicate_report_rows)."""
    by_hash: dict[str, LibraryEntry] = {}
    duplicates: list[dict] = []
    for e in entries:
        existing = by_hash.get(e.sha256)
        if existing is None:
            by_hash[e.sha256] = e
        else:
            duplicates.append({
                "sha256": e.sha256,
                "kept": str(existing.source_path),
                "removed": str(e.source_path),
                "kept_size": existing.size,
                "removed_size": e.size,
            })
            e.source_path.unlink(missing_ok=True)
    return list(by_hash.values()), duplicates


# ---------------------------------------------------------------------------
# Distribution assets
# ---------------------------------------------------------------------------

@dataclass
class AssetResult:
    asset_id: str
    rel_path: str          # relative to assets dir, e.g. ambience/rain/continuous/rain_c_001.ogg
    duration_ms: float
    license_ok: bool
    error: Optional[str] = None


def transcode(src: Path, dst: Path, ffmpeg: Optional[str], ffprobe: Optional[str],
              info: AudioInfo) -> tuple[Optional[Path], str]:
    """Create OGG. Returns (output_path, error)."""
    if ffmpeg:
        sr = info.sample_rate if 0 < info.sample_rate <= 48000 else 48000
        cmd = [ffmpeg, "-y", "-v", "error", "-i", str(src),
               "-c:a", "libvorbis", "-q:a", "4"]
        if sr and sr != info.sample_rate:
            cmd += ["-ar", str(sr)]
        cmd.append(str(dst))
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            if res.returncode == 0 and dst.exists() and dst.stat().st_size > 0:
                out_info = probe_audio(dst, ffprobe)
                if out_info and abs(out_info.duration_ms - info.duration_ms) > max(500, info.duration_ms * 0.05):
                    return None, f"duration mismatch after transcode ({info.duration_ms:.0f} -> {out_info.duration_ms:.0f} ms)"
                return dst, ""
            return None, (res.stderr or res.stdout or "ffmpeg failed").strip()[:400]
        except (subprocess.TimeoutExpired, OSError) as e:
            return None, f"ffmpeg error: {e}"
    return None, "no ffmpeg available; cannot generate OGG"


def build_assets(entries: list[LibraryEntry], assets_dir: Path, ffmpeg: Optional[str],
                 ffprobe: Optional[str], verified_only: bool) -> tuple[list[AssetResult], list[str]]:
    """Write distribution assets (OGG). Returns (assets, errors)."""
    assets: list[AssetResult] = []
    errors: list[str] = []
    for e in entries:
        license_ok = e.license_status == "verified" or not verified_only
        if not license_ok:
            continue
        dest_dir = assets_dir / e.category / ("events" if e.kind == "event" else "continuous")
        dest_dir.mkdir(parents=True, exist_ok=True)
        asset_id = f"{e.category}_{e.kind[0]}_{int(e.source_path.stem.split('_')[-1]):03d}"
        dst_ogg = dest_dir / f"{asset_id}.ogg"
        if dst_ogg.exists():
            info = probe_audio(dst_ogg, ffprobe)
            assets.append(AssetResult(asset_id, f"ambience/{e.category}/{dst_ogg.parent.name}/{dst_ogg.name}",
                                      info.duration_ms if info else e.audio.duration_ms, license_ok))
            continue
        out, err = transcode(e.source_path, dst_ogg, ffmpeg, ffprobe, e.audio)
        if err:
            errors.append(f"{e.source_path}: {err}")
            warn(f"transcode failed for {e.source_path}: {err}")
            continue
        info = probe_audio(out, ffprobe) if out else e.audio
        assets.append(AssetResult(
            asset_id,
            f"ambience/{e.category}/{dst_ogg.parent.name}/{dst_ogg.name}",
            info.duration_ms if info else 0.0,
            license_ok,
        ))
        log(f"[asset] {assets[-1].rel_path} ({assets[-1].duration_ms:.0f} ms, from {e.original_name})")
    return assets, errors


# ---------------------------------------------------------------------------
# Manifests
# ---------------------------------------------------------------------------

def write_manifests(assets: list[AssetResult], entries: list[LibraryEntry],
                    manifest_dir: Path) -> tuple[bool, str]:
    by_asset_id = {a.asset_id: a for a in assets}
    entries_by_asset = {}
    for e in entries:
        num = int(e.source_path.stem.split("_")[-1])
        entries_by_asset[f"{e.category}_{e.kind[0]}_{num:03d}"] = e

    sources = []
    for cat in CATEGORIES:
        cat_assets = [a for a in assets if a.rel_path.startswith(f"ambience/{cat}/")]
        if not cat_assets:
            continue
        display_key, default_vol = SOURCE_DEFAULTS.get(cat, (f"source_{cat}", 0.30))
        continuous, events = [], []
        for a in sorted(cat_assets, key=lambda x: x.asset_id):
            entry = {
                "asset_id": a.asset_id,
                "path": a.rel_path,
                "duration_ms": int(a.duration_ms),
            }
            if a.rel_path.split("/")[2] == "events":
                events.append(entry)
            else:
                continuous.append(entry)
        sources.append({
            "id": cat,
            "category": {"rain": "nature", "thunder": "nature", "wind": "nature", "ocean": "nature",
                         "stream": "nature", "fire": "indoor", "forest": "nature", "birds": "nature",
                         "crickets": "nature", "cafe": "indoor", "city": "travel", "train": "travel",
                         "fan": "indoor", "ventilation": "indoor", "water": "other",
                         "miscellaneous": "other"}.get(cat, "other"),
            "display_name_key": display_key,
            "default_volume": default_vol,
            "continuous": continuous,
            "events": events,
        })

    library = {"version": LIBRARY_VERSION, "sources": sources}

    presets = {"version": LIBRARY_VERSION, "categories": {}}
    for cat in CATEGORIES:
        mn, mx, density = EVENT_INTERVALS.get(cat, DEFAULT_INTERVAL)
        presets["categories"][cat] = {
            "min_interval_seconds": mn,
            "max_interval_seconds": mx,
            "density": density,
            "event_volume_range": [0.75, 1.0],
            "event_pan_range": [-0.6, 0.6],
        }

    licenses = {"version": LIBRARY_VERSION, "entries": []}
    for a in sorted(assets, key=lambda x: x.asset_id):
        e = entries_by_asset.get(a.asset_id)
        licenses["entries"].append({
            "asset_id": a.asset_id,
            "source_name": None,
            "creator": None,
            "source_page": None,
            "license": None,
            "license_status": e.license_status if e else "unknown",
            "attribution_required": False,
            "original_filename": e.original_name if e else a.asset_id,
            "original_archive": e.original_archive if e else None,
        })

    try:
        manifest_dir.mkdir(parents=True, exist_ok=True)
        (manifest_dir / "sound_library.json").write_text(
            json.dumps(library, ensure_ascii=False, indent=2), encoding="utf-8")
        (manifest_dir / "category_presets.json").write_text(
            json.dumps(presets, ensure_ascii=False, indent=2), encoding="utf-8")
        (manifest_dir / "licenses.json").write_text(
            json.dumps(licenses, ensure_ascii=False, indent=2), encoding="utf-8")
        return True, ""
    except OSError as e:
        return False, f"failed to write manifests: {e}"


# ---------------------------------------------------------------------------
# Loop candidate generation  (--make-loop-candidates)
# ---------------------------------------------------------------------------

try:
    import numpy as _np
except ImportError:  # keep the rest of the tool stdlib-only
    _np = None

np = _np  # loop-candidate generation requires numpy (checked before use)

# Sources whose beds are steady enough for seamless equal-power loops.
# Variable beds (waves / cafe / city ...) keep natural variation and are
# selected as clean crossfade-ready segments instead of forced loops.
LOOP_STEADY_SOURCES = {"fan", "ventilation", "rain"}
LOOP_VARIABLE_SOURCES = {"ocean", "stream", "cafe", "city", "train", "wind", "fire"}
LOOP_TARGET_SOURCES = LOOP_STEADY_SOURCES | LOOP_VARIABLE_SOURCES
# event-like beds that must NOT be looped (bird calls, crickets, crackles)
LOOP_SKIP_SOURCES = {"birds", "crickets", "thunder", "water", "miscellaneous", "unclassified"}

LOOP_MIN_DURATION_S = 8.0        # skip files shorter than this (would stutter)
LOOP_TARGET_MS = 360_000         # steady sounds: 5-10 min distribution loops
LOOP_MAX_MS = 600_000
LOOP_MAX_CANDIDATES_PER_SOURCE = 3
LOOP_WINDOW_MS = 100             # analysis hop
LOOP_STABLE_SPAN = 50            # ±2.5 s context for local deviation
LOOP_STABLE_DEV = {"steady": 0.45, "variable": 0.75}   # max local RMS deviation
LOOP_BOUNDARY_MAX = (0.40, 0.10, 0.25)   # rms_diff, zcr_diff, low_diff
LOOP_FADE_MS = 2000              # equal-power crossfade length (steady beds)
LOOP_SAMPLE_PASS_SECONDS = 5     # each listening pass: 5 s tail + 5 s head
LOOP_SAMPLE_PASSES = 3           # 3 passes -> 30 s sample
LOOP_SILENCE_FLOOR = 1e-4        # -80 dBFS absolute RMS floor
LOOP_MAX_SEGMENT_S = 120.0       # natural-segment cap for variable beds
LOOP_ANTICLIP_GAIN = 0.85


def _decode_pcm(path: Path, ffmpeg: str, channels: int, sample_rate: int) -> Optional[np.ndarray]:
    """Decode the whole file to interleaved int16 PCM at the source rate."""
    cmd = [ffmpeg, "-v", "error", "-i", str(path),
           "-f", "s16le", "-c:a", "pcm_s16le",
           "-ac", str(channels), "-ar", str(sample_rate), "-"]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=3600)
    except (subprocess.TimeoutExpired, OSError) as e:
        warn(f"decode failed for {path.name}: {e}")
        return None
    if res.returncode != 0 or not res.stdout:
        warn(f"decode failed for {path.name}: {(res.stderr or res.stdout or b'').decode(errors='replace')[:200]}")
        return None
    return np.frombuffer(res.stdout, dtype=np.int16)


def _stream_mono(x16: np.ndarray, channels: int, sr: int) -> tuple[np.ndarray, float]:
    """Streaming mono mix + median windowed max-delta (low memory for long files)."""
    hop = max(1, int(sr * LOOP_WINDOW_MS / 1000))
    chunk_frames = int(60 * sr)
    chunks = []
    deltas = []
    for start in range(0, len(x16) // channels, chunk_frames):
        block = x16[start * channels: (start + chunk_frames) * channels].reshape(-1, channels)
        f = block.astype(np.float32) / 32768.0
        mono = f.mean(axis=1) if channels > 1 else f[:, 0]
        chunks.append(mono)
        dhop = int(sr * 0.25)
        n = (len(mono) // dhop) * dhop
        if n >= 2 * dhop:
            view = mono[:n].reshape(-1, dhop)
            deltas.append(np.max(np.abs(np.diff(view, axis=1)), axis=1))
    if not chunks:
        return np.zeros(0, dtype=np.float32), 0.0
    mono = np.concatenate(chunks)
    med = float(np.median(np.concatenate(deltas))) if deltas else 0.0
    return mono, med


def _window_features(x: np.ndarray, sr: int):
    """Windowed RMS, zero-crossing rate and low-band energy ratio."""
    hop = max(1, int(sr * LOOP_WINDOW_MS / 1000))
    n = (len(x) // hop) * hop
    x = x[:n]
    idx = np.arange(0, n, hop)
    sq = x * x
    rms = np.sqrt(np.add.reduceat(sq, idx) / hop)
    s = np.sign(x)
    s[s == 0] = 1
    zc = np.diff(s) != 0
    zc_pad = np.concatenate((zc.astype(np.float32), [0.0]))
    zcr = np.add.reduceat(zc_pad, idx) / hop
    k = 40
    csum = np.concatenate(([0.0], np.cumsum(x)))
    smooth = (csum[k:] - csum[:-k]) / k
    n2 = (len(smooth) // hop) * hop
    smooth = smooth[:n2]
    low_en = np.add.reduceat(smooth * smooth, np.arange(0, n2, hop)) / hop
    total_en = np.add.reduceat(sq[:n2], np.arange(0, n2, hop)) / hop
    low_ratio = low_en / np.maximum(total_en, 1e-12)
    return rms, zcr, low_ratio, hop


def _local_deviation(rms: np.ndarray, span: int) -> np.ndarray:
    """Relative local RMS spread (std / mean) over +/-span/2 windows."""
    n = len(rms)
    pre = np.concatenate(([0.0], np.cumsum(rms)))
    pre2 = np.concatenate(([0.0], np.cumsum(rms * rms)))
    half = span // 2
    a = np.maximum(0, np.arange(n) - half)
    b = np.minimum(n, np.arange(n) + half + 1)
    m = (pre[b] - pre[a]) / (b - a)
    v = (pre2[b] - pre2[a]) / (b - a) - m * m
    return np.sqrt(np.maximum(v, 0.0)) / np.maximum(m, 1e-9)


def _stable_runs(stable: np.ndarray, min_len_windows: int) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start = None
    for i, ok in enumerate(stable.tolist()):
        if ok and start is None:
            start = i
        elif not ok and start is not None:
            if i - start >= min_len_windows:
                runs.append((start, i))
            start = None
    if start is not None and len(stable) - start >= min_len_windows:
        runs.append((start, len(stable)))
    merged: list[tuple[int, int]] = []
    for s, e in runs:
        if merged and s - merged[-1][1] <= 5:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))
    return merged


def _edge_mean(arr: np.ndarray, i: int) -> float:
    lo, hi = max(0, i - 2), i + 3
    return float(np.mean(arr[lo:hi]))


def _boundary_stats(rms: np.ndarray, zcr: np.ndarray, low: np.ndarray, s: int, e: int) -> dict:
    rms_s, rms_e = _edge_mean(rms, s), _edge_mean(rms, e)
    zcr_s, zcr_e = _edge_mean(zcr, s), _edge_mean(zcr, e)
    low_s, low_e = _edge_mean(low, s), _edge_mean(low, e)
    mean_rms = float(np.mean(rms[s:e])) if e > s else 0.0
    return {
        "rms_diff": abs(rms_s - rms_e) / max(mean_rms, 1e-9),
        "zcr_diff": abs(zcr_s - zcr_e),
        "low_diff": abs(low_s - low_e),
        "rms_start": round(rms_s, 5),
        "rms_end": round(rms_e, 5),
    }


def _boundary_ok(b: dict) -> bool:
    rmax, zmax, lmax = LOOP_BOUNDARY_MAX
    return b["rms_diff"] <= rmax and b["zcr_diff"] <= zmax and b["low_diff"] <= lmax


def _equal_power_crossfade(seg: np.ndarray, fade: int) -> tuple[np.ndarray, float, str]:
    """Blend the segment tail into its head over `fade` samples (equal power).

    seg is (L, ch). loop = seg[:L-fade] + (tail*cos + head*sin); the wrapped
    seam lands on the head's natural sample step so no audible jump remains.
    """
    tail = seg[-fade:]
    head = seg[:fade]
    theta = np.linspace(0.0, np.pi / 2.0, fade, dtype=np.float32)
    mixed = tail * np.cos(theta)[:, None] + head * np.sin(theta)[:, None]
    note = ""
    peak = float(np.max(np.abs(mixed))) if fade else 0.0
    if peak > 0.999:
        mixed *= LOOP_ANTICLIP_GAIN
        note = "anti_clip_headroom"
    return np.concatenate((seg[:-fade], mixed), axis=0), float(np.max(np.abs(mixed))), note


def _tile(loop: np.ndarray, sr: int) -> tuple[np.ndarray, str]:
    """Repeat a seamless unit up to the 5-10 min target length."""
    if len(loop) >= int(LOOP_TARGET_MS / 1000 * sr):
        return loop, "unit"
    tiles = max(2, int(np.ceil(LOOP_TARGET_MS / 1000 * sr / len(loop))))
    if tiles * len(loop) > int(LOOP_MAX_MS / 1000 * sr):
        tiles = max(2, int(int(LOOP_MAX_MS / 1000 * sr) // len(loop)))
    return np.concatenate([loop] * tiles, axis=0), f"tiled_x{tiles}"


def _trim_edges(x: np.ndarray, rms: np.ndarray, hop: int, level_floor: float) -> tuple[int, int]:
    """Cut edge regions that end near/at silence (fade-in/out ramps).

    Advances while the final window is below the floor or the last 500 ms span
    still averages below it, so a steep drop into silence is fully removed and
    the kept edge lands at a steady level; returns sample indices of the kept
    region (exclusive end).
    """
    n = len(rms)
    span = max(1, int(0.5 * 1000 / LOOP_WINDOW_MS))
    s = 0
    while s + 1 < n and (rms[s] < level_floor or float(np.mean(rms[s:min(n, s + span)])) < level_floor):
        s += 1
    e = n
    while e - 1 > s and (rms[e - 1] < level_floor or float(np.mean(rms[max(s, e - span):e])) < level_floor):
        e -= 1
    return int(s * hop), int(e * hop)


def _best_window(rms: np.ndarray, dev: np.ndarray, target_windows: int) -> int:
    """Sample start of the most stable window of `target_windows` length."""
    n = len(rms)
    if target_windows >= n:
        return 0
    pre = np.concatenate(([0.0], np.cumsum(dev)))
    w = target_windows
    starts = np.arange(0, n - w + 1)
    sums = pre[w:] - pre[:-w]
    i = int(np.argmin(sums))
    return min(i, n - w)


def _refine_boundary(rms: np.ndarray, zcr: np.ndarray, low: np.ndarray,
                     s_w: int, e_w: int, step_w: int = 10) -> tuple[int, int, dict]:
    """Nudge a windowed segment so its seam has the smallest boundary delta."""
    best = None
    best_b = None
    lo = max(0, s_w - 30 * 10 // step_w)
    hi = min(len(rms), e_w + 30 * 10 // step_w)
    for s in range(lo, max(lo + 1, hi - 10), step_w):
        e = s + (e_w - s_w)
        if e > len(rms):
            continue
        b = _boundary_stats(rms, zcr, low, s, e)
        key = (b["rms_diff"], b["zcr_diff"], b["low_diff"])
        if best is None or key < best:
            best = key
            best_b = (s, e, b)
    return best_b[0], best_b[1], best_b[2]


def _check_loop(loop: np.ndarray, sr: int, fade: int, med_delta: float,
                silence_floor: float = LOOP_SILENCE_FLOOR) -> dict:
    head = loop[: int(sr * 0.1)]
    tail = loop[-int(sr * 0.1):]
    rms_h = float(np.sqrt(np.mean(head * head)))
    rms_t = float(np.sqrt(np.mean(tail * tail)))
    ratio = max(rms_h, rms_t) / max(min(rms_h, rms_t), 1e-9)
    wrap_delta = float(np.max(np.abs(loop[-1] - loop[0])))
    fade_region = loop[max(0, len(loop) - fade):]
    interior_delta = float(np.max(np.abs(np.diff(fade_region, axis=0)))) if len(fade_region) > 1 else 0.0
    peak = float(np.max(np.abs(loop)))
    edge = int(sr * 0.2)
    boundary_peak = float(np.max(np.abs(loop[:edge]))) if len(loop) >= edge else 0.0
    boundary_peak = max(boundary_peak, float(np.max(np.abs(loop[-edge:]))))
    click_thresh = max(0.25, med_delta * 8.0)
    return {
        "rms_head": round(rms_h, 5),
        "rms_tail": round(rms_t, 5),
        "rms_ratio": round(ratio, 3),
        "wrap_max_delta": round(wrap_delta, 5),
        "fade_max_delta": round(interior_delta, 5),
        "peak": round(peak, 5),
        "boundary_peak": round(boundary_peak, 5),
        "silence_check": "pass" if min(rms_h, rms_t) > silence_floor else "fail",
        "rms_continuity_check": "pass" if ratio < 4.0 else "fail",
        "click_check": "pass" if max(wrap_delta, interior_delta) < click_thresh else "fail",
        "peak_check": "pass" if boundary_peak <= 0.999 else "fail",
    }


def _listening_sample(loop: np.ndarray, sr: int) -> np.ndarray:
    b = int(LOOP_SAMPLE_PASS_SECONDS * sr)
    if len(loop) <= 2 * b:
        b = max(1, len(loop) // 4)
    passthrough = np.concatenate((loop[-b:], loop[:b]), axis=0)
    return np.concatenate([passthrough] * LOOP_SAMPLE_PASSES, axis=0)


def _encode_ogg(x: np.ndarray, channels: int, sr: int, dst: Path, ffmpeg: str) -> Optional[str]:
    """Write a WAV then transcode to Ogg Vorbis q:a 5. Returns error string or None."""
    try:
        with tempfile.TemporaryDirectory(prefix="loopsfx_") as tmp:
            wav = Path(tmp) / "in.wav"
            pcm16 = (np.clip(x, -1.0, 1.0) * 32767.0).astype(np.int16)
            with wave.open(str(wav), "wb") as w:
                w.setnchannels(channels)
                w.setsampwidth(2)
                w.setframerate(sr)
                w.writeframes(pcm16.tobytes())
            cmd = [ffmpeg, "-y", "-v", "error", "-i", str(wav),
                   "-c:a", "libvorbis", "-q:a", "5", str(dst)]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
            if res.returncode != 0 or not dst.exists() or dst.stat().st_size == 0:
                return (res.stderr or res.stdout or "ffmpeg failed").strip()[:300]
        return None
    except (OSError, subprocess.TimeoutExpired, wave.Error) as e:
        return f"encode error: {e}"


def generate_loop_candidates(master_root: Path, out_root: Path,
                             ffmpeg: Optional[str], ffprobe: Optional[str]) -> tuple[dict, int]:
    """Build seamless loop candidates for continuous beds.

    Reads only the master library; writes only under out_root. Steady beds
    (fan / ventilation / rain) become equal-power seamless loops tiled to
    5-10 minutes; variable beds (ocean / cafe / city / ...) become clean
    natural segments meant for the app's file-to-file crossfade. At most
    LOOP_MAX_CANDIDATES_PER_SOURCE candidates per source.
    """
    entries = adopt_master_library(master_root, ffprobe)
    by_source: dict[str, list[LibraryEntry]] = {}
    for e in entries:
        if e.kind != "continuous":
            continue
        if e.category not in LOOP_TARGET_SOURCES:
            continue
        by_source.setdefault(e.category, []).append(e)

    report = {
        "engine": "numpy" if _np is not None else "pure_python",
        "sources": {},
        "skipped_files": [],
        "errors": [],
    }
    if not ffmpeg:
        report["errors"].append("ffmpeg not found - no candidates generated")
        return report, 1
    if _np is None:
        report["errors"].append("numpy is required for loop candidates (pip install numpy)")
        return report, 1
    if not by_source:
        report["errors"].append("no continuous master files for target sources found")
        return report, 0

    for source in sorted(by_source):
        candidates: list[dict] = []
        for entry in sorted(by_source[source], key=lambda e: e.source_path.name):
            info = entry.audio
            if info.duration_ms < LOOP_MIN_DURATION_S * 1000:
                report["skipped_files"].append({
                    "source": source, "file": entry.source_path.name,
                    "reason": f"too_short ({info.duration_ms / 1000:.1f}s)"})
                continue
            sr = info.sample_rate if 0 < info.sample_rate <= 48000 else 48000
            ch = info.channels or 2
            log(f"[loop] analyzing {source}/{entry.source_path.name} ({info.duration_ms / 1000:.1f}s)")
            x = _decode_pcm(entry.source_path, ffmpeg, ch, sr)
            if x is None:
                report["skipped_files"].append({"source": source, "file": entry.source_path.name, "reason": "decode_failed"})
                continue
            mono, med_delta = _stream_mono(x, ch, sr)
            x2 = x.reshape(-1, ch) if ch > 1 else x.reshape(-1, 1)
            rms, zcr, low, hop = _window_features(mono, sr)
            dev = _local_deviation(rms, LOOP_STABLE_SPAN)
            n_windows = len(rms)

            if source in LOOP_STEADY_SOURCES:
                stable = dev < LOOP_STABLE_DEV["steady"]
                runs = _stable_runs(stable, max(1, int(LOOP_MIN_DURATION_S * 1000 / LOOP_WINDOW_MS)))
                segs: list[tuple[int, int, dict, float]] = []
                if _boundary_ok(_boundary_stats(rms, zcr, low, 0, n_windows)):
                    segs.append((0, n_windows, _boundary_stats(rms, zcr, low, 0, n_windows), float(np.mean(dev))))
                target_w = int(LOOP_TARGET_MS / LOOP_WINDOW_MS)
                for s, e in runs:
                    b = _boundary_stats(rms, zcr, low, s, e)
                    if _boundary_ok(b):
                        segs.append((s, e, b, float(np.mean(dev[s:e]))))
                    if (e - s) * LOOP_WINDOW_MS >= 60_000:
                        w_len = min(target_w, int(0.8 * (e - s)))
                        if w_len < e - s:
                            ws = _best_window(rms, dev, w_len)
                            we = ws + w_len
                            wb = _boundary_stats(rms, zcr, low, ws, we)
                            segs.append((ws, we, wb, float(np.mean(dev[ws:we]))))
                if not segs:
                    report["skipped_files"].append({"source": source, "file": entry.source_path.name, "reason": "no_stable_loopable_segment"})
                    continue
                segs.sort(key=lambda t: (t[2]["rms_diff"], t[2]["zcr_diff"], t[2]["low_diff"]))
                s_w, e_w, b, dev_mean = segs[0]
                if e_w - s_w > int(LOOP_MAX_MS / LOOP_WINDOW_MS):
                    s_w = _best_window(rms, dev, target_w)
                    e_w = s_w + target_w
                s_w, e_w, b = _refine_boundary(rms, zcr, low, s_w, e_w)
                seg = x2[s_w * hop: e_w * hop].astype(np.float32) / 32768.0
                fade = min(int(LOOP_FADE_MS / 1000 * sr), max(64, len(seg) // 4))
                loop, peak, note = _equal_power_crossfade(seg, fade)
                if len(loop) < int(LOOP_TARGET_MS / 1000 * sr):
                    loop, tnote = _tile(loop, sr)
                    note = f"{note} {tnote}".strip()
                silence_floor = max(LOOP_SILENCE_FLOOR, 0.05 * float(np.median(rms)))
                checks = _check_loop(loop, sr, fade, med_delta, silence_floor)
                checks["notes"] = note
                checks["boundary"] = {k: (round(v, 5) if isinstance(v, float) else v) for k, v in b.items()}
                checks["segment_windows"] = [s_w, e_w]
                checks["segment_deviation"] = round(dev_mean, 4)
                candidates.append({
                    "file": entry.source_path.name,
                    "construction": "seamless_crossfade",
                    "crossfade_ms": int(fade * 1000 / sr),
                    "loop_duration_s": round(len(loop) / sr, 1),
                    "checks": checks,
                    "_loop": loop,
                })
            else:
                level_floor = max(0.35 * float(np.median(rms)), 1e-4)
                lo_s, lo_e = _trim_edges(mono, rms, hop, level_floor)
                lo_w, hi_w = lo_s // hop, min(n_windows, lo_e // hop)
                if hi_w - lo_w < int(8 * 1000 / LOOP_WINDOW_MS):
                    report["skipped_files"].append({"source": source, "file": entry.source_path.name, "reason": "too_short_after_trim"})
                    continue
                if hi_w - lo_w > int(LOOP_MAX_SEGMENT_S * 1000 / LOOP_WINDOW_MS):
                    target_w = int(LOOP_MAX_SEGMENT_S * 1000 / LOOP_WINDOW_MS)
                    ws = lo_w + _best_window(rms[lo_w:hi_w], dev[lo_w:hi_w], target_w)
                    s_w, e_w = ws, ws + target_w
                else:
                    s_w, e_w = lo_w, hi_w
                rms_s, zcr_s, low_s = rms[s_w:e_w], zcr[s_w:e_w], low[s_w:e_w]
                s2, e2, b = _refine_boundary(rms_s, zcr_s, low_s, 0, len(rms_s))
                s_w, e_w = s_w + s2, s_w + e2
                loop = x2[s_w * hop: e_w * hop].astype(np.float32) / 32768.0
                fade = 0
                silence_floor = max(LOOP_SILENCE_FLOOR, 0.05 * float(np.median(rms)))
                checks = _check_loop(loop, sr, int(0.05 * sr), med_delta, silence_floor)
                checks["notes"] = "natural_segment_no_crossfade"
                checks["boundary"] = {k: (round(v, 5) if isinstance(v, float) else v) for k, v in b.items()}
                checks["segment_windows"] = [s_w, e_w]
                candidates.append({
                    "file": entry.source_path.name,
                    "construction": "natural_segment",
                    "crossfade_ms": 0,
                    "loop_duration_s": round(len(loop) / sr, 1),
                    "checks": checks,
                    "_loop": loop,
                })
            if len(candidates) >= LOOP_MAX_CANDIDATES_PER_SOURCE:
                break
        if not candidates:
            continue
        src_dir = out_root / source
        src_dir.mkdir(parents=True, exist_ok=True)
        src_candidates = []
        for i, cand in enumerate(candidates, start=1):
            stem = f"{cand['file'].rsplit('.', 1)[0]}_loop_{i:03d}"
            dst = src_dir / f"{stem}.ogg"
            err = _encode_ogg(cand["_loop"], ch, sr, dst, ffmpeg)
            if err:
                report["errors"].append(f"{source}/{stem}: {err}")
                continue
            sample_dst = src_dir / f"{stem}_sample.ogg"
            err = _encode_ogg(_listening_sample(cand["_loop"], sr), ch, sr, sample_dst, ffmpeg)
            if err:
                report["errors"].append(f"{source}/{stem}_sample: {err}")
                continue
            cand["path"] = f"{source}/{dst.name}"
            cand["listening_sample"] = f"{source}/{sample_dst.name}"
            src_candidates.append({k: v for k, v in cand.items() if not k.startswith("_")})
            log(f"[loop] {source}/{dst.name} ({cand['loop_duration_s']}s, {cand['construction']})")
        report["sources"][source] = {"candidates": src_candidates}

    out_root.mkdir(parents=True, exist_ok=True)
    (out_root / "report").mkdir(parents=True, exist_ok=True)
    (out_root / "report" / "loop_candidates_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 0


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def find_input_files(root: Path) -> tuple[list[Path], list[Path]]:
    """Returns (archives, loose_audio_files) from anywhere under root except
    master library / failed / reports / loop_candidates dirs."""
    archives, loose = [], []
    skip = {"library", "failed_archives", "reports", "loop_candidates"}
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        rel_parts = p.relative_to(root).parts
        if rel_parts and rel_parts[0] in skip:
            continue
        if p.suffix.lower() in ARCHIVE_EXTS:
            archives.append(p)
        elif p.suffix.lower() in SUPPORTED_AUDIO_EXTS:
            loose.append(p)
    return archives, loose


def run(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    assets_dir = Path(args.assets).resolve()
    ffmpeg = args.ffmpeg or find_program(["ffmpeg"])
    ffprobe = args.ffprobe or find_program(["ffprobe"])
    seven_zip = find_program(["7z", "7za"])
    unrar = find_program(["unrar", "rar"])
    archive_tool = seven_zip or unrar

    if not ffmpeg:
        warn("ffmpeg not found - distribution assets will not be transcoded to OGG; "
             "please install ffmpeg on the development PC and rerun.")

    master_root = root / "library"
    failed_dir = root / "failed_archives"
    reports_dir = root / "reports"
    failed_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)

    log(f"== scanning {root} ==")
    archives, loose = find_input_files(root)

    # 1) adopt pre-organized master library
    entries = adopt_master_library(master_root, ffprobe)
    log(f"adopted {len(entries)} files from pre-organized library")

    # 2) process archives
    processed_archives, failed_archives = [], []
    for archive in archives:
        log(f"[archive] {archive.relative_to(root)}")
        job_dir = safe_short_temp()
        try:
            extracted, reason = extract_archive(archive, job_dir, archive_tool)
            if reason:
                _fail_archive(archive, failed_dir, reason)
                failed_archives.append({"name": archive.name, "reason": reason})
                continue
            audio_files = [x for x in extracted
                           if x.path.suffix.lower() in SUPPORTED_AUDIO_EXTS
                           and probe_audio(x.path, ffprobe) is not None]
            if not audio_files:
                _fail_archive(archive, failed_dir, "no valid audio found in archive")
                failed_archives.append({"name": archive.name, "reason": "no valid audio"})
                continue
            moved = 0
            for xf in audio_files:
                ctx = [xf.path.name, str(xf.path.parent.relative_to(job_dir)), archive.stem]
                cat = classify_category(ctx)
                kind = classify_kind(xf.path.name, ctx)
                if cat == "unclassified":
                    cat = "miscellaneous"
                entry, _ = move_to_master(xf.path, cat, kind, master_root, archive.name, ffprobe)
                entries.append(entry)
                moved += 1
            processed_archives.append({"name": archive.name, "extracted": moved})
        finally:
            shutil.rmtree(job_dir, ignore_errors=True)

    # 3) loose files
    for f in loose:
        if probe_audio(f, ffprobe) is None:
            warn(f"unreadable audio file kept in place: {f}")
            continue
        ctx = [f.name] + list(f.relative_to(root).parts[:-1])
        cat = classify_category(ctx)
        kind = classify_kind(f.name, ctx)
        if cat == "unclassified":
            cat = "miscellaneous"
        entry, _ = move_to_master(f, cat, kind, master_root, None, ffprobe)
        entries.append(entry)
        log(f"[loose] {f.name} -> {entry.category}/{entry.kind}/{entry.source_path.name}")

    # 4) dedup
    entries, duplicates = dedup_entries(entries)
    if duplicates:
        (reports_dir / "duplicate_report.json").write_text(
            json.dumps({"duplicates": duplicates}, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"dedup: {len(duplicates)} duplicate(s) removed, {len(entries)} unique entries")

    # 5) distribution assets
    assets, asset_errors = build_assets(entries, assets_dir, ffmpeg, ffprobe, args.verified_only)
    if asset_errors:
        (reports_dir / "asset_errors.log").write_text("\n".join(asset_errors), encoding="utf-8")

    # 6) manifests
    manifest_dir = assets_dir / "manifest"
    ok, err = write_manifests(assets, entries, manifest_dir)
    if not ok:
        error(err)
        return 1

    # 7) delete successfully processed archives (only now)
    if not args.dry_run:
        for arch in archives:
            if arch.name in {a["name"] for a in processed_archives}:
                arch.unlink(missing_ok=True)
                log(f"[deleted] {arch.name}")

    # 8) report
    verified = sum(1 for e in entries if e.license_status == "verified")
    report = {
        "library_version": LIBRARY_VERSION,
        "root": str(root),
        "archives_found": len(archives),
        "archives_processed_and_deleted": len(processed_archives),
        "archives_failed": failed_archives,
        "loose_files_processed": len(loose),
        "entries": len(entries),
        "verified_entries": verified,
        "assets_generated": len(assets),
        "asset_errors": len(asset_errors),
        "duplicates_removed": len(duplicates),
        "by_category": {cat: sum(1 for e in entries if e.category == cat) for cat in CATEGORIES + ["unclassified"]},
        "by_kind": {kind: sum(1 for e in entries if e.kind == kind) for kind in KINDS},
        "ffmpeg_used": bool(ffmpeg),
    }
    (reports_dir / "prepare_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


def _fail_archive(archive: Path, failed_dir: Path, reason: str) -> None:
    dest = failed_dir / archive.name
    if dest.exists():
        dest = failed_dir / f"{archive.stem}_dup{archive.suffix}"
    shutil.move(str(archive), str(dest))
    (failed_dir / f"{dest.name}.reason.txt").write_text(reason, encoding="utf-8")
    error(f"archive moved to failed_archives: {archive.name} -> {reason}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare sound library for the Ambience Android app")
    parser.add_argument("--root", default="sound_effect_library", help="scan root (default: sound_effect_library)")
    parser.add_argument("--assets", default="app/src/main/assets/ambience", help="assets output dir")
    parser.add_argument("--ffmpeg", default=None)
    parser.add_argument("--ffprobe", default=None)
    parser.add_argument("--verified-only", action="store_true",
                        help="exclude files whose license is not 'verified' from the app assets")
    parser.add_argument("--dry-run", action="store_true", help="do not delete archives or move files")
    parser.add_argument("--make-loop-candidates", action="store_true",
                        help="only generate seamless loop candidates for continuous beds "
                             "(writes sound_effect_library/loop_candidates/, touches nothing else)")
    parser.add_argument("--loop-candidates-dir", default="sound_effect_library/loop_candidates",
                        help="output dir for loop candidates (default: sound_effect_library/loop_candidates)")
    parser.add_argument("--deploy-loops", action="store_true",
                        help="analyze continuous masters and build a deployment-ready Android asset library")
    parser.add_argument("--loop-staging-dir", default="sound_effect_library/loop_deployment",
                        help="staging directory for --deploy-loops")
    parser.add_argument("--add-noise-and-cricket", action="store_true",
                        help="generate white/pink/brown noise and analyze the cricket hybrid into assets")
    parser.add_argument("--cricket-source", default="sound_effect_library/library/crickets/hybrid/crickets_hybrid_001.mp3")
    parser.add_argument("--add-requested-sources", action="store_true",
                        help="build thunder, singing bowl, forest and bamboo forest runtime-crossfade assets")
    parser.add_argument("--repair-loop-boundaries", action="store_true",
                        help="regenerate seamless fan, rain and noise assets with corrected equal-power seams")
    parser.add_argument("--repair-dropout-loops", action="store_true",
                        help="repair faded variable beds and phase-align the rhythmic cricket loop")
    args = parser.parse_args()
    if args.add_noise_and_cricket:
        ffmpeg = args.ffmpeg or find_program(["ffmpeg"])
        ffprobe = args.ffprobe or find_program(["ffprobe"])
        if not ffmpeg or not ffprobe:
            error("--add-noise-and-cricket requires ffmpeg and ffprobe")
            return 1
        from add_audio_sources import generate
        report, rc = generate(Path(args.assets).resolve(), Path(args.cricket_source).resolve(), ffmpeg, ffprobe)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    if args.add_requested_sources:
        ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
        ffprobe = args.ffprobe or shutil.which("ffprobe")
        if not ffmpeg or not ffprobe:
            error("--add-requested-sources requires ffmpeg and ffprobe")
            return 1
        from add_requested_sources import generate
        report, rc = generate(Path(args.assets), Path(args.root) / "library", ffmpeg, ffprobe)
        log(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    if args.repair_loop_boundaries:
        ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
        ffprobe = args.ffprobe or shutil.which("ffprobe")
        if not ffmpeg or not ffprobe:
            error("--repair-loop-boundaries requires ffmpeg and ffprobe")
            return 1
        from repair_loop_boundaries import repair
        report, rc = repair(Path(args.assets), Path(args.root) / "library", ffmpeg, ffprobe)
        log(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    if args.repair_dropout_loops:
        ffmpeg = args.ffmpeg or shutil.which("ffmpeg")
        ffprobe = args.ffprobe or shutil.which("ffprobe")
        if not ffmpeg or not ffprobe:
            error("--repair-dropout-loops requires ffmpeg and ffprobe")
            return 1
        from repair_dropout_loops import repair
        report, rc = repair(Path(args.assets), Path(args.root) / "library", ffmpeg, ffprobe)
        log(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    if args.deploy_loops:
        ffmpeg = args.ffmpeg or find_program(["ffmpeg"])
        ffprobe = args.ffprobe or find_program(["ffprobe"])
        if not ffmpeg or not ffprobe:
            error("--deploy-loops requires ffmpeg and ffprobe")
            return 1
        from deploy_loop_assets import build_deployment_loops
        report, rc = build_deployment_loops(
            Path(args.root).resolve() / "library",
            Path(args.assets).resolve(),
            Path(args.loop_staging_dir).resolve(),
            ffmpeg,
            ffprobe,
        )
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    if args.make_loop_candidates:
        root = Path(args.root).resolve()
        ffmpeg = args.ffmpeg or find_program(["ffmpeg"])
        ffprobe = args.ffprobe or find_program(["ffprobe"])
        report, rc = generate_loop_candidates(root / "library", Path(args.loop_candidates_dir), ffmpeg, ffprobe)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return rc
    try:
        return run(args)
    except KeyboardInterrupt:
        error("interrupted - no further changes were made")
        return 130
    except Exception as e:  # noqa: BLE001 - top-level guard: never leave partial state silently
        error(f"unexpected failure: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
