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
await page.addScriptTag({url:'http://127.0.0.1:4173/player-runtime-bridge-v12.js?v=13'});
await page.addScriptTag({url:'http://127.0.0.1:4173/mixer-interaction-v14.js?v=16'});
await page.addScriptTag({url:'http://127.0.0.1:4173/audio-stability-v1.js?v=2'});
await page.waitForFunction(()=>window.LullabyAudioStability?.version===2&&window.LullabyPlayerRuntime?.catalog?.length===50);

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

const timer=await page.evaluate(()=>{
  const R=window.LullabyPlayerRuntime;
  delete R.nodes.rain;
  return{backgroundMode:window.LullabyAudioStability.backgroundMode,directSourceCount:window.LullabyAudioStability.directSourceCount};
});
if(timer.backgroundMode!==false)throw new Error(`unexpected hidden state in foreground smoke: ${JSON.stringify(timer)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web audio stability v2 native-media smoke test passed');
