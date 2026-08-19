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
await page.addStyleTag({url:'http://127.0.0.1:4173/mixer-controls-v14.css?v=14'});
await page.addScriptTag({url:'http://127.0.0.1:4173/player-runtime-bridge-v12.js?v=12'});
await page.addScriptTag({url:'http://127.0.0.1:4173/aircraft-source-v15.js?v=15'});
await page.addScriptTag({url:'http://127.0.0.1:4173/mixer-interaction-v14.js?v=14'});
await page.addScriptTag({url:'http://127.0.0.1:4173/simple-scene-quick-mixer-v12.js?v=12'});
await page.waitForFunction(()=>window.LullabyMixerInteraction&&window.LullabyQuickMixer&&window.LullabyPlayerRuntime?.catalog?.length===21);

await page.locator('[data-view="mixer"]').first().click();
await page.waitForTimeout(120);
const wind='#mixerGrid [data-source="wind"]';
const initial=await page.locator(wind).evaluate(row=>({on:row.classList.contains('on'),value:row.querySelector('[data-source-volume]')?.value}));
if(initial.on||initial.value!=='0')throw new Error(`full Mixer inactive source not 0/off: ${JSON.stringify(initial)}`);

// A burst of input events must not replace the range element while dragging.
await page.locator(`${wind} [data-source-volume]`).evaluate(input=>{
  window.__mixerRangeIdentity=input;
  for(const value of ['5','11','18','27']){
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
});
await page.waitForTimeout(220);
let state=await page.evaluate(()=>({same:window.__mixerRangeIdentity===document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]'),ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),value:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value}));
if(!state.same||!state.ui.on||Math.abs(state.ui.volume-27)>2||state.value!=='27')throw new Error(`full Mixer drag was rebuilt or did not enable: ${JSON.stringify(state)}`);
await page.locator(`${wind} [data-source-volume]`).evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(120);
state=await page.evaluate(()=>({ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),value:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value}));
if(state.ui.on||state.ui.volume!==0||state.value!=='0')throw new Error(`full Mixer 0% did not switch off: ${JSON.stringify(state)}`);

await page.locator('[data-view="scene"]').first().click();
await page.locator('[data-scene-mode="simple"]').click();
await page.locator('[data-preset="preset_rainy_cafe"]').click();
await page.waitForTimeout(300);
const quick='#inspectorMixerList [data-quick-source="wind"]';
let quickState=await page.locator(quick).evaluate(row=>({off:row.classList.contains('is-off'),value:row.querySelector('[data-quick-volume]')?.value}));
if(!quickState.off||quickState.value!=='0')throw new Error(`Quick Mixer inactive source not 0/off: ${JSON.stringify(quickState)}`);
await page.locator(`${quick} [data-quick-volume]`).evaluate(input=>{input.value='24';input.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(180);
quickState=await page.locator(quick).evaluate(row=>({on:row.classList.contains('is-on'),value:row.querySelector('[data-quick-volume]')?.value,output:row.querySelector('[data-quick-output]')?.textContent}));
if(!quickState.on||quickState.value!=='24'||quickState.output!=='24%')throw new Error(`Quick Mixer >0% did not switch on: ${JSON.stringify(quickState)}`);
await page.locator(`${quick} [data-quick-volume]`).evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(120);
quickState=await page.locator(quick).evaluate(row=>({off:row.classList.contains('is-off'),value:row.querySelector('[data-quick-volume]')?.value,output:row.querySelector('[data-quick-output]')?.textContent}));
if(!quickState.off||quickState.value!=='0'||quickState.output!=='0%')throw new Error(`Quick Mixer 0% did not switch off: ${JSON.stringify(quickState)}`);

// Journey progress rail is seekable without requiring audio playback.
await page.locator('[data-scene-mode="journey"]').click();
await page.waitForTimeout(80);
const track=page.locator('.journey-track');
if((await track.getAttribute('role'))!=='slider')throw new Error('journey track is not a seek slider');
const box=await track.boundingBox();if(!box)throw new Error('journey track has no layout box');
await page.mouse.click(box.x+box.width*.95,box.y+box.height/2);
await page.waitForTimeout(60);
const seekState=await page.evaluate(()=>({elapsed:window.LullabyJourneyRuntime?.elapsedMs,total:window.LullabyJourneyRuntime?.totalMs,phase:document.querySelector('#phaseLabel')?.textContent,aria:document.querySelector('.journey-track')?.getAttribute('aria-valuenow')}));
if(!seekState.elapsed||!seekState.total||seekState.elapsed/seekState.total<.93||seekState.elapsed/seekState.total>.97)throw new Error(`journey click seek failed: ${JSON.stringify(seekState)}`);
if(!['Descent','Approach'].includes(seekState.phase))throw new Error(`journey seek did not advance phase: ${JSON.stringify(seekState)}`);

const aircraft=await page.evaluate(async()=>({url:await getAircraftUrl(),meta:window.LullabyAircraftSource}));
if(aircraft.url!=='/audio/aircraft_cabin_cruise_v2.ogg'||aircraft.meta?.channels!==2||aircraft.meta?.durationSeconds!==105||aircraft.meta?.sourceId!=='freesound_jasonm911_853735')throw new Error(`clean long aircraft source override missing: ${JSON.stringify(aircraft)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web Mixer v14 + journey seek smoke test passed');
