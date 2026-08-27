from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def write(path, value):
    (ROOT / path).write_text(value, encoding='utf-8')

def replace_once(value, old, new, label):
    if old not in value:
        raise SystemExit(f'missing patch target: {label}')
    return value.replace(old, new, 1)

# Register internal-only Android source IDs without exposing them in SourceCatalog.all.
p = 'app/src/main/java/com/scene/ambience/data/model/SourceCatalog.kt'
s = read(p)
if 'FOREST_TEMPLE_BAMBOO_BED("forest_temple_bamboo_bed")' not in s:
    s = replace_once(
        s,
        '    FOREST_TEMPLE_PATH_WALK("forest_temple_path_walk"),\n',
        '    FOREST_TEMPLE_PATH_WALK("forest_temple_path_walk"),\n    FOREST_TEMPLE_BAMBOO_BED("forest_temple_bamboo_bed"),\n',
        'forest temple bamboo internal SourceId',
    )
if 'FOREST_TEMPLE_HEART_SUTRA_EVENT("forest_temple_heart_sutra_event")' not in s:
    s = replace_once(
        s,
        '    FOREST_TEMPLE_HEART_SUTRA("forest_temple_heart_sutra"),\n',
        '    FOREST_TEMPLE_HEART_SUTRA("forest_temple_heart_sutra"),\n    FOREST_TEMPLE_HEART_SUTRA_EVENT("forest_temple_heart_sutra_event"),\n',
        'forest temple sutra internal SourceId',
    )
write(p, s)

# Bust the web mixer's audio URL because this revision is processed from the official original.
p = 'web/mixer-sources.json'
data = json.loads(read(p))
for source in data['sources']:
    if source.get('id') == 'forest_temple_heart_sutra':
        source['url'] = '/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_original_full_001.ogg?v=2'
        source['kind'] = 'continuous'
        break
else:
    raise SystemExit('mixer sutra source missing')
write(p, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# Correct attribution metadata: complete official source, but mixer processing is intentional.
p = 'app/src/main/assets/ambience/manifest/external_licenses.json'
data = json.loads(read(p))
for entry in data.get('entries', []):
    if entry.get('asset_id') == 'forest_temple_heart_sutra_original_full_001':
        entry['transformation'] = (
            'Complete official original recording used as the mixer source; voice-presence EQ/dynamics, '
            'temple-style multi-tap room echo/reverb, gain and limiting; stereo placement preserved with no panning; Ogg Opus.'
        )
        break
else:
    raise SystemExit('mixer sutra license entry missing')
write(p, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

# Correct web credits so they do not claim format-only conversion.
p = 'web/credits/index.html'
s = read(p)
s = s.replace(
    '믹서에서는 전체 원본 녹음을 음향 효과 처리 없이 Ogg Opus로 형식 변환해 처음부터 끝까지 반복 재생합니다.',
    '믹서에서는 전체 원본 녹음을 바탕으로 염불 음성의 존재감을 높이고 법당 계열의 잔향·에코와 다이내믹 제어를 더한 뒤, 좌우 패닝 없이 Ogg Opus로 변환해 처음부터 끝까지 반복 재생합니다.',
)
s = s.replace(
    'The Mixer uses the complete original recording with no audio-effect processing, converted only to Ogg Opus for playback and looped from beginning to end.',
    'The Mixer uses the complete original recording with enhanced chant presence, temple-style room echo/reverb and dynamics, preserves the original stereo placement without panning, then encodes it to Ogg Opus and loops it from beginning to end.',
)
write(p, s)
