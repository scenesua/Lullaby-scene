import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
const benignAbort=value=>String(value).includes('AbortError: The play() request was interrupted by a call to pause()');
page.on('pageerror',error=>{if(!benignAbort(error))errors.push(String(error))});
page.on('console',message=>{if(message.type()==='error'&&!benignAbort(message.text()))errors.push(message.text())});
await page.route('**/api/visitors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
await page.goto('http://127.0.0.1:4173/player/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.LullabyMixerInteraction&&window.LullabyQuickMixer&&window.LullabyPlayerRuntime?.catalog?.length===54);

await page.locator('[data-view="mixer"]').first().click();await page.waitForTimeout(120);
const wind='#mixerGrid [data-source="wind"]';
const initial=await page.locator(wind).evaluate(row=>({on:row.classList.contains('on'),value:row.querySelector('[data-source-volume]')?.value}));
if(initial.on||initial.value!=='0')throw new Error(`full Mixer inactive source not 0/off: ${JSON.stringify(initial)}`);
await page.locator(`${wind} [data-source-volume]`).evaluate(input=>{window.__mixerRangeIdentity=input;for(const value of ['5','11','18','27']){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))}});
await page.waitForTimeout(220);
let state=await page.evaluate(()=>({same:window.__mixerRangeIdentity===document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]'),ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),value:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value}));
if(!state.same||!state.ui.on||Math.abs(state.ui.volume-27)>2||state.value!=='27')throw new Error(`full Mixer drag was rebuilt or did not enable: ${JSON.stringify(state)}`);
await page.locator(`${wind} [data-source-volume]`).evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(120);
state=await page.evaluate(()=>({ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),value:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value}));
if(state.ui.on||state.ui.volume!==0||state.value!=='0')throw new Error(`full Mixer 0% did not switch off: ${JSON.stringify(state)}`);

await page.locator('[data-view="scene"]').first().click();await page.locator('[data-scene-mode="simple"]').click();await page.locator('[data-preset="preset_rainy_cafe"]').click();await page.waitForTimeout(300);
const quick='#inspectorMixerList [data-quick-source="wind"]';
let quickState=await page.locator(quick).evaluate(row=>({off:row.classList.contains('is-off'),value:row.querySelector('[data-quick-volume]')?.value}));
if(!quickState.off||quickState.value!=='0')throw new Error(`Quick Mixer inactive source not 0/off: ${JSON.stringify(quickState)}`);
await page.locator(`${quick} [data-quick-volume]`).evaluate(input=>{input.value='24';input.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(180);
quickState=await page.locator(quick).evaluate(row=>({on:row.classList.contains('is-on'),value:row.querySelector('[data-quick-volume]')?.value,output:row.querySelector('[data-quick-output]')?.textContent}));
if(!quickState.on||quickState.value!=='24'||quickState.output!=='24%')throw new Error(`Quick Mixer >0% did not switch on: ${JSON.stringify(quickState)}`);
await page.locator(`${quick} [data-quick-volume]`).evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForTimeout(120);
quickState=await page.locator(quick).evaluate(row=>({off:row.classList.contains('is-off'),value:row.querySelector('[data-quick-volume]')?.value,output:row.querySelector('[data-quick-output]')?.textContent}));
if(!quickState.off||quickState.value!=='0'||quickState.output!=='0%')throw new Error(`Quick Mixer 0% did not switch off: ${JSON.stringify(quickState)}`);

await page.locator('[data-scene-mode="journey"]').click();await page.waitForTimeout(80);
const track=page.locator('.journey-track');
if((await track.getAttribute('role'))!=='slider')throw new Error('journey track is not a seek slider');
if(!(await page.locator('#journeyPrevPhase').isVisible())||!(await page.locator('#journeyNextPhase').isVisible()))throw new Error('explicit phase step buttons are not visible');

// Verify the physical progress rail before audio playback changes transport state.
const box=await track.boundingBox();if(!box)throw new Error('journey track has no layout box');
await page.mouse.click(box.x+box.width*.95,box.y+box.height/2);await page.waitForTimeout(80);
let seekState=await page.evaluate(()=>({elapsed:window.LullabyJourneyRuntime?.elapsedMs,total:window.LullabyJourneyRuntime?.totalMs,phase:document.querySelector('#phaseLabel')?.textContent,aria:document.querySelector('.journey-track')?.getAttribute('aria-valuenow')}));
if(!seekState.elapsed||!seekState.total||seekState.elapsed/seekState.total<.93||seekState.elapsed/seekState.total>.97)throw new Error(`journey click seek failed: ${JSON.stringify(seekState)}`);
if(!['Descent','Approach','하강','접근'].includes(seekState.phase))throw new Error(`journey seek did not advance phase: ${JSON.stringify(seekState)}`);
await page.evaluate(()=>document.getElementById('journeyPrevPhase')?.click());await page.waitForTimeout(350);
const prevState=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,ratio:window.LullabyJourneyRuntime.elapsedMs/window.LullabyJourneyRuntime.totalMs}));
if(!['Cruise','순항'].includes(prevState.phase)||prevState.ratio<.05||prevState.ratio>.07)throw new Error(`previous phase button failed: ${JSON.stringify(prevState)}`);
await page.evaluate(()=>document.getElementById('journeyNextPhase')?.click());await page.waitForTimeout(350);
const nextState=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,ratio:window.LullabyJourneyRuntime.elapsedMs/window.LullabyJourneyRuntime.totalMs}));
if(!['Descent','하강'].includes(nextState.phase)||nextState.ratio<.90||nextState.ratio>.93)throw new Error(`next phase button failed: ${JSON.stringify(nextState)}`);
await page.evaluate(()=>window.LullabyJourneyRuntime.seekToMs(0));await page.waitForTimeout(80);

