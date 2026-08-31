import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
await page.route('**/api/visitors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
await page.goto('http://127.0.0.1:4173/player/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.LullabyAudioStability?.version===2&&window.LullabyPlayerRuntime?.catalog?.length===55);

const direct=await page.evaluate(async()=>{
  const R=window.LullabyPlayerRuntime;
  const node=await R.makeSourceNode(R.sourceById.rain);
  R.nodes.rain=node;
  node.gain.gain.value=.4;
  R.setMaster(.5);
  window.LullabyAudioStability.syncDirectVolumes();
  return{
    direct:node.__lullabyDirect===true,
    hasWebAudioSource:!!node.src,
    hasFilter:!!node.filter,
    sourceGain:node.gain.gain.value,
    outputVolume:node.el.volume,
    runtimePatched:R.makeSourceNode===makeSourceNode,
    version:window.LullabyAudioStability.version
  };
});
if(!direct.direct||direct.hasWebAudioSource||direct.hasFilter||!direct.runtimePatched||direct.version!==2)throw new Error(`native mixer route missing: ${JSON.stringify(direct)}`);
if(Math.abs(direct.sourceGain-.4)>.001||Math.abs(direct.outputVolume-.2)>.02)throw new Error(`direct volume scaling mismatch: ${JSON.stringify(direct)}`);

const aircraft=await page.evaluate(async()=>{
  const R=window.LullabyPlayerRuntime;
  const node=await R.makeSourceNode(R.sourceById.aircraft_cabin);
  return{direct:node.__lullabyDirect===true,url:node.url,hasWebAudioSource:!!node.src};
});
if(!aircraft.direct||aircraft.hasWebAudioSource||!aircraft.url)throw new Error(`aircraft mixer source still routed through WebAudio: ${JSON.stringify(aircraft)}`);

const loopCrossfade=await page.evaluate(async()=>{
  const api=window.LullabyLoopCrossfade;
  await window.LullabyPlayerRuntime.ensureContext();
  const midpoint=api.gains(.5);
  const node=api.makeNode('/audio/scenes/hood_journey/hood_journey_bed_001.ogg',{durationSeconds:.8,fadeSeconds:.2});
  node.gain.gain.value=.001;
  await node.el.play();
  await new Promise(resolve=>setTimeout(resolve,1200));
  const playingVoices=node.voices.filter(voice=>!voice.el.paused).length;
  const state={enabled:node.__lullabyCrossfadeLoop,voices:node.voices.length,playingVoices,loopCount:node.loopCount,power:midpoint[0]**2+midpoint[1]**2,paused:node.el.paused};
  node.el.pause();
  state.stopped=node.voices.every(voice=>voice.el.paused);
  return state;
});
if(!loopCrossfade.enabled||loopCrossfade.voices!==2||loopCrossfade.loopCount<1||loopCrossfade.playingVoices<1||loopCrossfade.paused||!loopCrossfade.stopped||Math.abs(loopCrossfade.power-1)>.001)throw new Error(`equal-power loop crossfade failed: ${JSON.stringify(loopCrossfade)}`);

const timer=await page.evaluate(()=>{
  const R=window.LullabyPlayerRuntime;
  delete R.nodes.rain;
  return{backgroundMode:window.LullabyAudioStability.backgroundMode,directSourceCount:window.LullabyAudioStability.directSourceCount};
});
if(timer.backgroundMode!==false)throw new Error(`unexpected hidden state in foreground smoke: ${JSON.stringify(timer)}`);
const drumConfig=await page.evaluate(()=>{
  const R=window.LullabyPlayerRuntime,def=R.sourceById.rain_drum;
  R.startEventLayer(def);
  return{preview:def.previewOnly,notes:def.eventVariants.length,min:def.eventMinSeconds,max:def.eventMaxSeconds};
});
if(drumConfig.preview||drumConfig.notes!==5||drumConfig.min<.8||drumConfig.max>4)throw new Error('Rain drum public configuration');
await page.waitForFunction(()=>window.LullabyAudioStability.eventVoices.filter(v=>v.id==='rain_drum'&&!v.paused&&!v.ended).length>=2,{},{timeout:16000});
const drum=await page.evaluate(()=>{
  const R=window.LullabyPlayerRuntime,voices=()=>window.LullabyAudioStability.eventVoices.filter(v=>v.id==='rain_drum');
  const before=voices();
  R.eventState.rain_drum.volume=.1;
  window.LullabyAudioStability.syncDirectVolumes();
  const quiet=voices().every(v=>v.volume<=.1);
  R.stopEventLayer('rain_drum');
  return{overlap:before.filter(v=>!v.paused&&!v.ended).length,notes:new Set(before.map(v=>v.url)).size,quiet,stopped:voices().every(v=>v.paused),timer:R.eventState.rain_drum.timer};
});
if(drum.overlap<2||drum.notes<2||!drum.quiet||!drum.stopped||drum.timer!==null)throw new Error(`Rain drum overlap/volume/stop failed: ${JSON.stringify(drum)}`);
const porch=await page.evaluate(async()=>{
  const R=window.LullabyPlayerRuntime,preset=R.presets.find(p=>p.id==='preset_rain_eaves');
  await R.applyPreset(preset.id);
  const result={preview:preset.previewOnly,rain:R.getMixerUiState('rain'),drum:R.getMixerUiState('rain_drum'),name:window.LullabyLocales.presetName(preset.id)};
  stopAllMixer();return result;
});
if(porch.preview||!porch.rain.on||!porch.drum.on||porch.rain.volume!==45||porch.drum.volume!==28||porch.name!=='비 오는 날, 처마 아래')throw new Error(`Rain eaves preset failed: ${JSON.stringify(porch)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web audio stability v2 native-media smoke test passed');
