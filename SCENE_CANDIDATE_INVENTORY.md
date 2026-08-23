# Full Scene / Journey candidate inventory

Updated: 2026-08-23

This inventory deliberately separates authored, time-varying journeys from static Simple Scene presets. A static preset is not counted as a full Scene.

| Candidate | Evidence | Existing audio in `D:/suno/test` | Android state before this change | Web state before this change | Full scene? | Priority |
|---|---|---|---|---|---|---|
| Train Journey | Built-in preset on both platforms; explicit journey name; door, acceleration, rail-bed and deceleration recordings form a complete travel arc | 4 directly usable recordings | Static preset only | Static preset only | Yes: implemented in this change | 1 |
| Night Ferry Journey | A coherent downloaded cluster of engine-room, stern, ferry ambience and wave recordings supports departure-to-arrival progression | 4+ relevant recordings | Implemented in this change | Implemented in this change | Yes | 2 |
| Spacecraft Journey | Two long spacecraft interior beds support a sleep-safe launch/drift/approach interpretation; promoted by product direction | `ambient-spacecraft-hum.wav` (17.8 s), `space-ship-atmosphere.wav` (160 s) | Implemented in this change | Implemented in this change | Yes | 3 |
| Submarine Voyage | Interior air-conditioner, engine-room, underwater movement and sonar provide distinct phases and controlled events | 5 relevant recordings | Implemented in this change | Implemented in this change | Yes | 4 |
| Rainy Cafe | Existing preset and several cafe/rain recordings could support opening-hours-to-quiet progression | Several long beds | Static preset | Static preset | Living Scene candidate, not yet a Journey | Later |
| Cozy Fireplace | Existing preset plus room tone, fire and house-creak recordings could support settling-fire progression | Several beds/events | Static preset | Static preset | Living Scene candidate, not yet a Journey | Later |
| Forest Night | Existing preset is already adequately represented by a stable ambience mix; no clear destination or authored arc found | Several ambience beds | Static preset | Static preset | Keep as Simple Scene | Filtered |
| Beach / Ocean Waves | Existing presets are stable loop experiences; no clear journey arc found | Several ocean beds | Static preset | Static preset | Keep as Simple Scene | Filtered |
| City Night | Existing preset is a stable city/rain mix; no clear authored progression found | Several city/rain beds | Static preset | Static preset | Keep as Simple Scene | Filtered |

## Audio inventory summary

- Source location: `D:/suno/test`
- Audio files inspected with `ffprobe`: 122
- Scene-relevant clusters: aircraft, train, ferry, spacecraft, submarine, cafe/rain, fireplace/cabin, forest, beach/ocean and city/night
- Non-Scene material retained but not selected: music/BGM exports, game audio, duplicates and files without enough semantic evidence
- Originals remain untouched. Selected Train recordings were copied into ignored raw staging before deterministic materialization.

## Selection rule

A candidate remains a full Journey when its audio and product identity support meaningful time progression, state changes and a recognizable arrival or settling point. Static environments are not removed wholesale: only those for which a Journey adds little beyond the existing Simple Scene are filtered.

## Handover-versus-repository notes

- The handover's recorded `main` SHA was historical; remote `main` was newer at implementation time.
- The Android scene work was newer on `work/lullaby-2.0-audio-foundation`, while `work/android-performance-prerelease` did not contain the current Scene foundation.
- The handover recorded PWA cache v34; the repository already used v35 before this change.
- Generic ambience ingest is optimized for reusable short loops/events. Train uses a small scene-specific materializer because it needs ordered, long-form transition/bed assets, while retaining the repository's 48 kHz stereo Ogg and manifest conventions.
