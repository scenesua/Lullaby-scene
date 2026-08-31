# Web UI/UX baseline — 2026-08-30

This record captures the `origin/debug` UI before the staged UI/UX work.

## Captured routes and widths

- Home and player at 390×844, 768×1024, 1024×900, and 1440×1000.
- Full-page captures are stored in [`before/`](./before/).
- Raw layout measurements and console results are stored in [`before/baseline.json`](./before/baseline.json).

## Baseline findings

- No horizontal overflow was found at any target width.
- No uncaught page or console errors were found while loading either route.
- The primary web interaction smoke test passed.
- Home CTA controls were at least 48px high.
- Player controls reached a minimum of only 36px, below the 44px touch target used by this plan.
- The mobile home hero measured about 1030px high at 390px, so the primary message, CTA, and decorative orb did not share the first viewport.
- The desktop home hero measured 700px high at 1440px and left a large pause before the next section.

## Core behavior snapshot

The existing smoke flow confirmed mixer source toggling and volume, saved scenes, Journey controls, timers, settings, and player navigation before visual changes. Audio and Journey data are outside the scope of this UI pass.
