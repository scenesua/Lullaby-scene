"""Build analyzed runtime-crossfade assets for the newly supplied ambience masters."""

from __future__ import annotations

import json
import math
import shutil
from pathlib import Path

import numpy as np

import deploy_loop_assets as loop


SOURCES = {
    "thunder": ("thunder/event/thunder_event_001.wav", "nature", "source_thunder"),
    "singing_bowl": ("singing bowl/161478__phluidbox__tibetan-singing-bowls.wav", "other", "source_singing_bowl"),
    "forest": ("forest/826326__upkey__forest-ambience-with-birds.wav", "nature", "source_forest"),
    "bamboo_forest": ("bamboo forest/335891__yoyodaman234__bamboo-creaking-in-wind.mp3", "nature", "source_bamboo_forest"),
}


def _true_peak_gain(audio: np.ndarray) -> tuple[np.ndarray, float, float]:
    peak = float(np.max(np.abs(audio)))
    peak_dbfs = 20.0 * math.log10(max(peak, 1e-9))
    gain_db = min(0.0, -1.0 - peak_dbfs)
    return (audio * (10.0 ** (gain_db / 20.0))).astype(np.float32), gain_db, peak_dbfs


def generate(assets: Path, library: Path, ffmpeg: str, ffprobe: str) -> tuple[dict, int]:
    manifest_path = assets / "manifest" / "sound_library.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = {source["id"]: source for source in manifest["sources"]}
    old_assets = {
        source_id: {a["asset_id"] for key in ("continuous", "events") for a in sources.get(source_id, {}).get(key, [])}
        for source_id in set(SOURCES) | {"miscellaneous"}
    }
    report = {"analysis_version": 2, "sources": {}, "removed_sources": ["miscellaneous"], "errors": []}

    for source, (relative, category, display_key) in SOURCES.items():
        original = library / relative
        info = loop._probe(original, ffprobe)
        analysis = loop._decode(original, ffmpeg)
        if info is None or analysis is None:
            report["errors"].append({"source": source, "error": "decode_failed", "original": str(original)})
            continue
        features = loop._features(analysis, loop.ANALYSIS_RATE)
        ranges = loop._candidate_ranges(features, analysis, info.duration, True)
        entries, rows = [], []
        for index, (start_frame, end_frame, boundary, analysis_score) in enumerate(ranges, 1):
            start = start_frame * loop.HOP_SECONDS
            duration = min(info.duration - start, (end_frame - start_frame) * loop.HOP_SECONDS)
            segment = loop._decode_segment(original, ffmpeg, info, start, duration)
            if segment is None:
                continue
            rate = min(max(info.sample_rate, 8_000), 48_000)
            segment, zero = loop._refine_zero_crossing(segment, rate)
            segment, safety_gain_db, input_peak_dbfs = _true_peak_gain(segment)
            fade = loop._fade_seconds(source, boundary, len(segment) / rate)
            qa = loop._qa(loop._equal_power_loop(segment, rate, fade), rate)
            if not qa["passed"]:
                rows.append({"candidate": index, "deployed": False, "qa": qa})
                continue
            asset_id = f"{source}_loop_{index:03d}"
            output = assets / source / "continuous" / f"{asset_id}.ogg"
            error = loop._encode(segment, rate, output, ffmpeg)
            if error:
                report["errors"].append({"source": source, "error": error})
                continue
            out_info = loop._probe(output, ffprobe)
            entry = {
                "asset_id": asset_id,
                "path": f"ambience/{source}/continuous/{output.name}",
                "duration_ms": int((out_info.duration if out_info else len(segment) / rate) * 1000),
                "crossfade_ms": int(fade * 1000),
            }
            entries.append(entry)
            rows.append({
                **entry, "deployed": True, "bytes": output.stat().st_size, "original": original.name,
                "trim_start_seconds": round(start + zero["start_adjust_ms"] / 1000, 3),
                "trim_end_seconds": round(start + duration + zero["end_adjust_ms"] / 1000, 3),
                "analysis_score": round(analysis_score, 3), "crossfade_seconds": round(fade, 3),
                "input_peak_dbfs": round(input_peak_dbfs, 3), "safety_gain_db": round(safety_gain_db, 3),
                "boundary_features": {k: round(v, 6) for k, v in boundary.items()}, "qa": qa,
            })
        mode = "crossfade" if entries else "unsupported"
        sources[source] = {
            **sources.get(source, {"id": source}), "id": source, "category": category,
            "display_name_key": display_key, "default_volume": sources.get(source, {}).get("default_volume", 0.3),
            "loop_mode": mode, "continuous": entries, "events": [],
        }
        report["sources"][source] = {
            "original": str(original), "original_duration_seconds": info.duration,
            "loop_mode": mode, "candidates": rows,
        }

    sources.pop("miscellaneous", None)
    shutil.rmtree(assets / "miscellaneous", ignore_errors=True)
    shutil.rmtree(assets / "thunder" / "events", ignore_errors=True)
    manifest["version"] = max(4, int(manifest.get("version", 1)))
    manifest["sources"] = sorted(sources.values(), key=lambda source: source["id"])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    preset_path = assets / "manifest" / "category_presets.json"
    category_presets = json.loads(preset_path.read_text(encoding="utf-8"))
    category_presets.get("categories", {}).pop("miscellaneous", None)
    category_presets.get("categories", {}).pop("thunder", None)
    preset_path.write_text(json.dumps(category_presets, ensure_ascii=False, indent=2), encoding="utf-8")

    license_path = assets / "manifest" / "licenses.json"
    licenses = json.loads(license_path.read_text(encoding="utf-8"))
    replaced_ids = set().union(*old_assets.values())
    licenses["entries"] = [entry for entry in licenses.get("entries", []) if entry["asset_id"] not in replaced_ids]
    for source, source_report in report["sources"].items():
        for row in source_report["candidates"]:
            if row.get("deployed"):
                licenses["entries"].append({
                    "asset_id": row["asset_id"], "source_name": None, "creator": None,
                    "source_page": None, "license": None, "license_status": "unknown",
                    "attribution_required": False, "original_filename": row["original"], "original_archive": None,
                })
    license_path.write_text(json.dumps(licenses, ensure_ascii=False, indent=2), encoding="utf-8")
    (assets / "manifest" / "requested_sources_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 1 if report["errors"] or any(s["loop_mode"] == "unsupported" for s in report["sources"].values()) else 0