// Start at Taxi out and verify the 627056 bed is the audible journey source.
await page.evaluate(()=>document.getElementById('scenePlay')?.click());await page.waitForTimeout(1300);
let audioState=await page.evaluate(()=>({phase:window.LullabyJourneyAudio?.phase,taxiReady:window.LullabyJourneyAudio?.taxiReady,taxiUrl:window.LullabyJourneyAudio?.taxiUrl,taxiGain:window.LullabyJourneyAudio?.taxiGain,cruiseGain:window.LullabyJourneyAudio?.cruiseGain}));
if(audioState.phase!=='Taxi out'||!audioState.taxiReady||audioState.taxiUrl!=='/audio/aircraft_cabin_taxi_627056_v1.ogg'||audioState.taxiGain<.25||audioState.cruiseGain>.08)throw new Error(`Taxi out did not route to 627056: ${JSON.stringify(audioState)}`);
await page.evaluate(()=>document.getElementById('journeyNextPhase')?.click());await page.waitForTimeout(1300);
audioState=await page.evaluate(()=>({phase:window.LullabyJourneyAudio?.phase,taxiGain:window.LullabyJourneyAudio?.taxiGain,cruiseGain:window.LullabyJourneyAudio?.cruiseGain}));
if(audioState.phase!=='Takeoff'||audioState.taxiGain>.12||audioState.cruiseGain<.25)throw new Error(`Takeoff did not crossfade away from taxi bed: ${JSON.stringify(audioState)}`);
await page.evaluate(()=>document.getElementById('scenePlay')?.click());await page.waitForTimeout(80);

const guard=await page.evaluate(async()=>{await ensureSceneNode();const filters=sceneNode?.whistleGuard?.filters||[];return{frequencies:filters.map(n=>n.frequency.value),gains:filters.map(n=>n.gain.value)}});
if(JSON.stringify(guard.frequencies)!=='[685,1191,2383,3574,10544]')throw new Error(`aircraft tonal guard frequencies missing: ${JSON.stringify(guard)}`);
if(guard.gains.some(value=>value>=0))throw new Error(`aircraft tonal guard gains invalid: ${JSON.stringify(guard)}`);
const aircraft=await page.evaluate(async()=>({cruiseUrl:await getAircraftUrl(),taxiUrl:await getAircraftTaxiUrl(),cruise:window.LullabyAircraftSource,taxi:window.LullabyAircraftTaxiSource}));
if(aircraft.cruiseUrl!=='/audio/aircraft_cabin_cruise_v2.ogg'||aircraft.cruise?.sourceId!=='freesound_jasonm911_853735')throw new Error(`cruise source override missing: ${JSON.stringify(aircraft)}`);
if(aircraft.taxiUrl!=='/audio/aircraft_cabin_taxi_627056_v1.ogg'||aircraft.taxi?.sourceId!=='freesound_mar_sounds_627056'||aircraft.taxi?.bridgeMs!==180||aircraft.taxi?.channels!==2)throw new Error(`627056 taxi source metadata missing: ${JSON.stringify(aircraft)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web Mixer + journey seek/phase-step + 627056 Taxi routing smoke test passed');
