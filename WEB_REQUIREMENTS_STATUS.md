# Lullaby Scene Web Requirements Status

Updated: 2026-08-19

This document tracks the web implementation against the requested product behavior. An item is not marked complete merely because a control is visible; it must be wired to the actual runtime and covered by validation where practical.

## Implemented on the web branch

- Separate branded landing page, web player, and download/install page.
- Responsive desktop/mobile player shell.
- Korean/English switching.
- PWA manifest, service worker, and install guidance.
- Scene-first navigation split into Sleep Journeys and Simple Scenes.
- Passenger Aircraft Cabin journey with 6h/8h/10h recommended buttons.
- Direct HH:MM journey duration with any positive duration and proportional phase compression.
- Seekable Passenger Aircraft Cabin progress rail:
  - click or drag to move to any point in the journey;
  - keyboard seek support;
  - phase, elapsed time, remaining time, seat-belt state, and event state update from the new position.
- Passenger Aircraft Cabin audio-quality repair:
  - verified Freesound `853735` (`jasonm911`) source lineage;
  - committed 105.0065-second, 48 kHz stereo Opus bed;
  - same processed binary is used by the Android prerelease branch;
  - natural source level/stereo retained with no broadband denoise, mono fold-down, loudness normalization, synthetic rumble, or artificial stereo widening;
  - persistent narrow tones near 10.544 kHz and 3.574 kHz are selectively attenuated;
  - circular five-second loop bridge replaces the legacy short-loop payload;
  - journey-specific short-delay stereo return and auxiliary ventilation layer removed to avoid comb-filter/whistling artifacts.
- Simple Scene Play/Pause/Stop controls without opening the full Mixer.
- Built-in and browser-saved Simple Scenes.
- Saved Scene management:
  - save the current master level, active source mix, source volumes, and Scene FX;
  - explicitly load a saved scene;
  - rename a saved scene without changing its ID or stored mix;
  - overwrite an existing saved scene with the current mix and FX while keeping its name;
  - existing browser-saved scenes remain compatible;
  - currently loaded saved scene is visually marked.
- Shareable Scene Recipe v1:
  - base64url JSON recipe in the `recipe=` query parameter;
  - shared canonical source IDs and normalized 0..1 gains;
  - Web recipe import/apply;
  - Android and Web use the same `lullaby.scene.recipe` v1 schema and source IDs.
- Simple Scene FX: Warmth, Air, Room, and Glue.
- Full 21-source catalog in the standard Mixer.
- Standard Mixer interaction rewrite:
  - inactive sources display 0%;
  - 0% means Off;
  - moving above 0% automatically enables/starts the source;
  - returning to 0% stops/disables it;
  - slider input updates without rebuilding the row on every input event, so pointer dragging remains continuous.
- Quick Mixer parity with the standard Mixer:
  - selected Simple Scene sources stay at the top;
  - non-scene sources start dimmed and at 0%;
  - 0% means Off and any value above 0% means On;
  - On/Off buttons and sliders use the same runtime state as the standard Mixer;
  - narrow/mobile layouts show the Quick Mixer inside the Simple Scene content and wide layouts also show it in the inspector.
- Visitor-counter runtime and Cloudflare Pages API code for today and all-time unique browser visitors.

## Implemented but requiring deployment configuration

### Visitor count

The UI and `/api/visitors` Cloudflare worker route are implemented. Actual numbers require a Cloudflare D1 database bound to the Pages project as `VISITOR_DB`. Until the binding exists, the site intentionally displays `—` instead of fabricated numbers.

The counter stores a SHA-256 hash of a locally generated browser identifier. It does not intentionally store the visitor IP address. “Today” uses Asia/Seoul calendar dates.

## Partially implemented

### Scene Arc

- Passenger Aircraft Cabin has a time-varying phase timeline and direct seeking.
- Simple Scenes do not yet have a generic Arrive / Settle / Drift / Sleep Scene Arc editor or runtime.

### Offline/PWA

- App shell and the current aircraft journey bed can be cached by the service worker.
- There is no user-facing “download this scene for offline use” manager, cache-size display, or per-scene removal control yet.

### Advanced Mixer

Currently available:

- source enable/disable;
- per-source gain with 0%=Off semantics;
- category filtering;
- global Scene FX.

Still missing from the requested Advanced Mixer:

- per-source event density;
- distance and pan;
- per-source EQ;
- per-source room/send;
- a clear Basic/Advanced mode split.

### Saved scenes and recipes

- Local save/load, rename, overwrite, Recipe v1 encoding/decoding, URL sharing, and URL import/apply are implemented.
- Favorites, standalone recipe-file import/export, deterministic random-event seed behavior, and scene collections are not complete.

### Attribution and diagnostics

- Privacy and Terms pages exist.
- A complete web attribution/license browser and capability/audio diagnostics page are not implemented yet.

## Not implemented yet

- Generic Simple Scene Arc runtime/editor.
- Full Customize Scene editor with all semantic and source-level controls.
- Favorites and scene collections.
- Selected-scene offline download management.
- Capability diagnostics page covering codec, Web Audio, storage, PWA, and device limitations.
- Complete attribution/license browser.
- Donation/support button and advertising placement.

## Remaining audio scope

The legacy short mono Passenger Aircraft Cabin release blocker is resolved on this branch: Web and Android now share the same cleaned 105.0065-second stereo bed from Freesound 853735. Dedicated takeoff, landing, seat-belt chime, captain, cabin-crew, and other event recordings are still not part of the journey, so those remain future content improvements rather than blockers for the base cabin loop.

## Validation policy

The web branch remains a draft and must not be described as a complete or stable release while required items above remain partial or missing. Chromium interaction coverage includes:

- full Mixer inactive=0%, >0 auto-enable, 0 auto-disable, and continuous drag without row replacement;
- Quick Mixer ordering, 0%/On/Off parity, and mobile visibility;
- Passenger Aircraft Cabin progress-rail seeking;
- the committed aircraft asset checksum and runtime metadata;
- Scene Recipe v1 round-trip/share URL wiring;
- saved-scene save, rename, overwrite, load, and active-state marking;
- duration controls, Scene FX, navigation, visitor rendering with a mocked API, and Korean/English localization.
