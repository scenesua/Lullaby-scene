from __future__ import annotations

from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding="utf-8")


def once(value: str, old: str, new: str, label: str) -> str:
    if old not in value:
        raise SystemExit(f"missing patch target: {label}")
    return value.replace(old, new, 1)


def duration_ms(path: Path) -> int:
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=nw=1:nk=1", str(path)
    ], text=True).strip()
    return round(float(out) * 1000)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# ---------------------------------------------------------------------------
# Web Forest Temple runtime
# ---------------------------------------------------------------------------
p = "web/remaining-journeys-v1.js"
s = text(p)
s = once(s, "forest_temple_bamboo_wide_bed_001.ogg?v=1", "forest_temple_bamboo_wide_bed_001.ogg?v=2", "bamboo cache")
s = once(s, "gains:{departure:1,forest:.152,bowl:.227}", "gains:{departure:1,forest:.121,bowl:.227}", "bamboo gain")

# Promote the debug-approved shared temple room into the real runtime.  Reuse
# the same marker property so the debug bridge cannot double-connect it.
if "function attachTempleRoomFx(node)" not in s:
    marker = "  function activeNodes(){const cfg=config();return cfg?media[cfg.title[0]]||{}:{}}\n"
    if marker not in s:
        raise SystemExit("missing activeNodes marker")
    room_fx = r'''  let templeRoomImpulse=null;
  function createTempleRoomImpulse(audioCtx,seconds=2.8,decay=2.45){
    const length=Math.max(1,Math.floor(audioCtx.sampleRate*seconds)),buffer=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<length;i++){const t=1-i/length;data[i]=(Math.random()*2-1)*Math.pow(t,decay)*(0.82+0.18*Math.sin(i*0.017+channel))}}
    return buffer;
  }
  function attachTempleRoomFx(node){
    if(!node||node.__lullabyDebugTempleRoomFx||!ctx||!master)return;
    templeRoomImpulse??=createTempleRoomImpulse(ctx);
    const preDelay=ctx.createDelay(.2);preDelay.delayTime.value=.055;
    const reverbTone=ctx.createBiquadFilter();reverbTone.type='lowpass';reverbTone.frequency.value=5000;reverbTone.Q.value=.35;
    const convolver=ctx.createConvolver();convolver.buffer=templeRoomImpulse;
    const reverbWet=ctx.createGain();reverbWet.gain.value=.50;
    const echoDelay=ctx.createDelay(1);echoDelay.delayTime.value=.41;
    const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=4800;
    const echoWet=ctx.createGain();echoWet.gain.value=.065;
    const echoFeedback=ctx.createGain();echoFeedback.gain.value=.10;
    node.gain.connect(preDelay).connect(reverbTone).connect(convolver).connect(reverbWet).connect(master);
    node.gain.connect(echoDelay);echoDelay.connect(echoTone).connect(echoWet).connect(master);echoDelay.connect(echoFeedback).connect(echoDelay);
    node.__lullabyDebugTempleRoomFx={preDelay,reverbTone,convolver,reverbWet,echoDelay,echoTone,echoWet,echoFeedback};
  }
  function prepareTempleRoomFx(){
    if(activeJourneyId!=='forest_temple_journey')return;const events=eventNodes[activeJourneyId];attachTempleRoomFx(events?.heartSutra);attachTempleRoomFx(events?.moktak);
  }
'''
    s = s.replace(marker, marker + room_fx, 1)
    close_marker = "      eventNodes[activeJourneyId]=bucket;\n    }\n  }\n  function activeNodes()"
    if close_marker not in s:
        raise SystemExit("missing ensureNodes close marker")
    s = s.replace(close_marker, "      eventNodes[activeJourneyId]=bucket;\n    }\n    if(activeJourneyId==='forest_temple_journey')prepareTempleRoomFx();\n  }\n  function activeNodes()", 1)
write(p, s)

