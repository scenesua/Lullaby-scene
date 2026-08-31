# Rain drum debug audition

Audition approved; promoted to the public web player and Android 1.1.16. The private debug console and its routing are not included in production.

- Mixer: `rain_drum`, default off; five real tongue-drum samples C3/D3/E3/G3/A3, not a recording of rain hitting an instrument.
- Preset: **비 오는 날, 처마 아래** / **Rain Beneath the Eaves**. Rain 45%, rain drum 28%, master 65%. No thunder or cafe audio.
- Random intervals: 0.9–3.8 seconds, with a 12% chance of an additional 1.8–2.6 second rest. No immediate pitch repetition; adjacent scale tones are weighted 4, next-nearest 2, larger jumps 1.
- Stereo tails are baked into 7.4-second assets. Up to eight reusable native-audio voices can overlap; an occupied voice is never restarted by a new note.
- Source provenance and reproducible audio processing: `tools/prepare_rain_drum.py`. All five source pages are CC0; no public attribution entry is required or added.
- Background: `web/assets/simple-scenes/rain-eaves.webp`, generated with the built-in image-generation tool, then encoded as WebP. No existing background replaced.
- Android copies use 32 kHz stereo Vorbis so 7.4 seconds decodes to under 1 MB of PCM16 per sample; the full tail is retained. Runtime selection shares the web's neighboring-note weights and rest ranges.

## Final image prompt

Use case: photorealistic-natural. Asset type: landscape background photograph for a calm sleep and meditation sound mixer, 16:9 wide high-resolution. Primary request: 'A rainy day, sheltered beneath the eaves'. View from a dry wooden porch underneath traditional Korean tiled roof eaves, looking into a small lush green garden in soft late-afternoon rain. Roof edge across upper frame, a simple wooden post near the edge, water droplets falling off the eaves, small ripples on wet garden stones. A small unbranded dark steel tongue drum sits near the outer edge of the porch where a few drips reach it, subtle not a hero product. No people. Realistic natural textures, restful sheltered atmosphere, soft overcast light with gently luminous rain, muted greens and warm aged wood. Preserve calm low-contrast negative space in the center for overlay controls; detailed and naturally exposed, not pitch black, not horror, no lightning, no exaggerated neon or bloom. No writing, captions, logos or watermark. Single photographic scene, no UI.
