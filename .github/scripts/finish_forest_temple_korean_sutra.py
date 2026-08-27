#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / ".tmp_forest_temple_sources"
TMP.mkdir(exist_ok=True)

GONGU_PAGE = "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13254274&menuNo=200020"
GONGU_URLS = [
    "https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileDownload.do?wrtSn=13254274&fileSn=1",
    "https://gongu.copyright.or.kr/gongu/wrt/cmmn/wrtFileDownload.do?wrtSn=13254274&fileSn=1&wrtFileTy=01",
]
FREESOUND_PAGE = "https://freesound.org/people/the_very_Real_Horst/sounds/205999/"
FREESOUND_EMBED = "https://freesound.org/embed/sound/iframe/205999/simple/small/"

MOK_WEB = ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_moktak_event_001.ogg"
SUTRA_WEB = ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg"
MOK_ANDROID = ROOT / "app/src/main/assets/ambience/forest_temple_journey/events/forest_temple_moktak_event_001.ogg"
SUTRA_ANDROID = ROOT / "app/src/main/assets/ambience/forest_temple_journey/events/forest_temple_heart_sutra_event_001.ogg"

EXPECTED_MOK_SHA = "c0896a7f3b09c9f5f6aa01dcd2ca11a4c6d44e4454ece58d12499212837c00cd"
EXPECTED_SUTRA_SHA = "db9baecf2ff4473826a0fb96676741097817f74bed49d101d24ba0751263de7a"


def run(*args: str) -> None:
    print("+", " ".join(args), flush=True)
    subprocess.run(args, cwd=ROOT, check=True)


def fetch(url: str, out: Path, referer: str | None = None) -> None:
    headers = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/151 Safari/537.36"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=90) as response:
        out.write_bytes(response.read())


def valid_audio(path: Path) -> bool:
    try:
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
            cwd=ROOT,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def download_sources() -> tuple[Path, Path]:
    gongu = TMP / "gongu_13254274_yeombul1.wav"
    for url in GONGU_URLS:
        try:
            fetch(url, gongu, GONGU_PAGE)
            if valid_audio(gongu):
                break
        except Exception as exc:
            print("Gongu download attempt failed:", exc, flush=True)
    if not valid_audio(gongu):
        raise RuntimeError("Could not download the verified Gongu source as audio")

    pages: list[str] = []
    for url in (FREESOUND_PAGE, FREESOUND_EMBED):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                pages.append(response.read().decode("utf-8", "ignore"))
        except Exception as exc:
            print("Freesound page fetch failed:", url, exc, flush=True)

    candidates: list[str] = []
    pattern = re.compile(r"(?:https?:)?//(?:cdn\.freesound\.org/previews|freesound\.org/data/previews)/[^\"'<> ]+?\.mp3")
    relative = re.compile(r"/data/previews/205/[^\"'<> ]+?\.mp3")
    for raw in pages:
        normalized = html.unescape(raw).replace("\\/", "/").replace("\\u002F", "/")
        for value in pattern.findall(normalized):
            if value.startswith("//"):
                value = "https:" + value
            if "205999_" in value and value not in candidates:
                candidates.append(value)
        for value in relative.findall(normalized):
            value = "https://freesound.org" + value
            if "205999_" in value and value not in candidates:
                candidates.append(value)
    candidates.sort(key=lambda value: ("-hq.mp3" not in value, "-lq.mp3" in value, value))
    if not candidates:
        raise RuntimeError("Could not discover the public Freesound 205999 preview URL")

    mok = TMP / "moktak_continuous_205999_hq.mp3"
    last_error: Exception | None = None
    for url in candidates:
        try:
            print("Trying Freesound preview:", url, flush=True)
            fetch(url, mok, FREESOUND_PAGE)
            if valid_audio(mok):
                break
        except Exception as exc:
            last_error = exc
            print("Freesound preview failed:", exc, flush=True)
    if not valid_audio(mok):
        raise RuntimeError(f"Could not download Freesound preview: {last_error}")
    return gongu, mok


