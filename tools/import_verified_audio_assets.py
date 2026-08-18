#!/usr/bin/env python3
"""Import pinned CC0/public-domain ambience assets and generate app-ready OGGs."""
from __future__ import annotations
import hashlib, json, os, subprocess, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
MANIFEST = ASSETS / "ambience/manifest"
CACHE = ROOT / ".cache/lullaby-audio"
CACHE.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "wikimedia_train_wheels": ("train_wheels.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/%D0%A1%D1%82%D1%83%D0%BA%20%D0%BA%D0%BE%D0%BB%D1%91%D1%81%20%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%B0.ogg", "3319448a22e30ee1ca36a4c5ef98e14e062077b1c985ce166e80ebf6a0df30b5", "Train wheels recorded in a wagon", "Ural-66", "https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D1%83%D0%BA_%D0%BA%D0%BE%D0%BB%D1%91%D1%81_%D0%BF%D0%BE%D0%B5%D0%B7%D0%B4%D0%B0.ogg", "CC0-1.0", "Стук_колёс_поезда.ogg"),
    "wikimedia_e233_acceleration": ("e233.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/E233-3000Accelerate.ogg", "97a2ef3a34132db4321e62ae4b7c50333b31581e861dd25ddc43da52d18b807f", "JR East E233-3000 acceleration", "E217", "https://commons.wikimedia.org/wiki/File:E233-3000Accelerate.ogg", "CC0-1.0", "E233-3000Accelerate.ogg"),
    "wikimedia_e231_deceleration": ("e231.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/E231Deceleration.ogg", "9f462cdcf96b642b2e6b0d09532b78f31a9ddcbe16f3df6e4eb1b2ea0e80021c", "JR East E231 deceleration", "E217", "https://commons.wikimedia.org/wiki/File:E231Deceleration.ogg", "CC0-1.0", "E231Deceleration.ogg"),
    "wikimedia_train_doors": ("train_doors.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Train%20doors%20closing.ogg", "a98f7c1de4368ee8e3bb7edd3a926f01fbfcf5bd7cd92d69c77118ef2728ee9b", "Train doors closing", "ezwa", "https://commons.wikimedia.org/wiki/File:Train_doors_closing.ogg", "Public-Domain", "Train_doors_closing.ogg"),
    "wikimedia_rain_1": ("rain.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain%20%281%29.ogg", "31efcbe952a3989a9276774e2d7be61a2dc98fdd785a94d1435fc19cda9a84d1", "Heavy rain", "ezwa", "https://commons.wikimedia.org/wiki/File:Rain_(1).ogg", "Public-Domain", "Rain_(1).ogg"),
    "wikimedia_rain_thunder": ("rain_thunder.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Rain%20and%20thunder.ogg", "cbfd7b7504bc4e53d6e56ac8d933ba56f97cc28f15a46800c74c2d8eccb3fa89", "Rain and thunder", "Caesar", "https://commons.wikimedia.org/wiki/File:Rain_and_thunder.ogg", "Public-Domain", "Rain_and_thunder.ogg"),
    "wikimedia_tonitrus": ("tonitrus.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tonitrus.ogg", "75c4d3911eedd1370db6aa30c90aee9e2eee3d18b429862eee6db221bcd0f421", "Thunder recorded in Southern Finland", "Mysid", "https://commons.wikimedia.org/wiki/File:Tonitrus.ogg", "Public-Domain", "Tonitrus.ogg"),
    "wikimedia_howling_wind": ("wind.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Howling%20wind.ogg", "cc585200603027ca808ab68ab4b381d1a828c55d58f010222f5ff687929d084d", "Howling wind in a building", "Tvabutzku1234", "https://commons.wikimedia.org/wiki/File:Howling_wind.ogg", "CC0-1.0", "Howling_wind.ogg"),
    "wikimedia_door_handle_creak": ("door_handle.ogg", "https://commons.wikimedia.org/wiki/Special:Redirect/file/Door%20handle%20creaking.ogg", "3f60aef66fd4df65e3d8a8859285f42e8a1ddaf80a89b0e4a20964321811b153", "Door handle creaking", "stephan", "https://commons.wikimedia.org/wiki/File:Door_handle_creaking.ogg", "Public-Domain", "Door_handle_creaking.ogg"),
}

