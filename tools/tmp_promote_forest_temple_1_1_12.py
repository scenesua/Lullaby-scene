from pathlib import Path

# Android stable version.
p = Path('app/build.gradle.kts')
s = p.read_text(encoding='utf-8')
if 'versionCode = 20' not in s or 'versionName = "1.1.11"' not in s:
    raise SystemExit('unexpected Android version base')
s = s.replace('versionCode = 20', 'versionCode = 21', 1)
s = s.replace('versionName = "1.1.11"', 'versionName = "1.1.12"', 1)
p.write_text(s, encoding='utf-8')

# Production player asset cache-busters.
p = Path('web/player/index.html')
s = p.read_text(encoding='utf-8')
s = s.replace('/player-v2.js?v=18', '/player-v2.js?v=19')
s = s.replace('/remaining-journeys-v1.js?v=24', '/remaining-journeys-v1.js?v=25')
s = s.replace('/site-locales-v10.js?v=18', '/site-locales-v10.js?v=20')
p.write_text(s, encoding='utf-8')

# Every production page that loads locales gets the corrected catalog immediately.
for html in Path('web').rglob('*.html'):
    if 'debug' in html.parts:
        continue
    s = html.read_text(encoding='utf-8')
    updated = s.replace('/site-locales-v10.js?v=18', '/site-locales-v10.js?v=20')
    if updated != s:
        html.write_text(updated, encoding='utf-8')

# Keep the production service-worker namespace; bump only production cache refs.
p = Path('web/sw.js')
s = p.read_text(encoding='utf-8')
if "const CACHE='lullaby-scene-site-v77'" not in s:
    raise SystemExit('unexpected production SW cache base')
s = s.replace("const CACHE='lullaby-scene-site-v77'", "const CACHE='lullaby-scene-site-v78'", 1)
s = s.replace('/player-v2.js?v=18', '/player-v2.js?v=19')
s = s.replace('/remaining-journeys-v1.js?v=24', '/remaining-journeys-v1.js?v=25')
s = s.replace('/site-locales-v10.js?v=18', '/site-locales-v10.js?v=20')
p.write_text(s, encoding='utf-8')