def render(gongu: Path, mok: Path) -> None:
    for path in (MOK_WEB, SUTRA_WEB, MOK_ANDROID, SUTRA_ANDROID):
        path.parent.mkdir(parents=True, exist_ok=True)

    run(
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(mok), "-i", str(mok), "-i", str(mok),
        "-filter_complex",
        "[0:a][1:a]acrossfade=d=1.25:c1=tri:c2=tri[m1];[m1][2:a]acrossfade=d=1.25:c1=tri:c2=tri,highpass=f=110,lowpass=f=6800,aecho=0.8:0.55:95|210:0.08|0.04,volume=3dB,alimiter=limit=0.9,afade=t=in:st=0:d=0.7,afade=t=out:st=75.5:d=1.45[out]",
        "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "libopus", "-b:a", "80k", "-vbr", "on", str(MOK_WEB),
    )
    run(
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(gongu),
        "-af",
        "highpass=f=120,lowpass=f=4300,acompressor=threshold=-34dB:ratio=3:attack=20:release=300:makeup=7dB,aecho=0.8:0.62:180|410|820:0.18|0.11|0.06,volume=8dB,alimiter=limit=0.78,afade=t=in:st=0:d=2,afade=t=out:st=117:d=3",
        "-ar", "48000", "-ac", "2", "-c:a", "libopus", "-b:a", "72k", "-vbr", "on", str(SUTRA_WEB),
    )
    shutil.copy2(MOK_WEB, MOK_ANDROID)
    shutil.copy2(SUTRA_WEB, SUTRA_ANDROID)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def replace_text(path: Path, replacements: list[tuple[str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    before = text
    for old, new in replacements:
        text = text.replace(old, new)
    if text != before:
        path.write_text(text, encoding="utf-8")


def update_metadata(mok_sha: str, sutra_sha: str) -> None:
    licenses_path = ROOT / "app/src/main/assets/ambience/manifest/external_licenses.json"
    licenses = json.loads(licenses_path.read_text(encoding="utf-8"))
    by_asset = {entry.get("asset_id"): entry for entry in licenses["entries"]}
    mok_entry = by_asset["forest_temple_moktak_event_001"]
    sutra_entry = by_asset["forest_temple_heart_sutra_event_001"]
    old_mok_sha = mok_entry.get("sha256", "")
    old_sutra_sha = sutra_entry.get("sha256", "")
    mok_entry.clear()
    mok_entry.update({
        "asset_id": "forest_temple_moktak_event_001",
        "source_name": "Fischtrommel_Muyu.mp3",
        "creator": "the_very_Real_Horst",
        "source_page": FREESOUND_PAGE,
        "license": "CC-BY-4.0",
        "license_status": "verified",
        "attribution_required": True,
        "original_filename": "Fischtrommel_Muyu.mp3",
        "provenance_id": "freesound_the_very_real_horst_205999",
        "original_sample_rate": 48000,
        "sample_rate": 48000,
        "channels": 2,
        "duration_ms": 77165,
        "sha256": mok_sha,
        "transformation": "Three full continuous wooden-fish performances joined with 1.25-second crossfades; 110 Hz high-pass; 6.8 kHz low-pass; mild 95/210 ms room reflections; level-adjusted and limited; click-safe edge fades; 48 kHz stereo Ogg Opus 80 kbps VBR.",
    })
    sutra_entry.clear()
    sutra_entry.update({
        "asset_id": "forest_temple_heart_sutra_event_001",
        "source_name": "염불소리1",
        "creator": "김용배",
        "source_page": GONGU_PAGE,
        "license": "CC-BY-4.0",
        "license_status": "verified",
        "attribution_required": True,
        "original_filename": "염불소리1.wav",
        "provenance_id": "gongu_kim_yongbae_13254274",
        "sample_rate": 48000,
        "channels": 2,
        "duration_ms": 120196,
        "sha256": sutra_sha,
        "transformation": "120 Hz high-pass; 4.3 kHz low-pass; dynamic control; 180/410/820 ms temple reflections; level-adjusted and limited; long fade-in/out; 48 kHz stereo Ogg Opus 72 kbps VBR.",
    })
    licenses["version"] = max(8, int(licenses.get("version", 0)) + 1)
    licenses_path.write_text(json.dumps(licenses, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    scene_path = ROOT / "app/src/main/assets/ambience/manifest/scene_sources.json"
    scene = json.loads(scene_path.read_text(encoding="utf-8"))
    sources = {entry["id"]: entry for entry in scene["sources"]}
    event = sources["forest_temple_moktak"]["events"][0]
    event["duration_ms"] = 77165
    event["tags"] = ["forest_temple", "moktak", "rhythmic", "continuous_performance", "temple_right"]
    event["provenance_id"] = "freesound_the_very_real_horst_205999"
    event = sources["forest_temple_heart_sutra"]["events"][0]
    event["duration_ms"] = 120196
    event["tags"] = ["forest_temple", "heart_sutra", "korean", "temple_right", "distant"]
    event["provenance_id"] = "gongu_kim_yongbae_13254274"
    scene["version"] = int(scene.get("version", 0)) + 1
    scene_path.write_text(json.dumps(scene, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    mixer_path = ROOT / "web/mixer-sources.json"
    mixer = json.loads(mixer_path.read_text(encoding="utf-8"))
    mix = {entry["id"]: entry for entry in mixer["sources"]}
    mix["forest_temple_moktak"]["name"] = "Rhythmic Temple Moktak"
    mix["forest_temple_moktak"]["url"] = "/audio/scenes/forest_temple_journey/forest_temple_moktak_event_001.ogg?v=2"
    mix["forest_temple_heart_sutra"]["name"] = "Heart Sutra · Korean"
    mix["forest_temple_heart_sutra"]["url"] = "/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg?v=2"
    mixer_path.write_text(json.dumps(mixer, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    common = [
        ("remaining-journeys-v1.js?v=24", "remaining-journeys-v1.js?v=25"),
        ("site-locales-v10.js?v=18", "site-locales-v10.js?v=19"),
        ("forest_temple_moktak_event_001.ogg?v=1',12733", "forest_temple_moktak_event_001.ogg?v=2',77165"),
        ("forest_temple_heart_sutra_event_001.ogg?v=1',132764", "forest_temple_heart_sutra_event_001.ogg?v=2',120196"),
        ("Forest Temple Moktak", "Rhythmic Temple Moktak"),
        ("Temple moktak", "Rhythmic temple moktak"),
        ("Temple Moktak", "Rhythmic Temple Moktak"),
        ("Moktak from the temple hall", "Rhythmic moktak from the temple hall"),
        ("법당에서 들리는 목탁", "이어지는 법당 목탁"),
        ("법당의 목탁", "이어지는 법당 목탁"),
        ("Heart Sutra · Mandarin", "Heart Sutra · Korean"),
        ("Distant Heart Sutra · Mandarin", "Distant Heart Sutra · Korean"),
        ("반야심경 · 중국어 독송", "반야심경 · 한국어 독송"),
        ("멀리 들리는 반야심경 · 중국어", "멀리 들리는 반야심경 · 한국어"),
    ]
    text_roots = [ROOT / "web", ROOT / "app/src/main", ROOT / ".github"]
    suffixes = {".js", ".mjs", ".html", ".xml", ".yml", ".yaml", ".json"}
    for base in text_roots:
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in suffixes:
                continue
            replacements = list(common)
            if old_mok_sha:
                replacements.append((old_mok_sha, mok_sha))
            if old_sutra_sha:
                replacements.append((old_sutra_sha, sutra_sha))
            replace_text(path, replacements)

    sw = ROOT / "web/sw.js"
    sw_text = sw.read_text(encoding="utf-8")
    match = re.search(r"const CACHE='lullaby-scene-site-v(\d+)'", sw_text)
    if not match:
        raise RuntimeError("Service-worker cache version not found")
    old = int(match.group(1))
    sw_text = sw_text[: match.start(1)] + str(old + 1) + sw_text[match.end(1) :]
    sw.write_text(sw_text, encoding="utf-8")


def update_credits() -> None:
    path = ROOT / "web/credits/index.html"
    text = path.read_text(encoding="utf-8")
    ko_old = '<section><h2>현재 배포본</h2><p>현재 배포본에는 별도의 저작자 표시가 필요한 CC BY 자료가 없습니다. 향후 CC BY 등 출처표시 의무가 있는 자료를 포함할 경우 이 페이지에 작품명, 저작자, 원문 링크, 라이선스와 수정 여부를 표시합니다.</p></section>'
    en_old = '<section><h2>Current release</h2><p>The current release contains no CC BY material that requires attribution. If a future release includes CC BY or other attribution-required material, this page will list its title, creator, source link, license, and modification notice.</p></section>'
    ko_new = '<section><h2>현재 배포본 · CC BY 4.0</h2><ul><li><strong>염불소리1</strong> — 김용배 — <a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13254274&amp;menuNo=200020" rel="noopener">공유마당 원문</a> — <a href="https://creativecommons.org/licenses/by/4.0/deed.ko" rel="noopener">CC BY 4.0</a>. 원본을 필터링하고 리버브·음량 조정·페이드 처리 후 Ogg Opus로 인코딩했습니다.</li><li><strong>Fischtrommel_Muyu.mp3</strong> — the_very_Real_Horst — <a href="https://freesound.org/people/the_very_Real_Horst/sounds/205999/" rel="noopener">Freesound 원문</a> — <a href="https://creativecommons.org/licenses/by/4.0/deed.ko" rel="noopener">CC BY 4.0</a>. 연주를 크로스페이드로 반복하고 필터링·리버브·음량 조정·페이드 처리 후 Ogg Opus로 인코딩했습니다.</li></ul></section>'
    en_new = '<section><h2>Current release · CC BY 4.0</h2><ul><li><strong>염불소리1</strong> — 김용배 — <a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13254274&amp;menuNo=200020" rel="noopener">Sharing Yard source</a> — <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. Filtered, reverberated, level-adjusted, faded, and encoded to Ogg Opus.</li><li><strong>Fischtrommel_Muyu.mp3</strong> — the_very_Real_Horst — <a href="https://freesound.org/people/the_very_Real_Horst/sounds/205999/" rel="noopener">Freesound source</a> — <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. Repeated with crossfades, filtered, reverberated, level-adjusted, faded, and encoded to Ogg Opus.</li></ul></section>'
    if ko_old not in text or en_old not in text:
        raise RuntimeError("Credits placeholder changed unexpectedly")
    path.write_text(text.replace(ko_old, ko_new).replace(en_old, en_new), encoding="utf-8")


def validate(mok_sha: str, sutra_sha: str) -> None:
    print("Rendered moktak SHA256:", mok_sha)
    print("Handover moktak SHA256:", EXPECTED_MOK_SHA)
    print("Rendered sutra SHA256:", sutra_sha)
    print("Handover sutra SHA256:", EXPECTED_SUTRA_SHA)
    for path in (MOK_WEB, SUTRA_WEB, MOK_ANDROID, SUTRA_ANDROID):
        if not valid_audio(path):
            raise RuntimeError(f"Invalid audio output: {path}")
    remaining = (ROOT / "web/remaining-journeys-v1.js").read_text(encoding="utf-8")
    required = [
        "forest_temple_moktak_event_001.ogg?v=2',77165",
        "forest_temple_heart_sutra_event_001.ogg?v=2',120196",
    ]
    for token in required:
        if token not in remaining:
            raise RuntimeError(f"Missing runtime token: {token}")


def main() -> None:
    gongu, mok = download_sources()
    render(gongu, mok)
    mok_sha = sha(MOK_WEB)
    sutra_sha = sha(SUTRA_WEB)
    update_metadata(mok_sha, sutra_sha)
    update_credits()
    validate(mok_sha, sutra_sha)


if __name__ == "__main__":
    main()
