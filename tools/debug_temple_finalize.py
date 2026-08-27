from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old, new, 1)


# Forest Temple mix: bamboo forest -4 dB, singing bowl +2 dB,
# chant event +1 dB while retaining the existing vocal-stem +2 dB derivative.
remaining = Path('web/remaining-journeys-v1.js')
s = remaining.read_text()
s = replace_once(
    s,
    "gains:{departure:.34,forest:.34,bowl:.09}",
    "gains:{departure:.34,forest:.215,bowl:.113}",
    'Forest Temple gains',
)

# Locale-safe journey phase naming. Korean uses the explicit Korean label,
# English uses the canonical English label, and every other locale asks the
# catalog for the active-language translation before falling back to English.
old_locale = """  const korean=()=>((window.LullabyI18n?.language||document.documentElement.lang||'en')==='ko');
  const local=value=>value[korean()?1:0];
  const phaseName=value=>window.LullabyCatalogI18n?.phaseName?.(value[0])||local(value);"""
new_locale = """  const language=()=>String(window.LullabyI18n?.language||document.documentElement.lang||'en').trim();
  const languageBase=()=>language().toLowerCase().split('-')[0];
  const korean=()=>languageBase()==='ko';
  const local=value=>value[korean()?1:0];
  const phaseName=value=>{
    if(!Array.isArray(value))return String(value??'');
    const lang=language(),base=languageBase();
    if(base==='ko')return value[1]||value[0]||'';
    if(base==='en')return value[0]||value[1]||'';
    const translated=window.LullabyCatalogI18n?.phaseName?.(value[0],lang);
    return translated||value[0]||value[1]||'';
  };"""
s = replace_once(s, old_locale, new_locale, 'journey phase locale resolver')
s = replace_once(s, "sutra?.09:type==='gravel'?.075:.09", "sutra?.101:type==='gravel'?.075:.09", 'scheduled chant +1 dB')
s = replace_once(s, "sutra?.14:picked==='gravel'?.075:.09", "sutra?.157:picked==='gravel'?.075:.09", 'debug chant +1 dB')
remaining.write_text(s)

# Debug singing-bowl preview should track the same +2 dB adjustment.
bridge = Path('web/debug-bridge-v1.js')
s = bridge.read_text()
s = replace_once(
    s,
    "node.filter.frequency.value=4400;node.gain.gain.value=.18;templeBowlPreviewNode=node;return node;",
    "node.filter.frequency.value=4400;node.gain.gain.value=.227;templeBowlPreviewNode=node;return node;",
    'bowl preview base +2 dB',
)
s = replace_once(
    s,
    "node.gain.gain.setValueAtTime(.18,ctx.currentTime)",
    "node.gain.gain.setValueAtTime(.227,ctx.currentTime)",
    'bowl preview trigger +2 dB',
)
bridge.write_text(s)

# Force the debug console to inject the newly versioned bridge.
console = Path('web/debug-console-v1.js')
s = console.read_text()
s = replace_once(
    s,
    "doc.getElementById('lullabyDebugBridgeForceV7')?.remove();for(const id of['lullabyDebugBridgeForceV6','lullabyDebugBridgeForceV5','lullabyDebugBridgeForceV4'])doc.getElementById(id)?.remove();const script=doc.createElement('script');script.id='lullabyDebugBridgeForceV7';script.src=`/debug-bridge-v1.js?v=7&force=${Date.now()}`",
    "doc.getElementById('lullabyDebugBridgeForceV8')?.remove();for(const id of['lullabyDebugBridgeForceV7','lullabyDebugBridgeForceV6','lullabyDebugBridgeForceV5','lullabyDebugBridgeForceV4'])doc.getElementById(id)?.remove();const script=doc.createElement('script');script.id='lullabyDebugBridgeForceV8';script.src=`/debug-bridge-v1.js?v=8&force=${Date.now()}`",
    'debug bridge v8 injection',
)
s = replace_once(s, '최신 브리지 v7', '최신 브리지 v8', 'debug bridge notice v8')
console.write_text(s)

# Cache/version bumps.
player = Path('web/player/index.html')
s = player.read_text()
s = replace_once(s, '/remaining-journeys-v1.js?v=29', '/remaining-journeys-v1.js?v=30', 'player remaining journeys v30')
s = replace_once(s, '/debug-bridge-v1.js?v=7', '/debug-bridge-v1.js?v=8', 'player debug bridge v8')
player.write_text(s)

debug = Path('web/debug/index.html')
s = debug.read_text()
s = replace_once(s, '/debug-console-v1.js?v=8', '/debug-console-v1.js?v=9', 'debug console v9')
debug.write_text(s)

sw = Path('web/sw.js')
s = sw.read_text()
s = replace_once(s, "const CACHE='lullaby-scene-debug-v16'", "const CACHE='lullaby-scene-debug-v17'", 'debug cache v17')
s = replace_once(s, '/remaining-journeys-v1.js?v=29', '/remaining-journeys-v1.js?v=30', 'sw remaining journeys v30')
s = replace_once(s, '/debug-console-v1.js?v=8', '/debug-console-v1.js?v=9', 'sw debug console v9')
s = replace_once(s, '/debug-bridge-v1.js?v=7', '/debug-bridge-v1.js?v=8', 'sw debug bridge v8')
sw.write_text(s)