# ---------------------------------------------------------------------------
# Web Mixer: original full Korean recording is continuous; duplicate temple
# bowl is hidden.  Journey runtime still owns its processed event file.
# ---------------------------------------------------------------------------
p = "web/mixer-sources.json"
data = json.loads(text(p))
new_sources = []
found_chant = False
for src in data["sources"]:
    if src.get("id") == "forest_temple_bowl":
        continue
    if src.get("id") == "forest_temple_heart_sutra":
        src = {
            "id": "forest_temple_heart_sutra",
            "name": "Heart Sutra · Korean",
            "category": "travel",
            "kind": "continuous",
            "url": "/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_original_full_001.ogg?v=1",
            "defaultVolume": 5,
        }
        found_chant = True
    new_sources.append(src)
if not found_chant:
    raise SystemExit("forest_temple_heart_sutra mixer source missing")
data["sources"] = new_sources
data["version"] = max(int(data.get("version", 0)), 5)
write(p, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

# It is no longer a scheduled mixer event; it is a normal continuous source.
p = "web/player-v2.js"
s = text(p)
s = once(s, ",'forest_temple_heart_sutra'", "", "web journeyEventIds heart sutra")
write(p, s)

# Web credits now describe both uses accurately.
p = "web/credits/index.html"
s = text(p)
s = re.sub(
    r'<section><h2>현재 배포본</h2><p><strong>염불소리1</strong>.*?</p></section>',
    '<section><h2>현재 배포본</h2><p><strong>염불소리1</strong> — 김용배, 공유마당. <a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200196&amp;wrtSn=13254274" rel="noopener">원본 페이지</a> · <a href="https://creativecommons.org/licenses/by/4.0/deed.ko" rel="noopener">CC BY 4.0</a>. 믹서에서는 전체 원본 녹음을 음향 효과 처리 없이 Ogg Opus로 형식 변환해 처음부터 끝까지 반복 재생합니다. 숲속 절 여정에서는 같은 원본에서 만든 별도의 수면용 공간감·명료도 가공본을 사용합니다.</p></section>',
    s,
    count=1,
    flags=re.S,
)
s = re.sub(
    r'<section><h2>Current release</h2><p><strong>Yeombul Sori 1.*?</p></section>',
    '<section><h2>Current release</h2><p><strong>Yeombul Sori 1 (염불소리1)</strong> — Kim Yong-bae (김용배), Sharing Yard. <a href="https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200196&amp;wrtSn=13254274" rel="noopener">Source page</a> · <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. The Mixer uses the complete original recording with no audio-effect processing, converted only to Ogg Opus for playback and looped from beginning to end. The Forest Temple journey uses a separate sleep-oriented spatial/clarity derivative from the same source.</p></section>',
    s,
    count=1,
    flags=re.S,
)
write(p, s)

# ---------------------------------------------------------------------------
# Android source catalog: keep internal journey IDs available to the engine,
# but hide the duplicate temple bowl and expose the original Korean recording
# as a normal Travel mixer source.
# ---------------------------------------------------------------------------
p = "app/src/main/java/com/scene/ambience/data/model/SourceCatalog.kt"
s = text(p)
s = once(s,
    "        SourceDefinition(SourceId.FOREST_TEMPLE_BOWL, R.string.source_forest_temple_bowl, UiCategory.TRAVEL),\n",
    "",
    "hide duplicate app temple bowl",
)
s = once(s,
    "        SourceDefinition(SourceId.FOREST_TEMPLE_HEART_SUTRA, R.string.source_forest_temple_heart_sutra, UiCategory.JOURNEY_EVENTS),",
    "        SourceDefinition(SourceId.FOREST_TEMPLE_HEART_SUTRA, R.string.source_forest_temple_heart_sutra, UiCategory.TRAVEL),",
    "app chant mixer category",
)
write(p, s)

# App labels: source and journey event are Korean, not the stale Mandarin label.
for p, replacements in {
    "app/src/main/res/values-ko/scene_strings.xml": {
        "<string name=\"source_forest_temple_heart_sutra\">반야심경 · 중국어 독송</string>": "<string name=\"source_forest_temple_heart_sutra\">반야심경 · 한국어 독송</string>",
        "<string name=\"scene_event_forest_temple_heart_sutra\">멀리 들리는 반야심경 · 중국어</string>": "<string name=\"scene_event_forest_temple_heart_sutra\">멀리 들리는 반야심경 · 한국어</string>",
    },
    "app/src/main/res/values/scene_strings.xml": {
        "<string name=\"source_forest_temple_heart_sutra\">Heart Sutra · Mandarin</string>": "<string name=\"source_forest_temple_heart_sutra\">Heart Sutra · Korean</string>",
        "<string name=\"scene_event_forest_temple_heart_sutra\">Distant Heart Sutra · Mandarin</string>": "<string name=\"scene_event_forest_temple_heart_sutra\">Distant Heart Sutra · Korean</string>",
    },
}.items():
    s = text(p)
    for old, new in replacements.items():
        s = once(s, old, new, f"string {old[:50]}")
    write(p, s)

# Android manifest: visible forest_temple_heart_sutra becomes the untouched
# full recording; processed journey event moves to an internal-only source ID.
p = "app/src/main/assets/ambience/manifest/scene_sources.json"
data = json.loads(text(p))
sources = data["sources"]
by_id = {src["id"]: src for src in sources}

path_src = by_id["forest_temple_path_walk"]
path_src["default_volume"] = 0.34

bowl = by_id["forest_temple_bowl"]
bowl["default_volume"] = 0.227
bowl["continuous"] = [{
    "asset_id": "forest_temple_bowl_bed_001",
    "path": "ambience/forest_temple_journey/continuous/forest_temple_bowl_bed_001.ogg",
    "duration_ms": 77007,
    "crossfade_ms": 8000,
    "role": "bed",
    "tags": ["forest_temple", "singing_bowl", "distant", "meditation"],
    "provenance_id": "derived_singing_bowl_loop_001",
}]

moktak = by_id["forest_temple_moktak"]
moktak["default_volume"] = 0.09
moktak["events"] = [{
    "asset_id": "forest_temple_moktak_event_001",
    "path": "ambience/forest_temple_journey/events/forest_temple_moktak_event_001.ogg",
    "duration_ms": 77165,
    "role": "event",
    "tags": ["forest_temple", "moktak", "temple_right", "rhythmic"],
    "provenance_id": "freesound_jonopodmore_607215",
    "cooldown_ms": 210000,
}]

gravel = by_id["forest_temple_gravel"]
gravel["default_volume"] = 0.075
gravel["events"][0]["duration_ms"] = 26907

duration = duration_ms(ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_original_full_001.ogg")
chant = by_id["forest_temple_heart_sutra"]
chant.clear()
chant.update({
    "id": "forest_temple_heart_sutra",
    "category": "travel",
    "display_name_key": "source_forest_temple_heart_sutra",
    "default_volume": 0.05,
    "loop_mode": "seamless",
    "continuous": [{
        "asset_id": "forest_temple_heart_sutra_original_full_001",
        "path": "ambience/forest_temple_journey/continuous/forest_temple_heart_sutra_original_full_001.ogg",
        "duration_ms": duration,
        "role": "bed",
        "tags": ["heart_sutra", "korean", "chant", "original_full"],
        "provenance_id": "gongu_kim_yongbae_13254274",
    }],
    "events": [],
})

# Internal source for the journey's processed Korean event.
internal_id = "forest_temple_heart_sutra_event"
sources[:] = [src for src in sources if src.get("id") not in {"forest_temple_bamboo_bed", internal_id}]
insert_after = next(i for i, src in enumerate(sources) if src.get("id") == "forest_temple_path_walk") + 1
sources.insert(insert_after, {
    "id": "forest_temple_bamboo_bed",
    "category": "travel",
    "display_name_key": "source_bamboo_forest",
    "default_volume": 0.121,
    "loop_mode": "crossfade",
    "continuous": [{
        "asset_id": "forest_temple_bamboo_wide_bed_001",
        "path": "ambience/forest_temple_journey/continuous/forest_temple_bamboo_wide_bed_001.ogg",
        "duration_ms": 94744,
        "crossfade_ms": 8000,
        "role": "bed",
        "tags": ["forest_temple", "bamboo", "wide", "soft_clipped"],
        "provenance_id": "derived_bamboo_forest_wide_001",
    }],
    "events": [],
})
heart_index = next(i for i, src in enumerate(sources) if src.get("id") == "forest_temple_heart_sutra") + 1
sources.insert(heart_index, {
    "id": internal_id,
    "category": "travel",
    "display_name_key": "source_forest_temple_heart_sutra",
    "default_volume": 0.157,
    "loop_mode": "event",
    "continuous": [],
    "events": [{
        "asset_id": "forest_temple_heart_sutra_event_001",
        "path": "ambience/forest_temple_journey/events/forest_temple_heart_sutra_event_001.ogg",
        "duration_ms": 120196,
        "role": "event",
        "tags": ["forest_temple", "heart_sutra", "korean", "temple_right", "distant", "processed"],
        "provenance_id": "gongu_kim_yongbae_13254274",
        "cooldown_ms": 210000,
    }],
})
data["version"] = max(int(data.get("version", 0)), 12)
write(p, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

# Android journey parity with the approved web mix.
p = "app/src/main/java/com/scene/ambience/media/SceneOrchestrator.kt"
s = text(p)
s = once(s, "    private var templeEventJob: Job? = null\n", "    private var templeEventJob: Job? = null\n    private var templeForcedJob: Job? = null\n", "temple forced job")
s = once(s,
    "        templeEventJob?.cancel()\n        templeEventJob = null\n        ambientProfile?.manualEvents?.keys?.forEach { engine.setManualEventSource(it, false) }",
    "        templeEventJob?.cancel()\n        templeEventJob = null\n        templeForcedJob?.cancel()\n        templeForcedJob = null\n        ambientProfile?.manualEvents?.keys?.forEach { engine.setManualEventSource(it, false) }",
    "clear temple forced job",
)
s = once(s,
    "            if (enabled) startTempleEvents() else {\n                templeEventJob?.cancel()\n                templeEventJob = null\n            }",
    "            if (enabled) startTempleEvents() else {\n                templeEventJob?.cancel()\n                templeEventJob = null\n                templeForcedJob?.cancel()\n                templeForcedJob = null\n            }",
    "disable temple forced job",
)

# Force one Korean sutra exactly on entry to stage 3, then resume random queue.
marker = "    /** One queue owns every temple event, so scripture, moktak and footsteps never overlap. */\n    private fun startTempleEvents() {"
if marker not in s:
    raise SystemExit("temple event marker missing")
helper = '''    private fun forceTempleMeditationSutra() {
        if (templeForcedJob?.isActive == true) return
        templeEventJob?.cancel()
        templeEventJob = null
        templeForcedJob = scope.launch {
            val snapshot = _state.value
            if (snapshot.sceneId == FOREST_TEMPLE_JOURNEY && snapshot.randomEventsEnabled && engine.snapshot().playbackState == PlaybackState.PLAYING) {
                if (engine.triggerEventNow(SOURCE_FOREST_TEMPLE_HEART_SUTRA_EVENT, 1f, .48f)) {
                    _state.value = _state.value.copy(activeEventId = EVENT_FOREST_TEMPLE_HEART_SUTRA)
                    delay(120_196L)
                    if (_state.value.activeEventId == EVENT_FOREST_TEMPLE_HEART_SUTRA) _state.value = _state.value.copy(activeEventId = null)
                }
            }
            templeForcedJob = null
            if (_state.value.sceneId == FOREST_TEMPLE_JOURNEY && _state.value.randomEventsEnabled && engine.snapshot().playbackState == PlaybackState.PLAYING) startTempleEvents()
        }
    }

'''
s = s.replace(marker, helper + marker, 1)

s = once(s,
    "                if (phase !in listOf(STATE_FOREST_TEMPLE_COURTYARD, STATE_FOREST_TEMPLE_MEDITATION, STATE_FOREST_TEMPLE_RETURN)) continue",
    "                if (phase !in listOf(STATE_FOREST_TEMPLE_MEDITATION, STATE_FOREST_TEMPLE_RETURN)) continue",
    "temple random phases",
)
s = s.replace("SOURCE_FOREST_TEMPLE_HEART_SUTRA to EVENT_FOREST_TEMPLE_HEART_SUTRA", "SOURCE_FOREST_TEMPLE_HEART_SUTRA_EVENT to EVENT_FOREST_TEMPLE_HEART_SUTRA")
s = once(s,
    "                val scale = when (sourceId) {\n                    SOURCE_FOREST_TEMPLE_MOKTAK -> .90f\n                    SOURCE_FOREST_TEMPLE_GRAVEL -> .72f\n                    else -> .52f\n                }",
    "                val scale = 1f",
    "temple event level parity",
)
s = once(s,
    "                    SOURCE_FOREST_TEMPLE_MOKTAK -> 12_733L\n                    SOURCE_FOREST_TEMPLE_GRAVEL -> 26_907L\n                    SOURCE_FOREST_TEMPLE_HEART_SUTRA -> 132_764L",
    "                    SOURCE_FOREST_TEMPLE_MOKTAK -> 77_165L\n                    SOURCE_FOREST_TEMPLE_GRAVEL -> 26_907L\n                    SOURCE_FOREST_TEMPLE_HEART_SUTRA_EVENT -> 120_196L",
    "temple event durations",
)

# Detect entry to the meditation phase before state is updated.
s = once(s,
    "        val phase = plan.phaseAt(current.elapsedMs)\n        val event = when {",
    "        val phase = plan.phaseAt(current.elapsedMs)\n        val enteredTempleMeditation = current.sceneId == FOREST_TEMPLE_JOURNEY && current.stateId != phase && phase == STATE_FOREST_TEMPLE_MEDITATION\n        val event = when {",
    "meditation entry detection",
)
# Internal event source must remain recognized as the active journey event.
s = once(s,
    "            current.sceneId == FOREST_TEMPLE_JOURNEY && current.activeEventId?.startsWith(\"forest_temple_event_\") == true -> current.activeEventId",
    "            current.sceneId == FOREST_TEMPLE_JOURNEY && current.activeEventId?.startsWith(\"forest_temple_event_\") == true -> current.activeEventId",
    "forest temple event state anchor",
)
# Override generic fade logic: bamboo is audible from stage 1; bowl starts at stage 2.
anchor = "        profile.manualEvents.forEach { (source, base) -> desired[source] = base * (0.72f + 0.42f * m.cabinActivity) }\n        desired.forEach(::setVolumeIfChanged)"
if anchor not in s:
    raise SystemExit("ambient desired anchor missing")
override = "        profile.manualEvents.forEach { (source, base) -> desired[source] = base }\n        if (current.sceneId == FOREST_TEMPLE_JOURNEY) {\n            desired[SOURCE_FOREST_TEMPLE_BAMBOO] = .121f\n            desired[SOURCE_FOREST_TEMPLE_BOWL] = if (current.elapsedMs >= plan.departureEndMs) .227f else 0f\n        }\n        desired.forEach(::setVolumeIfChanged)\n        if (enteredTempleMeditation && current.randomEventsEnabled) forceTempleMeditationSutra()"
s = s.replace(anchor, override, 1)

s = once(s,
    "        const val SOURCE_FOREST_TEMPLE_BOWL = \"forest_temple_bowl\"\n",
    "        const val SOURCE_FOREST_TEMPLE_BOWL = \"forest_temple_bowl\"\n        const val SOURCE_FOREST_TEMPLE_BAMBOO = \"forest_temple_bamboo_bed\"\n",
    "bamboo source constant",
)
s = once(s,
    "        const val SOURCE_FOREST_TEMPLE_HEART_SUTRA = \"forest_temple_heart_sutra\"\n",
    "        const val SOURCE_FOREST_TEMPLE_HEART_SUTRA = \"forest_temple_heart_sutra\"\n        const val SOURCE_FOREST_TEMPLE_HEART_SUTRA_EVENT = \"forest_temple_heart_sutra_event\"\n",
    "sutra event source constant",
)
s = once(s,
    "                bedSources = mapOf(SOURCE_FOREST to .34f, SOURCE_FOREST_TEMPLE_BOWL to .09f),\n                arrivalSource = SOURCE_FOREST,\n                manualEvents = mapOf(\n                    SOURCE_FOREST_TEMPLE_MOKTAK to .10f,\n                    SOURCE_FOREST_TEMPLE_GRAVEL to .08f,\n                    SOURCE_FOREST_TEMPLE_HEART_SUTRA to .05f,\n                ),",
    "                bedSources = mapOf(SOURCE_FOREST_TEMPLE_BAMBOO to .121f, SOURCE_FOREST_TEMPLE_BOWL to .227f),\n                arrivalSource = SOURCE_FOREST_TEMPLE_BAMBOO,\n                manualEvents = mapOf(\n                    SOURCE_FOREST_TEMPLE_MOKTAK to .09f,\n                    SOURCE_FOREST_TEMPLE_GRAVEL to .075f,\n                    SOURCE_FOREST_TEMPLE_HEART_SUTRA_EVENT to .157f,\n                ),",
    "forest temple app profile sources",
)
s = once(s, "                departureVolume = .34f,\n                arrivalVolume = .30f,", "                departureVolume = 1f,\n                arrivalVolume = .121f,", "forest temple app profile levels")
write(p, s)

# ---------------------------------------------------------------------------
# Attribution manifest: keep journey derivative plus full original mixer asset.
# ---------------------------------------------------------------------------
p = "app/src/main/assets/ambience/manifest/external_licenses.json"
data = json.loads(text(p))
entries = data.setdefault("entries", [])
processed = next((e for e in entries if e.get("asset_id") == "forest_temple_heart_sutra_event_001"), None)
if processed is None:
    processed = {"asset_id": "forest_temple_heart_sutra_event_001"}
    entries.append(processed)
processed.update({
    "source_name": "염불소리1",
    "creator": "김용배",
    "source_page": "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200196&wrtSn=13254274",
    "license": "CC-BY-4.0",
    "license_status": "verified",
    "attribution_required": True,
    "original_filename": "염불소리1.wav",
    "provenance_id": "gongu_kim_yongbae_13254274",
    "sample_rate": 48000,
    "channels": 2,
    "duration_ms": 120196,
    "sha256": sha256(ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg"),
    "transformation": "Korean recitation derivative for the Forest Temple journey; voice-presence processing, dynamics, spatial echo/reverb, gain and fades; Ogg Opus",
})
original_asset = ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_original_full_001.ogg"
original = next((e for e in entries if e.get("asset_id") == "forest_temple_heart_sutra_original_full_001"), None)
if original is None:
    original = {"asset_id": "forest_temple_heart_sutra_original_full_001"}
    entries.append(original)
original.update({
    "source_name": "염불소리1",
    "creator": "김용배",
    "source_page": "https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?menuNo=200196&wrtSn=13254274",
    "license": "CC-BY-4.0",
    "license_status": "verified",
    "attribution_required": True,
    "original_filename": "염불소리1.wav",
    "provenance_id": "gongu_kim_yongbae_13254274",
    "sample_rate": 48000,
    "duration_ms": duration,
    "sha256": sha256(original_asset),
    "transformation": "Complete original recording; format conversion only to Ogg Opus for packaged playback. No EQ, compression, reverb, gain, pan, stem separation or trimming.",
})
data["version"] = max(int(data.get("version", 0)), 10)
write(p, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

# ---------------------------------------------------------------------------
# Debug cache/build markers.
# ---------------------------------------------------------------------------
p = "web/player/index.html"
s = text(p)
s = once(s, "/player-v2.js?v=18", "/player-v2.js?v=19", "debug player-v2 cache")
s = once(s, "/remaining-journeys-v1.js?v=32", "/remaining-journeys-v1.js?v=33", "debug remaining cache")
write(p, s)

p = "web/sw.js"
s = text(p)
s = re.sub(r"const CACHE='lullaby-scene-debug-v\d+'", "const CACHE='lullaby-scene-debug-v20'", s, count=1)
s = once(s, "/player-v2.js?v=18", "/player-v2.js?v=19", "debug SW player cache")
s = once(s, "/remaining-journeys-v1.js?v=32", "/remaining-journeys-v1.js?v=33", "debug SW remaining cache")
write(p, s)

p = "web/debug/index.html"
s = text(p)
s = once(s, "DEBUG_BUILD:2", "DEBUG_BUILD:3", "debug build marker")
s = once(s, '현재 디버그 버전 · <strong style="font-size:18px;color:#fff">#2</strong>', '현재 디버그 버전 · <strong style="font-size:18px;color:#fff">#3</strong>', "debug build banner")
write(p, s)

print(json.dumps({
    "original_duration_ms": duration,
    "original_sha256": sha256(original_asset),
    "processed_sha256": sha256(ROOT / "web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg"),
}, ensure_ascii=False))
