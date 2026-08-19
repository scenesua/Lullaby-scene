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
- Simple Scene Play/Pause/Stop controls without opening the full Mixer.
- Built-in and browser-saved Simple Scenes.
- Simple Scene FX: Warmth, Air, Room, and Glue.
- Full 21-source catalog in the standard Mixer.
- Quick Mixer rewrite:
  - selected Simple Scene sources stay at the top;
  - non-scene sources start dimmed and at 0%;
  - moving a 0% slider enables that source;
  - pressing Turn off/끔 stops the source and resets it to 0%;
  - added sources appear after the selected scene sources;
  - the Quick Mixer is available inside the Simple Scene content on narrow/mobile layouts and in the inspector on wide layouts.
- Visitor-counter runtime and Cloudflare Pages API code for today and all-time unique browser visitors.

## Implemented but requiring deployment configuration

### Visitor count

The UI and `/api/visitors` Cloudflare worker route are implemented. Actual numbers require a Cloudflare D1 database bound to the Pages project as `VISITOR_DB`. Until the binding exists, the site intentionally displays `—` instead of fabricated numbers.

The counter stores a SHA-256 hash of a locally generated browser identifier. It does not intentionally store the visitor IP address. “Today” uses Asia/Seoul calendar dates.

## Partially implemented

### Scene Arc

- Aircraft has a time-varying phase timeline.
- Simple Scenes do not yet have a generic Arrive / Settle / Drift / Sleep Scene Arc editor or runtime.

### Offline/PWA

- App shell and fetched audio can be cached by the service worker.
- There is no user-facing “download this scene for offline use” manager, cache-size display, or per-scene removal control yet.

### Advanced Mixer

Currently available:

- source enable/disable;
- per-source gain;
- category filtering;
- global Scene FX.

Still missing from the requested Advanced Mixer:

- per-source event density;
- distance and pan;
- per-source EQ;
- per-source room/send;
- a clear Basic/Advanced mode split.

### Saved scenes

- A current mix and FX snapshot can be saved locally as a Simple Scene.
- Favorites, rename/edit workflow, recipe import/export, and URL sharing are not complete.

### Attribution and diagnostics

- Privacy and Terms pages exist.
- A complete web attribution/license browser and capability/audio diagnostics page are not implemented yet.

## Not implemented yet

- Shareable Scene Recipe URLs with deterministic seed/state.
- Generic Scene Recipe compatibility shared with Android.
- Full Customize Scene editor with all semantic and source-level controls.
- Favorites and scene collections.
- Selected-scene offline download management.
- Capability diagnostics page covering codec, Web Audio, storage, PWA, and device limitations.
- Donation/support button and advertising placement.

## Known release blocker

The packaged Passenger Aircraft Cabin web bed is still the legacy short mono payload. The processing chain was made less muffled and the synthetic brown-noise layer and periodic gain wobble were removed, but the source asset itself still needs replacement with a verified longer stereo recording before the web player should be treated as audio-quality complete.

## Validation policy

The web branch remains a draft. It must not be described as complete or stable while required items above remain partial or missing. Quick Mixer behavior is covered by Chromium interaction tests for ordering, 0% inactive state, slider-to-enable, Turn off-to-0%, mobile visibility, language switching, and visitor-count rendering with a mocked API.