JOBS = []
for i, start in enumerate((12, 90, 168), 1):
    JOBS.append((f"train_wikimedia_bed_{i:03d}", "wikimedia_train_wheels", f"ambience/train/continuous/train_wikimedia_bed_{i:03d}.ogg", start, 70, "highpass=f=28,loudnorm=I=-25:TP=-3:LRA=7,aresample=48000", 4))
JOBS += [
    ("train_acceleration_001", "wikimedia_e233_acceleration", "ambience/train/events/train_acceleration_001.ogg", 4, 5, "pan=mono|c0=.5*c0+.5*c1,highpass=f=45,loudnorm=I=-23:TP=-3:LRA=10,afade=t=in:d=0.04,afade=t=out:st=4.75:d=0.25,aresample=48000", 4),
    ("train_acceleration_002", "wikimedia_e233_acceleration", "ambience/train/events/train_acceleration_002.ogg", 18, 5, "pan=mono|c0=.5*c0+.5*c1,highpass=f=45,loudnorm=I=-23:TP=-3:LRA=10,afade=t=in:d=0.04,afade=t=out:st=4.75:d=0.25,aresample=48000", 4),
    ("train_deceleration_001", "wikimedia_e231_deceleration", "ambience/train/events/train_deceleration_001.ogg", .5, 5, "pan=mono|c0=.5*c0+.5*c1,highpass=f=45,loudnorm=I=-23:TP=-3:LRA=10,afade=t=in:d=0.04,afade=t=out:st=4.75:d=0.25,aresample=48000", 4),
    ("train_deceleration_002", "wikimedia_e231_deceleration", "ambience/train/events/train_deceleration_002.ogg", 19, 5, "pan=mono|c0=.5*c0+.5*c1,highpass=f=45,loudnorm=I=-23:TP=-3:LRA=10,afade=t=in:d=0.04,afade=t=out:st=4.75:d=0.25,aresample=48000", 4),
    ("train_doors_closing_001", "wikimedia_train_doors", "ambience/train/events/train_doors_closing_001.ogg", 4.25, 3.65, "pan=mono|c0=.5*c0+.5*c1,highpass=f=55,loudnorm=I=-22:TP=-2.5:LRA=10,afade=t=in:d=0.03,afade=t=out:st=3.35:d=0.3,aresample=48000", 4),
    ("rain_heavy_wikimedia_001", "wikimedia_rain_1", "ambience/rain/continuous/rain_heavy_wikimedia_001.ogg", None, None, "highpass=f=70,loudnorm=I=-29:TP=-5:LRA=7,aresample=48000", 4),
    ("thunder_rain_close_001", "wikimedia_rain_thunder", "ambience/thunder/events/thunder_rain_close_001.ogg", 2.1, 6, "highpass=f=28,lowpass=f=12000,loudnorm=I=-24:TP=-3:LRA=14,afade=t=out:st=5.55:d=0.45,aresample=48000", 4),
    ("thunder_rain_distant_001", "wikimedia_rain_thunder", "ambience/thunder/events/thunder_rain_distant_001.ogg", 11.1, 6, "highpass=f=28,lowpass=f=12000,loudnorm=I=-26:TP=-4:LRA=14,afade=t=out:st=5.55:d=0.45,aresample=48000", 4),
    ("thunder_rumble_001", "wikimedia_tonitrus", "ambience/thunder/events/thunder_rumble_001.ogg", 1.3, 6, "pan=mono|c0=.5*c0+.5*c1,highpass=f=24,lowpass=f=10000,loudnorm=I=-25:TP=-3.5:LRA=12,afade=t=out:st=5.45:d=0.55,aresample=48000", 4),
    ("thunder_rumble_002", "wikimedia_tonitrus", "ambience/thunder/events/thunder_rumble_002.ogg", 16, 6, "pan=mono|c0=.5*c0+.5*c1,highpass=f=24,lowpass=f=10000,loudnorm=I=-27:TP=-4:LRA=12,afade=t=out:st=5.45:d=0.55,aresample=48000", 4),
]
for i, start in enumerate((5, 47, 88), 1):
    JOBS.append((f"wind_building_{i:03d}", "wikimedia_howling_wind", f"ambience/wind/continuous/wind_building_{i:03d}.ogg", start, 35, "highpass=f=45,lowpass=f=7600,loudnorm=I=-29:TP=-5:LRA=7,aresample=48000", 3))
