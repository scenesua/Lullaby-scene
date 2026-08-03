"""Generate deployable noise beds and cricket crossfade assets."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter, sosfilt

import deploy_loop_assets as loop


RATE = 48_000
NOISE_SECONDS = 305
OUTPUT_SECONDS = 300
NOISE_RMS = 0.04
NOISE_SPECS = {
    "white_noise": ("source_white_noise", 0.30, 5.0),
    "pink_noise": ("source_pink_noise", 0.30, 6.0),
    "brown_noise": ("source_brown_noise", 0.30, 7.0),
}


def _set_rms(x: np.ndarray, target: float = NOISE_RMS) -> np.ndarray:
    x = x - np.mean(x)
    return (x * (target / max(float(np.sqrt(np.mean(x * x))), 1e-9))).astype(np.float32)


def _noise(kind: str, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    white = rng.standard_normal(RATE * NOISE_SECONDS).astype(np.float32)
    if kind == "white_noise":
        mono = white
    elif kind == "pink_noise":
        # Paul Kellet's compact pinking filter: smooth 3 dB/octave spectral falloff.
        mono = lfilter([0.049922, -0.095993, 0.050612, -0.004408],
                       [1.0, -2.494956, 2.017265, -0.522189], white).astype(np.float32)
    else:
        # Leaky integration gives Brownian colour; 30 Hz HPF prevents DC/sub-bass buildup.
        brown = lfilter([1.0], [1.0, -0.995], white).astype(np.float32)
        mono = sosfilt(butter(4, 30.0, btype="highpass", fs=RATE, output="sos"), brown).astype(np.float32)
    mono = _set_rms(mono)
    stereo = np.column_stack((mono, mono))
    fade = NOISE_SECONDS - OUTPUT_SECONDS
    return loop._equal_power_loop(stereo, RATE, fade)


def _asset_entry(asset_id: str, path: str, duration: float, fade: float) -> dict:
    return {"asset_id": asset_id, "path": path, "duration_ms": int(duration * 1000),
            "crossfade_ms": int(fade * 1000)}


def generate(assets: Path, cricket: Path, ffmpeg: str, ffprobe: str) -> tuple[dict, int]:
    manifest_path = assets / "manifest" / "sound_library.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = {s["id"]: s for s in manifest["sources"]}
    report = {"train_trim_gain_db": 3.0, "noise": {}, "cricket": {}, "errors": []}

    for index, (source, (display_key, default_volume, fade)) in enumerate(NOISE_SPECS.items(), 1):
        audio = _noise(source, 4100 + index)
        qa = loop._qa(audio, RATE)
        output = assets / source / "continuous" / f"{source}_loop_001.ogg"
        error = loop._encode(audio, RATE, output, ffmpeg)
        if error:
            report["errors"].append({"source": source, "error": error})
            continue
        info = loop._probe(output, ffprobe)
        peak = float(np.max(np.abs(audio)))
        entry = _asset_entry(f"{source}_loop_001", f"ambience/{source}/continuous/{output.name}",
                             info.duration if info else len(audio) / RATE, fade)
        sources[source] = {"id": source, "category": "other", "display_name_key": display_key,
                           "default_volume": default_volume, "loop_mode": "seamless",
                           "continuous": [entry], "events": []}
        report["noise"][source] = {**entry, "bytes": output.stat().st_size,
                                    "pcm_rms_dbfs": round(20 * np.log10(NOISE_RMS), 3),
                                    "pcm_peak_dbfs": round(20 * np.log10(max(peak, 1e-9)), 3), "qa": qa}

    info = loop._probe(cricket, ffprobe)
    analysis = loop._decode(cricket, ffmpeg)
    if info is None or analysis is None:
        report["errors"].append({"source": "crickets", "error": "cricket_decode_failed"})
    else:
        features = loop._features(analysis, loop.ANALYSIS_RATE)
        ranges = loop._candidate_ranges(features, analysis, info.duration, True)
        cricket_entries = []
        cricket_rows = []
        for index, (start_frame, end_frame, boundary, score) in enumerate(ranges, 1):
            start = start_frame * loop.HOP_SECONDS
            duration = (end_frame - start_frame) * loop.HOP_SECONDS
            segment = loop._decode_segment(cricket, ffmpeg, info, start, duration)
            if segment is None:
                continue
            rate = min(max(info.sample_rate, 8_000), 48_000)
            segment, zero = loop._refine_zero_crossing(segment, rate)
            fade = loop._fade_seconds("crickets", boundary, len(segment) / rate)
            seam_qa = loop._qa(loop._equal_power_loop(segment, rate, fade), rate)
            asset_id = f"crickets_loop_{index:03d}"
            output = assets / "crickets" / "continuous" / f"{asset_id}.ogg"
            error = loop._encode(segment, rate, output, ffmpeg)
            if error:
                report["errors"].append({"source": "crickets", "error": error})
                continue
            out_info = loop._probe(output, ffprobe)
            entry = _asset_entry(asset_id, f"ambience/crickets/continuous/{output.name}",
                                 out_info.duration if out_info else len(segment) / rate, fade)
            cricket_entries.append(entry)
            cricket_rows.append({**entry, "bytes": output.stat().st_size,
                                 "original": cricket.name,
                                 "trim_start_seconds": round(start + zero["start_adjust_ms"] / 1000, 3),
                                 "trim_end_seconds": round(start + duration + zero["end_adjust_ms"] / 1000, 3),
                                 "analysis_score": round(score, 3), "boundary_features": boundary,
                                 "seam_qa": seam_qa})
        if cricket_entries:
            sources["crickets"] = {**sources.get("crickets", {"id": "crickets", "category": "nature",
                                    "display_name_key": "source_crickets", "default_volume": 0.3}),
                                    "loop_mode": "crossfade", "continuous": cricket_entries, "events": []}
        report["cricket"] = {"classification_before": "hybrid", "classification_after": "continuous_crossfade",
                              "duration_seconds": info.duration,
                              "silent_frames_below_minus_50_dbfs": int(np.sum(features["lufs"] < -50)),
                              "rms_dbfs_min": round(float(np.min(features["lufs"]) + 0.691), 3),
                              "rms_dbfs_max": round(float(np.max(features["lufs"]) + 0.691), 3),
                              "crest_max": round(float(np.max(features["crest"])), 3), "assets": cricket_rows}

    if "train" in sources:
        sources["train"]["trim_gain_db"] = 3.0
    manifest["version"] = max(3, int(manifest.get("version", 1)))
    manifest["sources"] = sorted(sources.values(), key=lambda s: s["id"])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    licenses_path = assets / "manifest" / "licenses.json"
    licenses = json.loads(licenses_path.read_text(encoding="utf-8"))
    new_ids = set(NOISE_SPECS) | {e["asset_id"] for e in report.get("cricket", {}).get("assets", [])}
    licenses["entries"] = [e for e in licenses.get("entries", []) if e["asset_id"] not in new_ids]
    for source in NOISE_SPECS:
        licenses["entries"].append({"asset_id": f"{source}_loop_001", "source_name": "generated",
                                    "creator": None, "source_page": None, "license": "generated in project",
                                    "license_status": "generated", "attribution_required": False,
                                    "original_filename": "procedural", "original_archive": None})
    for row in report.get("cricket", {}).get("assets", []):
        licenses["entries"].append({"asset_id": row["asset_id"], "source_name": None, "creator": None,
                                    "source_page": None, "license": None, "license_status": "unknown",
                                    "attribution_required": False, "original_filename": cricket.name,
                                    "original_archive": None})
    licenses_path.write_text(json.dumps(licenses, ensure_ascii=False, indent=2), encoding="utf-8")
    (assets / "manifest" / "additional_sources_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 1 if report["errors"] else 0

