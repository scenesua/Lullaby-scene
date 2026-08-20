# Lullaby Scene v1.1.0-alpha.4

This is a prerelease build for testing before the stable v1.1.0 release.

## Performance changes

- Reworks continuous ambience playback so sources share one playback thread instead of creating one HandlerThread per source.
- Creates ExoPlayer instances lazily and uses only one player for single-file seamless loops.
- Moves event-sample asset loading off the service/UI thread while preserving weighted events and per-asset cooldowns.
- Caches source catalog and manifest indexes instead of rebuilding lookup collections during mixer updates.
- Coalesces rapid master-volume MediaSession traffic while keeping the slider responsive.
- Moves MediaSession snapshot JSON encode/decode work away from the main thread and skips stale intermediate snapshots.
- Reduces sleep-timer update traffic to one-second cadence and scopes countdown recomposition to Timer only.
- Scopes the Passenger Aircraft journey clock to Scenes so it no longer refreshes unrelated tabs each second.
- Stops rebuilding built-in presets for every UI-state emission and persists the last mix only when the mix actually changes.
- Cleans up MediaController parse/reconnect work with the ViewModel lifecycle.

## Existing v1.1.0 prerelease features retained

- Scene-first home screen and Passenger Aircraft Cabin journey runtime.
- Journey seek and previous/next phase controls.
- Semantic Macro controls and Android FX rack, including source-aware Space processing.
- Web-compatible `lullaby.scene.recipe` v1 sharing/import.
- Prerelease update channel and persistent prerelease signing flow.

## Important

This build continues the v1.1.0 alpha line after v1.1.0-alpha.3. It is not the final stable v1.1.0 release and may contain unfinished behavior.
