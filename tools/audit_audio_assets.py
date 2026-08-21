#!/usr/bin/env python3
"""Audit canonical, extension and legacy Lullaby Scene audio assets."""
from __future__ import annotations
import hashlib, json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
MANIFEST = ASSETS / "ambience/manifest"
OUT = ROOT / "build/audio-audit"


def read(name: str, default):
    p = MANIFEST / name
    try: return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default
    except Exception as e: return {"_error": f"{name}: {e}"}


def probe(path: Path):
    raw = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=sample_rate,channels,codec_name", "-of", "json", str(path)])
    d = json.loads(raw); s = next((x for x in d.get("streams", []) if x.get("sample_rate")), {})
    return {"duration_ms": round(float(d["format"].get("duration", 0)) * 1000), "bytes": int(d["format"].get("size", path.stat().st_size)), "sample_rate": int(s.get("sample_rate", 0)), "channels": int(s.get("channels", 0)), "codec": s.get("codec_name")}


def runtime_sources():
    base = read("sound_library.json", {"sources": []})
    cont = read("continuous_extensions.json", {"sources": {}})
    events = read("event_extensions.json", {"sources": {}})
    overrides = read("asset_overrides.json", {"sources": {}})
    blockers = [x.get("_error") for x in (base, cont, events, overrides) if x.get("_error")]
    merged = []
    for src in base.get("sources", []):
        src = dict(src); sid = src["id"]; ov = overrides.get("sources", {}).get(sid, {}); disabled = set(ov.get("disabled_asset_ids", []))
        src["loop_mode"] = ov.get("loop_mode", src.get("loop_mode", "crossfade"))
        src["continuous"] = [a for a in src.get("continuous", []) + cont.get("sources", {}).get(sid, []) if a.get("asset_id") not in disabled]
        src["events"] = [a for a in src.get("events", []) + events.get("sources", {}).get(sid, []) if a.get("asset_id") not in disabled]
        src["disabled_asset_ids"] = sorted(disabled); merged.append(src)
    return merged, blockers


def licenses():
    result = {}
    for name in ("licenses.json", "external_licenses.json"):
        for entry in read(name, {"entries": []}).get("entries", []): result[entry.get("asset_id")] = entry
    return result


def main():
    sources, blockers = runtime_sources(); license_by_id = licenses(); rows = []
    for src in sources:
        for key, kind in (("continuous", "continuous"), ("events", "event")):
            for asset in src.get(key, []): rows.append(check(asset, src["id"], kind, src.get("loop_mode"), license_by_id))
    for asset in read("scene_asset_catalog.json", {"assets": []}).get("assets", []): rows.append(check(asset, "scene_only", "event", "event", license_by_id))
    referenced = {r["path"] for r in rows}; packaged = {str(p.relative_to(ASSETS)).replace("\\", "/") for p in (ASSETS / "ambience").rglob("*.ogg")}
    report = {"schema_version": 1, "sources": len(sources), "assets": rows, "manifest_blockers": blockers, "missing": [r["path"] for r in rows if not r["exists"]], "unreferenced": sorted(packaged - referenced), "release_blockers": sum(r["release_blocker"] for r in rows) + len(blockers)}
    OUT.mkdir(parents=True, exist_ok=True); (OUT / "audio_audit_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Lullaby Scene audio audit", "", f"- Sources: {report['sources']}", f"- Assets: {len(rows)}", f"- Release blockers: {report['release_blockers']}", f"- Missing: {len(report['missing'])}", f"- Unreferenced OGGs: {len(report['unreferenced'])}", "", "| Source | Asset | Kind | License | Issues |", "|---|---|---|---|---|"]
    lines += [f"| {r['source_id']} | {r['asset_id']} | {r['kind']} | {r['license_status']} | {', '.join(r['issues']) or '-'} |" for r in rows]
    (OUT / "audio_audit_report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"assets": len(rows), "release_blockers": report["release_blockers"]})); return 0


def check(asset, source_id, kind, loop_mode, license_by_id):
    path = ASSETS / asset.get("path", ""); lic = license_by_id.get(asset.get("asset_id"), {}); issues = []
    row = {"asset_id": asset.get("asset_id"), "source_id": source_id, "kind": kind, "path": asset.get("path", ""), "exists": path.exists(), "license_status": lic.get("license_status", "unknown"), "issues": issues}
    if not path.exists(): issues.append("missing_file")
    else:
        try:
            row.update(probe(path)); row["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            if row["bytes"] > 25 * 1024 * 1024: issues.append("cloudflare_file_over_25_mib")
            if row["sample_rate"] not in (44100, 48000): issues.append("nonstandard_runtime_sample_rate")
            if abs(row["duration_ms"] - int(asset.get("duration_ms", 0))) > 300: issues.append("duration_manifest_mismatch")
            if kind == "event" and row["duration_ms"] > 6500: issues.append("event_too_long_for_soundpool")
            if source_id == "thunder" and kind == "continuous": issues.append("semantic_repetition_risk")
        except Exception as e: issues.append(f"analysis_error:{type(e).__name__}")
    if row["license_status"] != "verified": issues.append("license_provenance_unverified")
    row["release_blocker"] = bool(set(issues) & {"missing_file", "cloudflare_file_over_25_mib", "event_too_long_for_soundpool", "license_provenance_unverified"})
    return row


if __name__ == "__main__": raise SystemExit(main())
