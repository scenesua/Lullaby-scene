"""Repair ambience loops whose source fades or rhythmic seams cause dropouts."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from scipy.signal import butter, find_peaks, sosfilt

import deploy_loop_assets as loop


SOURCES = {
    "ocean": ("ocean/continuous/ocean_continuous_001.wav", 0.0, 54.25, 8.0),
    "singing_bowl": ("singing bowl/161478__phluidbox__tibetan-singing-bowls.wav", 2.0, 91.0, 12.0),
    "thunder": ("thunder/event/thunder_event_001.wav", 3.75, 55.0, 7.0),
    "wind": ("wind/continuous/wind_continuous_001.mp3", 4.5, 45.75, 8.0),
}


def _safe_peak(audio: np.ndarray) -> tuple[np.ndarray, float]:
    peak = float(np.max(np.abs(audio)))
    gain = min(1.0, (10.0 ** (-1.0 / 20.0)) / max(peak, 1e-9))
    return (audio * gain).astype(np.float32), 20.0 * math.log10(gain)


def _thunder_bed(audio: np.ndarray) -> np.ndarray:
    """Stagger the supplied recording so its digital-silence gaps never align."""
    layers = [np.roll(audio, len(audio) * i // 4, axis=0) for i in range(4)]
    return (sum(layers) / math.sqrt(len(layers))).astype(np.float32)


def _cricket_loop(original: Path, ffmpeg: str, ffprobe: str) -> tuple[np.ndarray, int, dict]:
    info = loop._probe(original, ffprobe)
    audio = loop._decode_segment(original, ffmpeg, info, 0.0, info.duration) if info else None
    if info is None or audio is None:
        raise RuntimeError("cricket_decode_failed")
    rate = min(max(info.sample_rate, 8_000), 48_000)

    analysis_rate = 8_000
    analysis = loop._decode(original, ffmpeg, rate=analysis_rate)
    if analysis is None:
        raise RuntimeError("cricket_analysis_failed")
    high = sosfilt(butter(4, 1_500, btype="highpass", fs=analysis_rate, output="sos"), analysis, axis=0)
    hop, window = 40, 160
    envelope = np.array([
        np.sqrt(np.mean(high[i:i + window] ** 2) + 1e-12)
        for i in range(0, len(high) - window, hop)
    ])
    envelope = (envelope - envelope.mean()) / max(float(envelope.std()), 1e-9)
    peaks, _ = find_peaks(envelope, distance=int(0.25 * analysis_rate / hop), prominence=0.25)
    times = peaks * hop / analysis_rate
    starts = times[(times > 0.05) & (times < 1.6)]
    ends = times[(times > info.duration - 2.0) & (times < info.duration - 0.1)]
    fade_seconds = 0.86  # two detected ~0.43 s chirp periods
    fade_frames = int(fade_seconds * analysis_rate / hop)
    candidates = []
    for start in starts:
        for end in ends:
            if end - start < 8.0:
                continue
            a = int(start * analysis_rate / hop)
            b = int(end * analysis_rate / hop)
            head, tail = envelope[a:a + fade_frames], envelope[b - fade_frames:b]
            if len(head) != fade_frames or len(tail) != fade_frames:
                continue
            correlation = float(np.corrcoef(head, tail)[0, 1])
            candidates.append((correlation, float(start), float(end)))
    if not candidates:
        raise RuntimeError("cricket_phase_match_failed")
    correlation, start, end = max(candidates)
    if correlation < 0.8:
        raise RuntimeError(f"cricket_phase_correlation_too_low:{correlation:.3f}")
    segment = audio[int(start * rate):int(end * rate)]
    result = loop._equal_power_loop(segment, rate, fade_seconds)
    return result, rate, {
        "trim_start_seconds": round(start, 3),
        "trim_end_seconds": round(end, 3),
        "detected_chirp_period_seconds": 0.43,
        "phase_crossfade_seconds": fade_seconds,
        "envelope_correlation": round(correlation, 6),
    }


def _boundary_dropout(audio: np.ndarray, rate: int, minimum_dip_db: float = -6.0) -> dict:
    repeated = np.concatenate((audio, audio, audio), axis=0)
    window = max(1, int(rate * 0.1))
    boundary = len(audio)
    edge = repeated[boundary - rate:boundary + rate]
    rms = np.array([
        np.sqrt(np.mean(edge[i:i + window] ** 2) + 1e-12)
        for i in range(0, len(edge) - window + 1, window)
    ])
    median = float(np.median(rms))
    minimum = float(np.min(rms))
    dip_db = 20.0 * math.log10(max(minimum, 1e-12) / max(median, 1e-12))
    return {
        "minimum_rms_dbfs": round(20.0 * math.log10(max(minimum, 1e-12)), 3),
        "boundary_dip_db": round(dip_db, 3),
        "limit_db": minimum_dip_db,
        "passed": dip_db >= minimum_dip_db and minimum > 10.0 ** (-60.0 / 20.0),
    }


def _cricket_cadence(audio: np.ndarray, rate: int) -> dict:
    repeated = np.tile(audio, (3, 1))
    high = sosfilt(butter(4, 1_500, btype="highpass", fs=rate, output="sos"), repeated, axis=0)
    hop, window = max(1, rate // 200), max(1, rate // 50)
    envelope = np.array([
        np.sqrt(np.mean(high[i:i + window] ** 2) + 1e-12)
        for i in range(0, len(high) - window, hop)
    ])
    envelope = (envelope - envelope.mean()) / max(float(envelope.std()), 1e-9)
    peaks, _ = find_peaks(envelope, distance=int(0.25 * rate / hop), prominence=0.25)
    times = peaks * hop / rate
    boundary = len(audio) / rate
    before = times[times < boundary]
    after = times[times >= boundary]
    intervals = np.diff(times[(times > boundary - 2.0) & (times < boundary + 2.0)])
    if not len(before) or not len(after) or not len(intervals):
        return {"passed": False, "error": "insufficient_chirp_onsets"}
    boundary_interval = float(after[0] - before[-1])
    median_interval = float(np.median(intervals))
    difference = abs(boundary_interval - median_interval)
    return {
        "passed": difference <= 0.12,
        "boundary_interval_seconds": round(boundary_interval, 3),
        "median_interval_seconds": round(median_interval, 3),
        "difference_seconds": round(difference, 3),
    }


def repair(assets: Path, library: Path, ffmpeg: str, ffprobe: str) -> tuple[dict, int]:
    manifest_path = assets / "manifest" / "sound_library.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    sources = {source["id"]: source for source in manifest["sources"]}
    report = {"algorithm": "dropout_free_seam_v1", "sources": {}, "errors": []}

    jobs: dict[str, tuple[np.ndarray, int, float, dict]] = {}
    cricket_audio, cricket_rate, cricket_details = _cricket_loop(
        library / "crickets/hybrid/crickets_hybrid_001.mp3", ffmpeg, ffprobe)
    jobs["crickets"] = (cricket_audio, cricket_rate, 0.86, cricket_details)

    for source, (relative, start, end, fade) in SOURCES.items():
        original = library / relative
        info = loop._probe(original, ffprobe)
        segment = loop._decode_segment(original, ffmpeg, info, start, end - start) if info else None
        if info is None or segment is None:
            report["errors"].append({"source": source, "error": "decode_failed"})
            continue
        rate = min(max(info.sample_rate, 8_000), 48_000)
        if source == "thunder":
            segment = _thunder_bed(segment)
        audio = loop._equal_power_loop(segment, rate, fade)
        jobs[source] = (audio, rate, fade, {
            "original": original.name,
            "trim_start_seconds": start,
            "trim_end_seconds": end,
            "staggered_layers": 4 if source == "thunder" else 1,
        })

    for source, (audio, rate, fade, details) in jobs.items():
        audio, safety_gain_db = _safe_peak(audio)
        seam = loop._qa(audio, rate)
        dropout = _boundary_dropout(audio, rate, -8.0 if source == "crickets" else -6.0)
        if not seam["passed"] or not dropout["passed"]:
            report["errors"].append({"source": source, "error": "boundary_qa_failed", "seam": seam, "dropout": dropout})
            continue
        asset_id = f"{source}_loop_001"
        output = assets / source / "continuous" / f"{asset_id}.ogg"
        error = loop._encode(audio, rate, output, ffmpeg)
        if error:
            report["errors"].append({"source": source, "error": error})
            continue
        encoded = loop._decode(output, ffmpeg, rate=rate)
        if encoded is None:
            report["errors"].append({"source": source, "error": "encoded_decode_failed"})
            continue
        encoded_seam = loop._qa(encoded, rate)
        encoded_dropout = _boundary_dropout(encoded, rate, -8.0 if source == "crickets" else -6.0)
        cadence = _cricket_cadence(encoded, rate) if source == "crickets" else None
        if not encoded_seam["passed"] or not encoded_dropout["passed"] or (cadence and not cadence["passed"]):
            report["errors"].append({
                "source": source, "error": "encoded_boundary_qa_failed",
                "seam": encoded_seam, "dropout": encoded_dropout, "cadence": cadence,
            })
            continue
        info = loop._probe(output, ffprobe)
        entry = {
            "asset_id": asset_id,
            "path": f"ambience/{source}/continuous/{output.name}",
            "duration_ms": int((info.duration if info else len(audio) / rate) * 1000),
            "crossfade_ms": int(fade * 1000),
        }
        sources[source]["loop_mode"] = "seamless"
        sources[source]["continuous"] = [entry]
        report["sources"][source] = {
            **entry, **details, "bytes": output.stat().st_size,
            "safety_gain_db": round(safety_gain_db, 3),
            "seam_qa": encoded_seam, "dropout_qa": encoded_dropout,
            **({"cadence_qa": cadence} if cadence else {}),
        }

    manifest["sources"] = sorted(sources.values(), key=lambda source: source["id"])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    licenses_path = assets / "manifest" / "licenses.json"
    licenses = json.loads(licenses_path.read_text(encoding="utf-8"))
    active_ids = {asset["asset_id"] for source in manifest["sources"] for key in ("continuous", "events") for asset in source.get(key, [])}
    licenses["entries"] = [entry for entry in licenses.get("entries", []) if entry["asset_id"] in active_ids]
    licenses_path.write_text(json.dumps(licenses, ensure_ascii=False, indent=2), encoding="utf-8")
    (assets / "manifest" / "dropout_loop_repair_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 1 if report["errors"] or len(report["sources"]) != len(SOURCES) + 1 else 0
