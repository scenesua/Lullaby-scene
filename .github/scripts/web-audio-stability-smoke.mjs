import fs from 'node:fs';
import {createHash} from 'node:crypto';
import { chromium } from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const rainHashes={
  'c3.ogg':'063d35ccbbf3dac6337edb49a265f183f73c1529e4cf2f6b2e633e97c303e5c8',
  'd3.ogg':'8a715f53ced213ec84556a983c885228007107c3ac5f1215f8e6651605f71bbb',
  'e3.ogg':'96c0ac4938decc1dd2f725d4128eaf3e7ea6464f837b7c87903d8d27ab05571e',
  'g3.ogg':'4fd1c53583639da31ac1dd7f3ce9803c283b87dca12090004338d8b3f5dccf81',
  'a3.ogg':'bafd79dd518ec8a634ef03b391001f56ccfaa57afe744bdfedafb59a6f5f56ef'
};
for(const [name,expected] of Object.entries(rainHashes)){
  const bytes=fs.readFileSync(`web/audio/rain-drum/${name}`),actual=createHash('sha256').update(bytes).digest('hex');
  if(actual!==expected||bytes.length<8000)throw new Error(`Rain texture asset mismatch: ${name}`);
}
const forestBytes=fs.readFileSync('web/audio/forest.ogg');
if(createHash('sha256').update(forestBytes).digest('hex')!=='c92ff41bfecf55166d8cdfea5a160572d83a4f44d433964251ed7032dac360f9'||forestBytes.length<2000000)throw new Error('Long forest bed mismatch');

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

const forest=await page.evaluate(async()=>{
  const R=window.LullabyPlayerRuntime,node=await R.makeSourceNode(R.sourceById.forest);
  node.gain.gain.value=.001;await node.el.play();node.el.currentTime=node.loopDurationSeconds-node.loopFadeSeconds-.75;
  const deadline=performance.now()+15000;
  while(performance.now()<deadline&&(node.loopCount<1||node.voices.filter(voice=>!voice.el.paused).length<2)){
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const state={direct:!!node.__lullabyDirect,crossfade:!!node.__lullabyCrossfadeLoop,duration:node.loopDurationSeconds,fade:node.loopFadeSeconds,voices:node.voices?.length||0,playing:node.voices.filter(voice=>!voice.el.paused).length,loops:node.loopCount};
  node.el.pause();state.stopped=node.voices.every(voice=>voice.el.paused);return state;
});
if(forest.direct||!forest.crossfade||forest.duration!==226||forest.fade!==12||forest.voices!==2||forest.playing!==2||forest.loops<1||!forest.stopped)throw new Error(`forest mixer crossfade missing: ${JSON.stringify(forest)}`);

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
if(!drumConfig.preview||drumConfig.notes!==5||drumConfig.min<.6||drumConfig.max>2.5)throw new Error('Rain drum preview configuration');
await page.waitForFunction(()=>window.LullabyAudioStability.eventVoices.filter(v=>v.id==='rain_drum'&&!v.paused&&!v.ended).length>=2,{},{timeout:16000});
const drum=await page.evaluate(()=>{
  const R=window.LullabyPlayerRuntime,voices=()=>window.LullabyAudioStability.eventVoices.filter(v=>v.id==='rain_drum');
  const before=voices();
  R.eventState.rain_drum.volume=.1;
  window.LullabyAudioStability.syncDirectVolumes();
  const quiet=voices().every(v=>v.volume<=.1);
  R.stopEventLayer('rain_drum');
  return{overlap:before.filter(v=>!v.paused&&!v.ended).length,notes:new Set(before.map(v=>v.url)).size,rates:before.map(v=>v.playbackRate),quiet,stopped:voices().every(v=>v.paused),timer:R.eventState.rain_drum.timer};
});
if(drum.overlap<2||drum.notes<2||drum.rates.some(rate=>rate<.9||rate>1.1)||!drum.rates.some(rate=>Math.abs(rate-1)>.005)||!drum.quiet||!drum.stopped||drum.timer!==null)throw new Error(`Rain drum clustered overlap/pitch/volume/stop failed: ${JSON.stringify(drum)}`);
const porch=await page.evaluate(async()=>{
  const R=window.LullabyPlayerRuntime,preset=R.presets.find(p=>p.id==='preset_rain_eaves');
  await R.applyPreset(preset.id);
  const result={preview:preset.previewOnly,rain:R.getMixerUiState('rain'),drum:R.getMixerUiState('rain_drum'),name:window.LullabyLocales.presetName(preset.id)};
  stopAllMixer();return result;
});
if(!porch.preview||!porch.rain.on||!porch.drum.on||porch.rain.volume!==45||porch.drum.volume!==28||porch.name!=='비 오는 날, 처마 아래')throw new Error(`Rain eaves preset failed: ${JSON.stringify(porch)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web audio stability v2 native-media smoke test passed');
