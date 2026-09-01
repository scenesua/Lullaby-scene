# Rain drum debug audition

Available only on the existing debug host and localhost. Production and Android are not promoted by this experiment.

- Mixer: `rain_drum`, default off. The five CC0 tongue-drum previews are reshaped into short rain-on-metal hits rather than sustained notes.
- Preset: **비 오는 날, 처마 아래** / **Rain Beneath the Eaves**. Rain 45%, rain drum 28%, master 65%. No thunder or cafe audio.
- Rhythm: irregular one-to-four-hit groups, 75–260 ms inside a `타닥 / 탁 / 타다닥` group and 0.65–2.4 seconds between groups. Pitch varies narrowly per hit instead of following a scale melody.
- Each hit is 3.2 seconds: the pitched body damps quickly, while dark stereo early reflections and a diffuse room tail remain audible behind the rain. Up to eight reusable native-audio voices can overlap; an occupied voice is never restarted.
- Source provenance is unchanged. `tools/prepare_rain_texture.py` reproducibly performs the second-stage transient shaping. All five source pages are CC0; no public attribution entry is required or added.
- Background: `web/assets/simple-scenes/rain-eaves.webp`, generated with the built-in image-generation tool, then encoded as WebP. No existing background replaced.

## Final image prompt

Use case: photorealistic-natural. Asset type: landscape background photograph for a calm sleep and meditation sound mixer, 16:9 wide high-resolution. Primary request: 'A rainy day, sheltered beneath the eaves'. View from a dry wooden porch underneath traditional Korean tiled roof eaves, looking into a small lush green garden in soft late-afternoon rain. Roof edge across upper frame, a simple wooden post near the edge, water droplets falling off the eaves, small ripples on wet garden stones. A small unbranded dark steel tongue drum sits near the outer edge of the porch where a few drips reach it, subtle not a hero product. No people. Realistic natural textures, restful sheltered atmosphere, soft overcast light with gently luminous rain, muted greens and warm aged wood. Preserve calm low-contrast negative space in the center for overlay controls; detailed and naturally exposed, not pitch black, not horror, no lightning, no exaggerated neon or bloom. No writing, captions, logos or watermark. Single photographic scene, no UI.
