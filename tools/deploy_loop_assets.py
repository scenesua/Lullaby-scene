"""Audio-analysis driven deployment loop builder used by prepare_sound_library.py."""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import tempfile
import wave
from dataclasses import dataclass
from pathlib import Path

import numpy as np


ANALYSIS_RATE = 8_000
FRAME_SECONDS = 0.5
HOP_SECONDS = 0.25
MAX_CANDIDATES = 3
STEADY = {"fan", "ventilation", "rain", "wind"}
VARIABLE = {"ocean", "stream", "fire", "birds", "crickets", "cafe", "city", "train", "forest",
            "thunder", "singing_bowl", "bamboo_forest"}
FADE_RANGES = {
    "fan": (1.0, 4.0), "ventilation": (1.0, 4.0), "rain": (1.0, 4.0),
    "wind": (3.0, 8.0), "stream": (3.0, 8.0), "fire": (3.0, 8.0),
    "ocean": (5.0, 15.0), "forest": (5.0, 15.0), "cafe": (5.0, 15.0),
    "city": (5.0, 15.0), "birds": (5.0, 12.0), "crickets": (3.0, 8.0),
    "train": (5.0, 15.0), "thunder": (5.0, 12.0),
    "singing_bowl": (6.0, 15.0), "bamboo_forest": (5.0, 15.0),
}


@dataclass
class AudioInfo:
    duration: float
    sample_rate: int
    channels: int


def _run(cmd: list[str], timeout: int = 3600) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, timeout=timeout)


def _probe(path: Path, ffprobe: str) -> AudioInfo | None:
    result = _run([ffprobe, "-v", "error", "-show_entries", "format=duration",
                   "-show_entries", "stream=sample_rate,channels", "-of", "json", str(path)])
    if result.returncode:
        return None
    try:
        value = json.loads(result.stdout)
        stream = next(s for s in value["streams"] if "sample_rate" in s)
        return AudioInfo(float(value["format"]["duration"]), int(stream["sample_rate"]), int(stream["channels"]))
    except (KeyError, ValueError, StopIteration, TypeError):
        return None


def _decode(path: Path, ffmpeg: str, rate: int = ANALYSIS_RATE, start: float = 0.0,
            duration: float | None = None) -> np.ndarray | None:
    cmd = [ffmpeg, "-v", "error"]
    if start > 0:
        cmd += ["-ss", f"{start:.6f}"]
    cmd += ["-i", str(path)]
    if duration is not None:
        cmd += ["-t", f"{duration:.6f}"]
    cmd += ["-f", "f32le", "-c:a", "pcm_f32le", "-ac", "2", "-ar", str(rate), "-"]
    result = _run(cmd)
    if result.returncode or not result.stdout:
        return None
    return np.frombuffer(result.stdout, np.float32).reshape(-1, 2).copy()


