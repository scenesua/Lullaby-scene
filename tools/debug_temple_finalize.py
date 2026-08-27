from pathlib import Path
import json, hashlib

# Forest Temple: use bamboo forest from the very first stage, keep temple random events from stage 3.
remaining = Path('web/remaining-journeys-v1.js')
s = remaining.read_text()
s = s.replace("forest:['/audio/forest.ogg?v=3',7.857]", "forest:['/audio/bamboo_forest.ogg?v=1',94.744]")
s = s.replace('forest_temple_heart_sutra_event_001.ogg?v=3', 'forest_temple_heart_sutra_event_001.ogg?v=4')
remaining.write_text(s)

# Mixer source cache key for the newly separated/recombined chant derivative.
mixer = Path('web/mixer-sources.json')
s = mixer.read_text().replace('forest_temple_heart_sutra_event_001.ogg?v=2', 'forest_temple_heart_sutra_event_001.ogg?v=4')
mixer.write_text(s)

# Share exactly one temple-room impulse between the chant and standalone moktak event.
bridge = Path('web/debug-bridge-v1.js')
s = bridge.read_text()
old = """  function attachTempleSutraFx(node){
    if(!node||node.__lullabyDebugTempleFx||!ctx||!master)return;
    const preDelay=ctx.createDelay(.2);preDelay.delayTime.value=.055;
    const reverbTone=ctx.createBiquadFilter();reverbTone.type='lowpass';reverbTone.frequency.value=5000;reverbTone.Q.value=.35;
    const convolver=ctx.createConvolver();convolver.buffer=createTempleImpulse(ctx);
    const reverbWet=ctx.createGain();reverbWet.gain.value=.50;
    const echoDelay=ctx.createDelay(1);echoDelay.delayTime.value=.41;
    const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=4800;
    const echoWet=ctx.createGain();echoWet.gain.value=.065;
    const echoFeedback=ctx.createGain();echoFeedback.gain.value=.10;
    node.gain.connect(preDelay).connect(reverbTone).connect(convolver).connect(reverbWet).connect(master);
    node.gain.connect(echoDelay);echoDelay.connect(echoTone).connect(echoWet).connect(master);echoDelay.connect(echoFeedback).connect(echoDelay);
    node.__lullabyDebugTempleFx={preDelay,reverbTone,convolver,reverbWet,echoDelay,echoTone,echoWet,echoFeedback};
    record('event','Forest Temple Korean Heart Sutra FX ready · right-temple pan + 2.8s reverb + subtle echo');
  }
  async function prepareTempleSutraFx(){
    if(activeJourneyId!=='forest_temple_journey')return;
    const target=window.LullabyRemainingJourneys;await target?.ensureNodes?.();attachTempleSutraFx(target?.eventNode?.heartSutra);
  }
"""
new = """  let templeRoomImpulse=null;
  const sharedTempleRoomImpulse=()=>templeRoomImpulse||(templeRoomImpulse=createTempleImpulse(ctx));
  function attachTempleRoomFx(node,label='Temple event'){
    if(!node||node.__lullabyDebugTempleRoomFx||!ctx||!master)return;
    const preDelay=ctx.createDelay(.2);preDelay.delayTime.value=.055;
    const reverbTone=ctx.createBiquadFilter();reverbTone.type='lowpass';reverbTone.frequency.value=5000;reverbTone.Q.value=.35;
    const convolver=ctx.createConvolver();convolver.buffer=sharedTempleRoomImpulse();
    const reverbWet=ctx.createGain();reverbWet.gain.value=.50;
    const echoDelay=ctx.createDelay(1);echoDelay.delayTime.value=.41;
    const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=4800;
    const echoWet=ctx.createGain();echoWet.gain.value=.065;
    const echoFeedback=ctx.createGain();echoFeedback.gain.value=.10;
    node.gain.connect(preDelay).connect(reverbTone).connect(convolver).connect(reverbWet).connect(master);
    node.gain.connect(echoDelay);echoDelay.connect(echoTone).connect(echoWet).connect(master);echoDelay.connect(echoFeedback).connect(echoDelay);
    node.__lullabyDebugTempleRoomFx={preDelay,reverbTone,convolver,reverbWet,echoDelay,echoTone,echoWet,echoFeedback};
    record('event',`${label} FX ready · shared 2.8s temple room + subtle echo`);
  }
  async function prepareTempleEventFx(){
    if(activeJourneyId!=='forest_temple_journey')return;
    const target=window.LullabyRemainingJourneys;await target?.ensureNodes?.();const events=target?.eventNode;
    attachTempleRoomFx(events?.heartSutra,'Forest Temple Korean Heart Sutra');
    attachTempleRoomFx(events?.moktak,'Forest Temple Moktak');
  }
"""
if old not in s:
    raise SystemExit('expected old temple FX block not found')
s = s.replace(old, new).replace('await prepareTempleSutraFx()', 'await prepareTempleEventFx()')
bridge.write_text(s)

# Cache/version bumps.
player = Path('web/player/index.html')
s = player.read_text().replace('/remaining-journeys-v1.js?v=28','/remaining-journeys-v1.js?v=29').replace('/debug-bridge-v1.js?v=6','/debug-bridge-v1.js?v=7')
player.write_text(s)

console = Path('web/debug-console-v1.js')
s = console.read_text()
s = s.replace('lullabyDebugBridgeForceV6', 'lullabyDebugBridgeForceV7')
s = s.replace("['lullabyDebugBridgeForceV5','lullabyDebugBridgeForceV4']", "['lullabyDebugBridgeForceV6','lullabyDebugBridgeForceV5','lullabyDebugBridgeForceV4']")
s = s.replace('/debug-bridge-v1.js?v=6&force=', '/debug-bridge-v1.js?v=7&force=')
s = s.replace('최신 브리지 v6', '최신 브리지 v7')
console.write_text(s)

debug = Path('web/debug/index.html')
debug.write_text(debug.read_text().replace('/debug-console-v1.js?v=7','/debug-console-v1.js?v=8'))

sw = Path('web/sw.js')
s = sw.read_text().replace("const CACHE='lullaby-scene-debug-v15'", "const CACHE='lullaby-scene-debug-v16'")
s = s.replace('/remaining-journeys-v1.js?v=28','/remaining-journeys-v1.js?v=29').replace('/debug-console-v1.js?v=7','/debug-console-v1.js?v=8').replace('/debug-bridge-v1.js?v=6','/debug-bridge-v1.js?v=7')
sw.write_text(s)

# Update transformation note/hash for the current Korean chant derivative.
meta = Path('app/src/main/assets/ambience/manifest/external_licenses.json')
data = json.loads(meta.read_text())
target = next(e for e in data['entries'] if e.get('asset_id') == 'forest_temple_heart_sutra_event_001')
audio = Path('web/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg')
target['sha256'] = hashlib.sha256(audio.read_bytes()).hexdigest()
note = 'Demucs two-stem separation on current derivative; vocals stem +2 dB only; unchanged no-vocals stem recombined; 48 kHz stereo Ogg Opus 80 kbps VBR'
if note not in target.get('transformation',''):
    target['transformation'] = (target.get('transformation','') + '; ' + note).strip('; ')
data['version'] = max(int(data.get('version',1)), 9)
meta.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
