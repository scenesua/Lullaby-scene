import fs from 'node:fs';
import {chromium} from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
const benignAbort=value=>String(value).includes('AbortError: The play() request was interrupted by a call to pause()');
page.on('pageerror',error=>{if(!benignAbort(error))errors.push(String(error))});
page.on('console',message=>{if(message.type()==='error'&&!benignAbort(message.text()))errors.push(message.text())});

await page.route('**/api/visitors',async route=>{
  const body=route.request().postDataJSON?.()||{};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:true,backend:'countapi.mileshilliard-v1',mode:'pageviews',version:9,today:7,total:42,day:body.day||'2026-08-20',incremented:true})});
});
await page.goto('http://127.0.0.1:4173/player/',{waitUntil:'networkidle'});
await page.evaluate(()=>{localStorage.removeItem('lullaby-user-presets');localStorage.setItem('lullaby-language','ko')});

for(const href of ['/site-runtime-v12.css?v=12','/mixer-controls-v14.css?v=14','/mobile-android-shell-v1.css?v=1'])await page.addStyleTag({url:`http://127.0.0.1:4173${href}`});
for(const src of ['/site-locales-v10.js?v=10','/player-runtime-bridge-v12.js?v=12','/i18n-catalog-v2.js?v=2','/aircraft-source-v15.js?v=15','/mixer-interaction-v14.js?v=14','/simple-scene-quick-mixer-v12.js?v=12','/saved-scenes-v13.js?v=13','/scene-recipe-v1.js?v=1','/mobile-android-shell-v1.js?v=1','/visitor-count-v1.js?v=7'])await page.addScriptTag({url:`http://127.0.0.1:4173${src}`});
await page.waitForTimeout(300);
const visible=async selector=>{if(!(await page.locator(selector).first().isVisible()))throw new Error(`${selector} not visible`)};

// Mixer: inactive sources are 0; moving a slider starts/stops the source.
await page.evaluate(()=>window.LullabyAndroidWebShell.showDestination('mixer'));
await visible('[data-panel="mixer"]');
const inactiveNonZero=await page.locator('#mixerGrid .mixer-source:not(.on) [data-source-volume]').evaluateAll(inputs=>inputs.filter(input=>input.value!=='0').map(input=>[input.dataset.sourceVolume,input.value]));
if(inactiveNonZero.length)throw new Error(`inactive mixer sliders are not zero: ${JSON.stringify(inactiveNonZero)}`);
const wind=page.locator('#mixerGrid [data-source="wind"] [data-source-volume]');
await wind.evaluate(input=>{input.value='18';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForTimeout(220);
let windState=await page.evaluate(()=>window.LullabyPlayerRuntime.getMixerUiState('wind'));
if(!windState.on||Math.abs(windState.volume-18)>2)throw new Error(`wind did not start at 18%: ${JSON.stringify(windState)}`);
await wind.evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForTimeout(180);
windState=await page.evaluate(()=>window.LullabyPlayerRuntime.getMixerUiState('wind'));
if(windState.on||windState.volume!==0)throw new Error(`wind did not stop at 0%: ${JSON.stringify(windState)}`);

// Ready-made scene and saved-scene round trip.
await page.evaluate(()=>window.LullabyAndroidWebShell.showDestination('prepared'));await page.waitForTimeout(100);await visible('[data-scene-content="simple"]');
if((await page.locator('[data-i18n="simpleScenes"]').first().textContent())?.trim()!=='준비된 장면')throw new Error('Korean ready-made scene label missing');
await page.locator('[data-preset="preset_rainy_cafe"]').click();await page.waitForTimeout(350);
const active=await page.evaluate(()=>({rain:window.LullabyPlayerRuntime.getMixerUiState('rain'),cafe:window.LullabyPlayerRuntime.getMixerUiState('cafe')}));
if(!active.rain.on||!active.cafe.on)throw new Error(`Rainy Cafe did not activate expected sources: ${JSON.stringify(active)}`);
const quickOrder=await page.locator('#inspectorMixerList [data-quick-source]').evaluateAll(rows=>rows.slice(0,2).map(row=>row.dataset.quickSource));
if(JSON.stringify(quickOrder)!==JSON.stringify(['rain','cafe']))throw new Error(`ready-made sources not sorted first: ${JSON.stringify(quickOrder)}`);
const savedId=await page.evaluate(()=>window.LullabySavedScenes.create('My Sleep Scene'));await page.waitForTimeout(100);
if(!(await page.locator(`[data-user-preset="${savedId}"]`).count()))throw new Error('saved scene card missing');
if(!(await page.evaluate(id=>window.LullabySavedScenes.rename(id,'Renamed Sleep Scene'),savedId)))throw new Error('rename failed');
await page.waitForTimeout(80);
if((await page.locator(`[data-user-preset="${savedId}"] strong`).textContent())?.trim()!=='Renamed Sleep Scene')throw new Error('rename did not update UI');

// Journey duration controls remain minute-precise.
await page.evaluate(()=>window.LullabyAndroidWebShell.showDestination('scenes'));await page.waitForTimeout(80);
await page.locator('#durationDirect').fill('10:15');await page.locator('#durationDirectApply').click();await page.waitForTimeout(50);
const duration=await page.evaluate(()=>({output:document.querySelector('#durationOutput')?.textContent,input:document.querySelector('#durationDirect')?.value,value:typeof durationMinutes==='number'?durationMinutes:null}));
if(!duration.output?.includes('10h 15m')||duration.input!=='10:15'||duration.value!==615)throw new Error(`duration input failed: ${JSON.stringify(duration)}`);

// Visitor render and English terminology.
if((await page.locator('[data-visitor-today]').textContent())?.trim()!=='7'||(await page.locator('[data-visitor-total]').textContent())?.trim()!=='42')throw new Error('page-view counter values missing');
await page.evaluate(()=>window.LullabyLocales.setLanguage('en'));await page.waitForTimeout(100);
if((await page.locator('[data-i18n="simpleScenes"]').first().textContent())?.trim()!=='Ready-made Scenes')throw new Error('English Ready-made Scenes terminology missing');
if((await page.locator('#mixerGrid [data-source="rain"] strong').textContent())?.trim()!=='Rain')throw new Error('English source localization missing');
if((await page.locator('[data-visitor-today-label]').textContent())?.trim()!=='Views today')throw new Error('visitor label did not localize');

// Narrow web shell mirrors the Android 5-destination navigation.
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(160);
const mobile=await page.evaluate(()=>({count:document.querySelectorAll('[data-android-dest]').length,header:getComputedStyle(document.querySelector('.site-header')).display,top:getComputedStyle(document.querySelector('.mobile-player-top')).display,nav:getComputedStyle(document.querySelector('.mobile-tabs')).display,subtabs:getComputedStyle(document.querySelector('.scene-subtabs')).display}));
if(mobile.count!==5||mobile.header!=='none'||mobile.top==='none'||mobile.nav==='none'||mobile.subtabs!=='none')throw new Error(`Android narrow shell mismatch: ${JSON.stringify(mobile)}`);
await page.locator('[data-android-dest="fx"]').click();await visible('[data-panel="fx"]');
await page.locator('[data-android-dest="settings"]').click();await visible('[data-panel="settings"]');
if(!(await page.locator('.android-language-setting .language-select').isVisible()))throw new Error('mobile settings language selector missing');

if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web interaction smoke test passed');