def _features(stereo: np.ndarray, rate: int) -> dict[str, np.ndarray]:
    frame = max(256, int(rate * FRAME_SECONDS))
    hop = max(128, int(rate * HOP_SECONDS))
    count = 1 + max(0, (len(stereo) - frame) // hop)
    if count <= 0:
        return {}
    mono = stereo.mean(axis=1)
    window = np.hanning(frame).astype(np.float32)
    freqs = np.fft.rfftfreq(frame, 1.0 / rate)
    bands = np.geomspace(20, rate / 2, 25)
    values = {k: [] for k in ("rms", "lufs", "centroid", "flux", "balance", "correlation", "dc", "crest")}
    spectra = []
    previous = None
    for i in range(count):
        block = stereo[i * hop:i * hop + frame]
        m = mono[i * hop:i * hop + frame]
        rms = float(np.sqrt(np.mean(m * m) + 1e-12))
        spec = np.abs(np.fft.rfft(m * window)) + 1e-10
        norm = spec / np.sum(spec)
        band = np.array([np.mean(np.log1p(spec[(freqs >= bands[j]) & (freqs < bands[j + 1])]))
                         for j in range(len(bands) - 1)], dtype=np.float32)
        flux = 0.0 if previous is None else float(np.sqrt(np.mean((band - previous) ** 2)))
        previous = band
        left = float(np.sqrt(np.mean(block[:, 0] ** 2) + 1e-12))
        right = float(np.sqrt(np.mean(block[:, 1] ** 2) + 1e-12))
        corr = float(np.corrcoef(block[:, 0], block[:, 1])[0, 1]) if left > 1e-5 and right > 1e-5 else 1.0
        values["rms"].append(rms)
        values["lufs"].append(-0.691 + 10.0 * math.log10(rms * rms + 1e-12))
        values["centroid"].append(float(np.sum(freqs * norm)))
        values["flux"].append(flux)
        values["balance"].append((left - right) / max(left + right, 1e-9))
        values["correlation"].append(0.0 if not math.isfinite(corr) else corr)
        values["dc"].append(float(np.mean(m)))
        values["crest"].append(float(np.max(np.abs(m)) / max(rms, 1e-9)))
        spectra.append(band)
    out = {k: np.asarray(v, np.float32) for k, v in values.items()}
    out["spectrum"] = np.stack(spectra)
    out["hop_seconds"] = np.asarray([HOP_SECONDS], np.float32)
    return out


def _robust_z(x: np.ndarray) -> np.ndarray:
    med = float(np.median(x))
    mad = float(np.median(np.abs(x - med)))
    return np.abs(x - med) / max(1.4826 * mad, 1e-6)


def _stable_score(f: dict[str, np.ndarray]) -> np.ndarray:
    score = (_robust_z(f["lufs"]) + _robust_z(f["centroid"]) + _robust_z(f["flux"]) +
             _robust_z(f["balance"]) + _robust_z(f["dc"])) / 5.0
    spectral_change = np.r_[0.0, np.sqrt(np.mean(np.diff(f["spectrum"], axis=0) ** 2, axis=1))]
    score += 0.5 * _robust_z(spectral_change)
    score += np.where(f["crest"] > 12.0, 4.0, 0.0)
    return score


def _trimmed_range(f: dict[str, np.ndarray]) -> tuple[int, int]:
    rms = f["rms"]
    median = float(np.median(rms[rms > 1e-6])) if np.any(rms > 1e-6) else 0.0
    floor = max(1e-5, median * 0.12)
    stable = _stable_score(f)
    valid = (rms > floor) & (stable < 4.0) & (f["crest"] < 18.0)
    indices = np.flatnonzero(valid)
    if not len(indices):
        return 0, 0
    return int(indices[0]), int(indices[-1] + 1)


def _cosine_distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(1.0 - np.dot(a, b) / max(np.linalg.norm(a) * np.linalg.norm(b), 1e-9))


def _boundary_metrics(f: dict[str, np.ndarray], s: int, e: int, audio: np.ndarray) -> dict:
    def edge(x: np.ndarray, i: int) -> np.ndarray:
        return np.mean(x[max(0, i - 2):min(len(x), i + 3)], axis=0)
    a_spec, b_spec = edge(f["spectrum"], s), edge(f["spectrum"], e - 1)
    rms_a, rms_b = float(edge(f["rms"], s)), float(edge(f["rms"], e - 1))
    n = min(int(0.5 * ANALYSIS_RATE), s * int(HOP_SECONDS * ANALYSIS_RATE),
            len(audio) - e * int(HOP_SECONDS * ANALYSIS_RATE))
    start_sample = s * int(HOP_SECONDS * ANALYSIS_RATE)
    end_sample = min(len(audio), e * int(HOP_SECONDS * ANALYSIS_RATE))
    n = min(int(0.5 * ANALYSIS_RATE), end_sample - start_sample)
    head = audio[start_sample:start_sample + n].mean(axis=1)
    tail = audio[end_sample - n:end_sample].mean(axis=1)
    corr = float(np.corrcoef(head, tail)[0, 1]) if n > 32 else 0.0
    return {
        "rms_db_diff": abs(20 * math.log10(max(rms_a, 1e-9)) - 20 * math.log10(max(rms_b, 1e-9))),
        "lufs_diff": abs(float(edge(f["lufs"], s)) - float(edge(f["lufs"], e - 1))),
        "spectrum_distance": _cosine_distance(a_spec, b_spec),
        "centroid_relative_diff": abs(float(edge(f["centroid"], s)) - float(edge(f["centroid"], e - 1))) / max(float(np.mean(f["centroid"][s:e])), 1.0),
        "flux_diff": abs(float(edge(f["flux"], s)) - float(edge(f["flux"], e - 1))),
        "stereo_balance_diff": abs(float(edge(f["balance"], s)) - float(edge(f["balance"], e - 1))),
        "waveform_correlation": 0.0 if not math.isfinite(corr) else corr,
        "dc_offset_diff": abs(float(edge(f["dc"], s)) - float(edge(f["dc"], e - 1))),
    }


def _candidate_ranges(f: dict[str, np.ndarray], audio: np.ndarray, duration: float,
                      variable: bool) -> list[tuple[int, int, dict, float]]:
    lo, hi = _trimmed_range(f)
    min_frames = int(8.0 / HOP_SECONDS)
    if hi - lo < min_frames:
        return []
    stable = _stable_score(f)
    # Long recordings keep the best 5-minute region; short recordings retain as much variation as possible.
    wanted_seconds = 300.0 if duration > 600.0 else duration
    if variable:
        wanted_seconds = min(wanted_seconds, max(8.0, duration * 0.6))
    target = min(hi - lo, int(wanted_seconds / HOP_SECONDS))
    target = max(min_frames, target)
    starts = np.linspace(lo, max(lo, hi - target), min(12, max(1, hi - target + 1)), dtype=int)
    ranges = []
    for s in np.unique(starts):
        e = min(hi, s + target)
        metrics = _boundary_metrics(f, int(s), int(e), audio)
        score = (metrics["rms_db_diff"] * 4 + metrics["lufs_diff"] * 2 +
                 metrics["spectrum_distance"] * 35 + metrics["centroid_relative_diff"] * 20 +
                 metrics["stereo_balance_diff"] * 12 + abs(metrics["dc_offset_diff"]) * 200 -
                 metrics["waveform_correlation"] * 8 + float(np.mean(stable[s:e])))
        ranges.append((int(s), int(e), metrics, float(score)))
    return sorted(ranges, key=lambda x: x[3])[:MAX_CANDIDATES]


def _fade_seconds(source: str, metrics: dict, segment_seconds: float) -> float:
    lo, hi = FADE_RANGES.get(source, (3.0, 8.0))
    difficulty = min(1.0, metrics["spectrum_distance"] * 3 + metrics["rms_db_diff"] / 6)
    return min(segment_seconds / 4, lo + (hi - lo) * difficulty)


def _decode_segment(path: Path, ffmpeg: str, info: AudioInfo, start: float, duration: float) -> np.ndarray | None:
    rate = min(max(info.sample_rate, 8_000), 48_000)
    return _decode(path, ffmpeg, rate=rate, start=start, duration=duration)


def _refine_zero_crossing(x: np.ndarray, rate: int) -> tuple[np.ndarray, dict]:
    mono = x.mean(axis=1)
    radius = min(int(rate * 0.05), len(x) // 8)
    if radius < 8:
        return x, {"start_adjust_ms": 0.0, "end_adjust_ms": 0.0}
    start = int(np.argmin(np.abs(mono[:radius])))
    end_rel = int(np.argmin(np.abs(mono[-radius:])))
    end = len(x) - radius + end_rel
    if end - start < rate:
        return x, {"start_adjust_ms": 0.0, "end_adjust_ms": 0.0}
    return x[start:end], {"start_adjust_ms": start * 1000 / rate, "end_adjust_ms": (end - len(x)) * 1000 / rate}


def _equal_power_loop(segment: np.ndarray, rate: int, fade_seconds: float) -> np.ndarray:
    fade = min(int(rate * fade_seconds), len(segment) // 4)
    theta = np.linspace(0.0, math.pi / 2, fade, dtype=np.float32)
    mixed = segment[-fade:] * np.cos(theta)[:, None] + segment[:fade] * np.sin(theta)[:, None]
    peak = float(np.max(np.abs(mixed)))
    if peak > 0.999:
        mixed *= 0.999 / peak
    return np.concatenate((mixed, segment[fade:-fade]))


def _tile_to_minimum(loop: np.ndarray, rate: int, source: str) -> tuple[np.ndarray, int]:
    minimum = 120 if source in {"fan", "ventilation"} else 180
    count = max(1, math.ceil(minimum * rate / len(loop)))
    return np.tile(loop, (count, 1)), count


def _qa(loop: np.ndarray, rate: int) -> dict:
    edge = min(int(rate * 0.5), len(loop) // 4)
    head, tail = loop[:edge], loop[-edge:]
    mh, mt = head.mean(axis=1), tail.mean(axis=1)
    rms_h = float(np.sqrt(np.mean(mh * mh) + 1e-12))
    rms_t = float(np.sqrt(np.mean(mt * mt) + 1e-12))
    spec_h = np.abs(np.fft.rfft(mh * np.hanning(len(mh)))) + 1e-9
    spec_t = np.abs(np.fft.rfft(mt * np.hanning(len(mt)))) + 1e-9
    peak = float(np.max(np.abs(np.concatenate((head, tail)))))
    delta = float(np.max(np.abs(np.diff(np.concatenate((tail, head)), axis=0))))
    corr = float(np.corrcoef(mh, mt)[0, 1]) if edge > 32 else 0.0
    balance = lambda x: (float(np.sqrt(np.mean(x[:, 0] ** 2))) - float(np.sqrt(np.mean(x[:, 1] ** 2)))) / max(float(np.sqrt(np.mean(x[:, 0] ** 2))) + float(np.sqrt(np.mean(x[:, 1] ** 2))), 1e-9)
    metrics = {
        "rms_db_jump": abs(20 * math.log10(rms_h) - 20 * math.log10(rms_t)),
        "spectrum_distance": _cosine_distance(spec_h, spec_t),
        "click_peak_delta": delta,
        "peak": peak,
        "silence_dbfs": min(20 * math.log10(rms_h), 20 * math.log10(rms_t)),
        "dc_offset_diff": abs(float(np.mean(mh)) - float(np.mean(mt))),
        "stereo_balance_diff": abs(balance(head) - balance(tail)),
        "waveform_correlation": 0.0 if not math.isfinite(corr) else corr,
    }
    failures = []
    limits = {"rms_db_jump": 3.0, "spectrum_distance": 0.35, "click_peak_delta": 0.35,
              "peak": 0.9995, "silence_dbfs": -60.0, "dc_offset_diff": 0.03,
              "stereo_balance_diff": 0.25}
    if metrics["rms_db_jump"] > limits["rms_db_jump"]: failures.append("rms_jump")
    if metrics["spectrum_distance"] > limits["spectrum_distance"]: failures.append("spectrum_jump")
    if metrics["click_peak_delta"] > limits["click_peak_delta"]: failures.append("click")
    if metrics["peak"] > limits["peak"]: failures.append("peak")
    if metrics["silence_dbfs"] < limits["silence_dbfs"]: failures.append("silence")
    if metrics["dc_offset_diff"] > limits["dc_offset_diff"]: failures.append("dc_offset")
    if metrics["stereo_balance_diff"] > limits["stereo_balance_diff"]: failures.append("stereo_image")
    penalty = (metrics["rms_db_jump"] * 7 + metrics["spectrum_distance"] * 45 +
               metrics["click_peak_delta"] * 35 + metrics["dc_offset_diff"] * 250 +
               metrics["stereo_balance_diff"] * 30 + max(0.0, -metrics["waveform_correlation"]) * 5)
    return {"score": round(max(0.0, 100.0 - penalty), 2), "passed": not failures,
            "failures": failures, "limits": limits,
            "metrics": {k: round(v, 6) for k, v in metrics.items()}, "boundaries_checked": 3}


def _encode(x: np.ndarray, rate: int, output: Path, ffmpeg: str) -> str | None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="ambloop_") as tmp:
        wav = Path(tmp) / "input.wav"
        with wave.open(str(wav), "wb") as writer:
            writer.setnchannels(2); writer.setsampwidth(2); writer.setframerate(rate)
            writer.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
        result = _run([ffmpeg, "-y", "-v", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5", str(output)], 1800)
    return None if result.returncode == 0 and output.exists() else result.stderr.decode(errors="replace")[:300]


def _copy_event_assets(current_assets: Path, staging: Path) -> None:
    for path in current_assets.rglob("events/*.ogg"):
        target = staging / path.relative_to(current_assets)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)


def build_deployment_loops(master_root: Path, current_assets: Path, staging: Path,
                           ffmpeg: str, ffprobe: str) -> tuple[dict, int]:
    originals = sorted(p for p in master_root.rglob("*") if p.is_file() and p.parent.name == "continuous")
    old_manifest = json.loads((current_assets / "manifest" / "sound_library.json").read_text(encoding="utf-8"))
    old_sources = {s["id"]: s for s in old_manifest["sources"]}
    staging.mkdir(parents=True, exist_ok=True)
    _copy_event_assets(current_assets, staging)
    report = {"analysis_version": 2, "processed_originals": 0, "sources": {}, "excluded": [], "errors": []}
    grouped: dict[str, list[Path]] = {}
    for path in originals:
        grouped.setdefault(path.parent.parent.name, []).append(path)

    deployed: dict[str, list[dict]] = {}
    modes: dict[str, str] = {}
    for source, paths in sorted(grouped.items()):
        if source not in STEADY | VARIABLE:
            modes[source] = "unsupported"
            report["excluded"].extend({"source": source, "file": p.name, "reason": "unsupported_continuous_category"} for p in paths)
            continue
        raw_candidates = []
        for path in paths:
            info = _probe(path, ffprobe)
            if info is None or info.duration < 8.0:
                report["excluded"].append({"source": source, "file": path.name, "reason": "unreadable_or_shorter_than_8s"})
                continue
            analysis = _decode(path, ffmpeg)
            if analysis is None:
                report["excluded"].append({"source": source, "file": path.name, "reason": "decode_failed"})
                continue
            f = _features(analysis, ANALYSIS_RATE)
            if not f:
                report["excluded"].append({"source": source, "file": path.name, "reason": "insufficient_frames"})
                continue
            ranges = _candidate_ranges(f, analysis, info.duration, source in VARIABLE)
            if not ranges:
                report["excluded"].append({"source": source, "file": path.name, "reason": "no_stable_region_after_trim"})
                continue
            report["processed_originals"] += 1
            raw_candidates.extend((score, path, info, s, e, metrics) for s, e, metrics, score in ranges)

        if not raw_candidates:
            modes[source] = "unsupported"
            continue
        raw_candidates.sort(key=lambda c: c[0])
        selected = raw_candidates[:MAX_CANDIDATES if source in VARIABLE else min(6, len(raw_candidates))]
        results = []
        for number, (_, path, info, s, e, boundary) in enumerate(selected, 1):
            start = s * HOP_SECONDS
            duration = min(info.duration - start, (e - s) * HOP_SECONDS)
            segment = _decode_segment(path, ffmpeg, info, start, duration)
            if segment is None:
                report["excluded"].append({"source": source, "file": path.name, "reason": "full_rate_segment_decode_failed"})
                continue
            rate = min(max(info.sample_rate, 8_000), 48_000)
            segment, zero = _refine_zero_crossing(segment, rate)
            fade = _fade_seconds(source, boundary, len(segment) / rate)
            if source in STEADY:
                seamless_audio = _equal_power_loop(segment, rate, fade)
                seamless_audio, seamless_tiles = _tile_to_minimum(seamless_audio, rate, source)
                qa = _qa(seamless_audio, rate)
                if qa["passed"]:
                    output_audio, tiles, seamless_eligible = seamless_audio, seamless_tiles, True
                else:
                    output_audio, tiles, seamless_eligible = segment, 1, False
            else:
                output_audio, tiles, seamless_eligible = segment, 1, False
                qa = _qa(_equal_power_loop(segment, rate, fade), rate)
            asset_id = f"{source}_loop_{number:03d}"
            out = staging / source / "continuous" / f"{asset_id}.ogg"
            error = _encode(output_audio, rate, out, ffmpeg)
            if error:
                report["errors"].append({"source": source, "file": path.name, "error": error})
                continue
            out_info = _probe(out, ffprobe)
            row = {"asset_id": asset_id, "path": f"ambience/{source}/continuous/{out.name}",
                   "duration_ms": int((out_info.duration if out_info else len(output_audio) / rate) * 1000),
                   "bytes": out.stat().st_size, "original": path.name,
                   "loop_start_seconds": round(start + zero["start_adjust_ms"] / 1000, 3),
                   "loop_end_seconds": round(start + duration + zero["end_adjust_ms"] / 1000, 3),
                   "crossfade_seconds": round(fade, 3), "tiles": tiles,
                   "seamless_eligible": seamless_eligible,
                   "boundary_features": {k: round(v, 6) for k, v in boundary.items()}, "qa": qa}
            results.append(row)
        if source in STEADY:
            passing = [r for r in results if r["seamless_eligible"]]
            if passing:
                best = max(passing, key=lambda r: r["qa"]["score"])
                deployed[source] = [best]
                modes[source] = "seamless"
                for row in results:
                    if row is not best:
                        (staging / row["path"].removeprefix("ambience/")).unlink(missing_ok=True)
            else:
                deployed[source] = results[:MAX_CANDIDATES]
                modes[source] = "crossfade" if results else "unsupported"
        else:
            # Runtime crossfade is safe even when a candidate's artificial seamless QA fails.
            deployed[source] = results[:MAX_CANDIDATES]
            modes[source] = "crossfade" if results else "unsupported"
        report["sources"][source] = {"loop_mode": modes[source], "candidates": results,
                                     "deployed": [r["asset_id"] for r in deployed.get(source, [])]}

    manifest_sources = []
    all_ids = sorted(set(old_sources) | set(grouped))
    for source in all_ids:
        old = old_sources.get(source, {"id": source, "category": "other", "display_name_key": f"source_{source}", "default_volume": 0.3, "events": []})
        events = old.get("events", [])
        mode = modes.get(source, "event" if events else "unsupported")
        if source not in grouped and events:
            mode = "event"
        manifest_sources.append({**{k: v for k, v in old.items() if k not in {"continuous", "loop_mode"}},
                                 "loop_mode": mode, "continuous": [
                                     {**{k: row[k] for k in ("asset_id", "path", "duration_ms")},
                                      "crossfade_ms": int(row["crossfade_seconds"] * 1000)}
                                     for row in deployed.get(source, [])],
                                 "events": events})
    manifest_dir = staging / "manifest"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    (manifest_dir / "sound_library.json").write_text(json.dumps({"version": 2, "sources": manifest_sources}, ensure_ascii=False, indent=2), encoding="utf-8")
    shutil.copy2(current_assets / "manifest" / "category_presets.json", manifest_dir / "category_presets.json")
    old_licenses = json.loads((current_assets / "manifest" / "licenses.json").read_text(encoding="utf-8"))
    old_license_by_id = {entry["asset_id"]: entry for entry in old_licenses.get("entries", [])}
    license_entries = []
    deployed_by_id = {row["asset_id"]: row for rows in deployed.values() for row in rows}
    for source in manifest_sources:
        for asset in source["events"]:
            license_entries.append(old_license_by_id.get(asset["asset_id"], {
                "asset_id": asset["asset_id"], "license_status": "unknown",
                "attribution_required": False, "original_filename": asset["asset_id"],
            }))
        for asset in source["continuous"]:
            row = deployed_by_id[asset["asset_id"]]
            license_entries.append({
                "asset_id": asset["asset_id"], "source_name": None, "creator": None,
                "source_page": None, "license": None, "license_status": "unknown",
                "attribution_required": False, "original_filename": row["original"],
                "original_archive": None,
            })
    (manifest_dir / "licenses.json").write_text(
        json.dumps({"version": 2, "entries": license_entries}, ensure_ascii=False, indent=2), encoding="utf-8")
    report_path = staging / "manifest" / "loop_deployment_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report, 1 if report["errors"] else 0