JOBS.append(("door_handle_creak_001", "wikimedia_door_handle_creak", "ambience/scene_assets/cabin/events/door_handle_creak_001.ogg", .05, 2.75, "pan=mono|c0=.5*c0+.5*c1,highpass=f=70,loudnorm=I=-24:TP=-4:LRA=10,afade=t=out:st=2.5:d=0.25,aresample=48000", 4))


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""): h.update(block)
    return h.hexdigest()


def source_file(source_id: str) -> Path:
    filename, url, expected, *_ = SOURCES[source_id]
    path = CACHE / filename
    if not path.exists() or digest(path) != expected:
        req = urllib.request.Request(url, headers={"User-Agent": "LullabySceneAssetImporter/1.0"})
        with urllib.request.urlopen(req, timeout=90) as r: path.write_bytes(r.read())
    actual = digest(path)
    if actual != expected: raise RuntimeError(f"hash mismatch {source_id}: {actual}")
    return path


def probe(path: Path) -> dict:
    raw = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration,size:stream=sample_rate,channels", "-of", "json", str(path)])
    data = json.loads(raw); stream = next(s for s in data["streams"] if s.get("sample_rate"))
    return {"duration_ms": round(float(data["format"]["duration"]) * 1000), "bytes": int(data["format"]["size"]), "sample_rate": int(stream["sample_rate"]), "channels": int(stream["channels"])}


def main() -> int:
    generated = {}
    for asset_id, source_id, rel, start, duration, afilter, quality in JOBS:
        target = ASSETS / rel; target.parent.mkdir(parents=True, exist_ok=True)
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
        if start is not None: cmd += ["-ss", str(start)]
        if duration is not None: cmd += ["-t", str(duration)]
        cmd += ["-i", str(source_file(source_id)), "-af", afilter, "-c:a", "libvorbis", "-q:a", str(quality), str(target)]
        env = os.environ.copy(); env["SOURCE_DATE_EPOCH"] = "0"; subprocess.run(cmd, check=True, env=env)
        generated[asset_id] = {"path": rel, "source": source_id, "sha256": digest(target), **probe(target)}

    transform = "trim/segment; optional mono mix and filters; EBU normalization; fades; Vorbis 48 kHz"
    entries = []
    for asset_id, source_id, *_ in JOBS:
        _, _, original_sha, name, creator, page, license_name, original = SOURCES[source_id]
        entries.append({"asset_id": asset_id, "source_name": name, "creator": creator, "source_page": page, "license": license_name, "license_status": "verified", "attribution_required": False, "original_filename": original, "original_archive": None, "provenance_id": source_id, "original_sha256": original_sha, **{k: generated[asset_id][k] for k in ("sha256", "sample_rate", "channels", "bytes")}, "transformation": transform})
    (MANIFEST / "external_licenses.json").write_text(json.dumps({"version": 1, "entries": entries, "generator": "tools/import_verified_audio_assets.py"}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (MANIFEST / "verified_asset_import_report.json").write_text(json.dumps({"version": 1, "outputs": generated}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": len(generated)})); return 0


if __name__ == "__main__": raise SystemExit(main())
