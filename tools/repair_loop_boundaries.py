"""Regenerate direct-repeat assets with a correctly ordered equal-power seam."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

import add_audio_sources
import deploy_loop_assets as loop


BED_SOURCES = {"fan", "rain"}
NOISE_SOURCES = set(add_audio_sources.NOISE_SPECS)


def _seam_metrics(audio: np.ndarray, rate: int) -> dict:
    edge = min(rate // 2, len(audio) // 4)
    head, tail = audio[:edge], audio[-edge:]
    rms = lambda x: float(np.sqrt(np.mean(x * x) + 1e-12))
    rms_jump = abs(20 * math.log10(rms(head)) - 20 * math.log10(rms(tail)))
    spectrum = lambda x: np.abs(np.fft.rfft(x.mean(axis=1) * np.hanning(len(x)))) + 1e-9
    spec_distance = loop._cosine_distance(spectrum(head), spectrum(tail))
    boundary_delta = float(np.max(np.abs(audio[-1] - audio[0])))
    ordinary_delta = float(np.percentile(np.max(np.abs(np.diff(audio, axis=0)), axis=1), 99.9))
    failures = []
    if rms_jump > 3.0: failures.append("rms_jump")
    if spec_distance > 0.35: failures.append("spectrum_jump")
    if boundary_delta > max(0.05, ordinary_delta * 1.5): failures.append("boundary_click")
    return {
        "passed": not failures, "failures": failures,
        "rms_db_jump": round(rms_jump, 6), "spectrum_distance": round(spec_distance, 6),
        "boundary_delta": round(boundary_delta, 6), "ordinary_delta_p99_9": round(ordinary_delta, 6),
    }


def repair(assets: Path, library: Path, ffmpeg: str, ffprobe: str) -> tuple[dict, int]:
    manifest_path = assets / "manifest" / "sound_library.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = {source["id"]: source for source in manifest["sources"]}
    deployment = json.loads((assets / "manifest" / "loop_deployment_report.json").read_text(encoding="utf-8"))
    report = {"algorithm": "equal_power_rotated_seam_v2", "sources": {}, "errors": []}

    for index, source in enumerate(add_audio_sources.NOISE_SPECS, 1):
        audio = add_audio_sources._noise(source, 4100 + index)
        fade = add_audio_sources.NOISE_SPECS[source][2]
        output = assets / source / "continuous" / f"{source}_loop_001.ogg"
        error = loop._encode(audio, add_audio_sources.RATE, output, ffmpeg)
        if error:
            report["errors"].append({"source": source, "error": error})
            continue
        info = loop._probe(output, ffprobe)
        sources[source]["continuous"][0]["duration_ms"] = int((info.duration if info else len(audio) / add_audio_sources.RATE) * 1000)
        sources[source]["continuous"][0]["crossfade_ms"] = int(fade * 1000)
        report["sources"][source] = {
            "asset": output.name, "bytes": output.stat().st_size,
            "duration_ms": sources[source]["continuous"][0]["duration_ms"],
            "seam": _seam_metrics(audio, add_audio_sources.RATE),
        }

    for source in sorted(BED_SOURCES):
        deployed_id = deployment["sources"][source]["deployed"][0]
        row = next(item for item in deployment["sources"][source]["candidates"] if item["asset_id"] == deployed_id)
        original = library / source / "continuous" / row["original"]
        info = loop._probe(original, ffprobe)
        if info is None:
            report["errors"].append({"source": source, "error": "original_probe_failed"})
            continue
        start, end = row["loop_start_seconds"], row["loop_end_seconds"]
        segment = loop._decode_segment(original, ffmpeg, info, start, end - start)
        if segment is None:
            report["errors"].append({"source": source, "error": "original_decode_failed"})
            continue
        rate = min(max(info.sample_rate, 8_000), 48_000)
        audio = loop._equal_power_loop(segment, rate, row["crossfade_seconds"])
        audio, tiles = loop._tile_to_minimum(audio, rate, source)
        seam = _seam_metrics(audio, rate)
        if not seam["passed"]:
            report["errors"].append({"source": source, "error": "seam_qa_failed", "seam": seam})
            continue
        output = assets / source / "continuous" / f"{deployed_id}.ogg"
        error = loop._encode(audio, rate, output, ffmpeg)
        if error:
            report["errors"].append({"source": source, "error": error})
            continue
        out_info = loop._probe(output, ffprobe)
        entry = sources[source]["continuous"][0]
        entry["duration_ms"] = int((out_info.duration if out_info else len(audio) / rate) * 1000)
        entry["crossfade_ms"] = int(row["crossfade_seconds"] * 1000)
        report["sources"][source] = {
            "asset": output.name, "original": row["original"], "bytes": output.stat().st_size,
            "duration_ms": entry["duration_ms"], "tiles": tiles, "seam": seam,
        }

    manifest["sources"] = sorted(sources.values(), key=lambda source: source["id"])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (assets / "manifest" / "loop_boundary_repair_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 1 if report["errors"] or len(report["sources"]) != len(BED_SOURCES | NOISE_SOURCES) else 0
