# Lullaby Scene audio-foundation handoff

Target branch: `work/lullaby-2.0-audio-foundation`

## First action

```bash
git fetch origin
git checkout work/lullaby-2.0-audio-foundation
git pull --ff-only
./gradlew testDebugUnitTest assembleDebug
```

Do not rebuild the work from `main`; this branch already contains the event scheduler fix, weighted/cooldown event selection, legacy-asset overrides, additive continuous/event manifests, provenance tooling, and generated fire/train events.

## Important staged-asset behavior

`continuous_extensions.json` and `event_extensions.json` deliberately contain paths for verified audio that may not be committed in a given checkout yet. `SoundLibraryRepository` probes packaged assets and skips missing staged entries, so a code-only pull must still start using the assets actually present in the APK. Do not remove this behavior.

When a later audio batch is copied into the declared asset paths, it becomes active without another Kotlin change.

## Verified audio batch

The importer is `tools/import_verified_audio_assets.py`. It pins original-source SHA-256 hashes, converts outputs to 48 kHz Vorbis, and writes provenance/license reports. If network access is available, run:

```bash
python tools/import_verified_audio_assets.py
python tools/audit_audio_assets.py
```

The already prepared batch contains train continuous beds and transition events, heavy rain, thunder events, indoor howling wind, and a cabin-only door-handle creak. Preserve the distinction between normal mixer sources and `scene_assets`.

## Legacy v1.0.3 assets

Do not delete the old files just because they are disabled by `asset_overrides.json`. They are retained for later trimming/reclassification. In particular, periodic thunder and the very short legacy train loops should not be restored as the primary continuous playback merely because they technically loop.

## Next implementation priorities

1. Confirm the branch builds and unit tests pass.
2. Run a manifest-vs-packaged-assets audit and report anything unexpected rather than silently changing paths.
3. Add the remaining verified audio batch when available.
4. Continue scene-state / causal-event implementation. Passenger-aircraft interior is an approved realistic scene alongside the previously planned scenes.
5. Keep `main` untouched until the branch is tested on-device.
