# Lullaby Scene v1.1.0-alpha.4

This is a prerelease build for testing before the stable v1.1.0 release.

## Performance changes

- Reworks continuous ambience playback so sources share one playback thread instead of creating one HandlerThread per source.
- Creates ExoPlayer instances lazily and uses only one player for single-file seamless loops.
- Moves event-sample asset loading off the service/UI thread while preserving weighted events and per-asset cooldowns.
- Reduces repeated catalog, manifest, source-count and mixer calculations.
- Coalesces rapid master-volume MediaSession traffic while keeping the slider responsive.
- Moves MediaSession snapshot JSON work away from the main thread and skips stale intermediate snapshots.
- Reduces sleep-timer update traffic and prevents timer-only changes from needlessly refreshing unrelated UI state.
- Cleans up MediaController parse/reconnect work with the ViewModel lifecycle.

## Existing v1.1.0 prerelease features retained

- Scene-first home screen and Passenger Aircraft Cabin journey runtime.
- Journey seek and previous/next phase controls.
- Semantic Macro controls and Android FX rack, including source-aware Space processing.
- Web-compatible `lullaby.scene.recipe` v1 sharing/import.
- Prerelease update channel and persistent prerelease signing flow.

## Important

This build continues the v1.1.0 alpha line after v1.1.0-alpha.3. It is not the final stable v1.1.0 release and may contain unfinished behavior.
