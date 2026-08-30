import fs from 'node:fs';
import { chromium } from 'playwright-core';
const baseUrl=(process.env.WEB_BASE_URL||'http://127.0.0.1:4173').replace(/\/+$/,'');
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(p=>fs.existsSync(p));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
const benignAbort=value=>String(value).includes('AbortError: The play() request was interrupted by a call to pause()');
page.on('pageerror',e=>{if(!benignAbort(e))errors.push(String(e))});
page.on('console',m=>{if(m.type()==='error'&&!benignAbort(m.text()))errors.push(m.text())});
await page.route('**/api/visitors',async route=>{
  const body=route.request().postDataJSON?.()||{};
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({available:true,backend:'countapi.mileshilliard-v1',mode:'pageviews',version:7,today:7,total:42,day:body.day||'2026-08-20',incremented:true})});
});
await page.goto(`${baseUrl}/player/`,{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.removeItem('lullaby-user-presets'));
const visible=async sel=>{if(!(await page.locator(sel).isVisible()))throw new Error(`${sel} not visible`)};

// Full Mixer: every inactive source must display 0%, and a slider move must start it.
await page.locator('[data-view="mixer"]').first().click();await visible('[data-panel="mixer"]');
await page.waitForTimeout(180);
const initialNonZeroOff=await page.locator('#mixerGrid .mixer-source:not(.on) [data-source-volume]').evaluateAll(inputs=>inputs.filter(input=>input.value!=='0').map(input=>({id:input.dataset.sourceVolume,value:input.value})));
if(initialNonZeroOff.length)throw new Error(`inactive Mixer sliders are not zero: ${JSON.stringify(initialNonZeroOff)}`);
const mixerWind=page.locator('#mixerGrid [data-source="wind"]');
await mixerWind.locator('[data-source-volume]').evaluate(input=>{input.value='18';input.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(250);
let mixerWindState=await page.evaluate(()=>({ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),slider:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value,on:document.querySelector('#mixerGrid [data-source="wind"]')?.classList.contains('on')}));
if(!mixerWindState.ui.on||!mixerWindState.on||Math.abs(mixerWindState.ui.volume-18)>2||mixerWindState.slider!=='18')throw new Error(`Mixer slider did not auto-enable: ${JSON.stringify(mixerWindState)}`);
await page.locator('#mixerGrid [data-source="wind"] [data-source-volume]').evaluate(input=>{input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}))});
await page.waitForTimeout(220);
mixerWindState=await page.evaluate(()=>({ui:window.LullabyPlayerRuntime.getMixerUiState('wind'),slider:document.querySelector('#mixerGrid [data-source="wind"] [data-source-volume]')?.value,on:document.querySelector('#mixerGrid [data-source="wind"]')?.classList.contains('on')}));
if(mixerWindState.ui.on||mixerWindState.on||mixerWindState.slider!=='0')throw new Error(`Mixer zero did not turn source off: ${JSON.stringify(mixerWindState)}`);

await page.locator('[data-view="scene"]').first().click();
await page.locator('[data-scene-mode="simple"]').click();await visible('[data-scene-content="simple"]');await visible('[data-inspector-mode="simple"]');await visible('#simpleScenePlayPause');await visible('#simpleSceneStop');await visible('#saveSceneButton');await visible('#shareSceneRecipe');
if((await page.locator('#simpleScenePlayPause').textContent())?.trim()!=='Ⅱ 일시정지')throw new Error('Simple Scene pause control missing');

await page.locator('[data-preset="preset_rainy_cafe"]').click();await page.waitForTimeout(350);
const quickOrder=await page.locator('#inspectorMixerList [data-quick-source]').evaluateAll(rows=>rows.slice(0,4).map(row=>row.getAttribute('data-quick-source')));
if(JSON.stringify(quickOrder.slice(0,2))!==JSON.stringify(['rain','cafe']))throw new Error(`preset sources were not sorted first: ${JSON.stringify(quickOrder)}`);
const inactive=page.locator('#inspectorMixerList [data-quick-source="wind"]');
if(!(await inactive.count()))throw new Error('inactive quick mixer source missing');
if(!(await inactive.evaluate(row=>row.classList.contains('is-off'))))throw new Error('non-preset quick mixer source is not dimmed/off');
if((await inactive.locator('[data-quick-volume]').inputValue())!=='0')throw new Error('inactive quick mixer slider is not 0%');
await inactive.locator('[data-quick-volume]').evaluate(input=>{input.value='25';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))});
await page.waitForTimeout(180);
let windState=await page.locator('#inspectorMixerList [data-quick-source="wind"]').evaluate(row=>({on:row.classList.contains('is-on'),value:row.querySelector('[data-quick-volume]')?.value,output:row.querySelector('[data-quick-output]')?.textContent}));
if(!windState.on||windState.value!=='25'||windState.output!=='25%')throw new Error(`slider did not enable source: ${JSON.stringify(windState)}`);
await page.locator('#inspectorMixerList [data-quick-source="wind"] [data-quick-toggle]').click();await page.waitForTimeout(120);
windState=await page.locator('#inspectorMixerList [data-quick-source="wind"]').evaluate(row=>({off:row.classList.contains('is-off'),value:row.querySelector('[data-quick-volume]')?.value}));
if(!windState.off||windState.value!=='0')throw new Error(`turn-off did not reset source to 0%: ${JSON.stringify(windState)}`);

// Cross-platform Scene Recipe schema: base64url JSON + shared source ids/0..1 gains.
const recipeRoundTrip=await page.evaluate(()=>{
  const recipe=window.LullabySceneRecipe.snapshot('Browser Recipe');
  const encoded=window.LullabySceneRecipe.encode(recipe);
  const decoded=window.LullabySceneRecipe.decode(encoded);
  const url=new URL(location.href);url.searchParams.set('scene','simple');url.searchParams.set('recipe',encoded);
  return{recipe,encoded,decoded,url:url.toString()};
});
if(recipeRoundTrip.decoded?.schema!=='lullaby.scene.recipe'||recipeRoundTrip.decoded?.version!==1)throw new Error(`Scene Recipe round-trip failed: ${JSON.stringify(recipeRoundTrip)}`);
if(!recipeRoundTrip.url.includes('recipe='))throw new Error(`Scene Recipe share URL missing payload: ${recipeRoundTrip.url}`);
if(Object.values(recipeRoundTrip.decoded.mix||{}).some(value=>typeof value!=='number'||value<=0||value>1))throw new Error(`Scene Recipe mix is not normalized: ${JSON.stringify(recipeRoundTrip.decoded.mix)}`);

// Untrusted links must only preview, then enforce source/master/aggregate-gain caps on explicit load.
const unsafePreview=await page.evaluate(()=>{
  const api=window.LullabySceneRecipe,before=window.LullabyPlayerRuntime.snapshotMix();
  const mix=Object.fromEntries(window.LullabyPlayerRuntime.catalog.slice(0,50).map(item=>[item.id,1]));
  const recipe=api.decode(api.encode({schema:api.SCHEMA,version:api.VERSION,name:'Untrusted loud recipe',master:1,mix}));
  api.preview(recipe);
  return{before,after:window.LullabyPlayerRuntime.snapshotMix(),encoded:api.encode({schema:api.SCHEMA,version:api.VERSION,name:'Untrusted loud recipe',master:1,mix}),recipe,visible:!document.getElementById('sceneRecipePreview')?.hidden};
});
const importedGains=Object.values(unsafePreview.recipe.mix||{}),importedGainSum=importedGains.reduce((sum,value)=>sum+value,0);
if(!unsafePreview.visible||JSON.stringify(unsafePreview.before)!==JSON.stringify(unsafePreview.after))throw new Error(`Recipe preview changed playback: ${JSON.stringify(unsafePreview)}`);
if(importedGains.length>8||importedGainSum>1.2001||unsafePreview.recipe.master>.8501)throw new Error(`Recipe limits failed: ${JSON.stringify(unsafePreview.recipe)}`);
const linkedPage=await context.newPage();
await linkedPage.route('**/api/visitors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
await linkedPage.goto(`${baseUrl}/player/?recipe=${encodeURIComponent(unsafePreview.encoded)}`,{waitUntil:'networkidle'});
await linkedPage.waitForFunction(()=>window.LullabySceneRecipe?.pending&&document.getElementById('sceneRecipePreview')?.hidden===false);
const linkedState=await linkedPage.evaluate(()=>({pending:!!window.LullabySceneRecipe.pending,mix:window.LullabyPlayerRuntime.snapshotMix(),button:document.querySelector('[data-recipe-load]')?.textContent}));
if(!linkedState.pending||Object.values(linkedState.mix||{}).some(value=>value>0)||!linkedState.button)throw new Error(`Recipe URL auto-played or missed preview: ${JSON.stringify(linkedState)}`);
await linkedPage.close();
await page.locator('[data-recipe-load]').click();await page.waitForFunction(()=>window.LullabySceneRecipe.pending===null,{timeout:15000});
const importedState=await page.evaluate(()=>({pending:window.LullabySceneRecipe.pending,previewHidden:document.getElementById('sceneRecipePreview')?.hidden,mix:window.LullabyPlayerRuntime.snapshotMix()}));
const activeImported=Object.values(importedState.mix||{}).filter(value=>value>0),activeImportedSum=activeImported.reduce((sum,value)=>sum+value,0);
if(importedState.pending!==null||!importedState.previewHidden||activeImported.length>8||activeImportedSum>1.2001)throw new Error(`Explicit recipe load failed: ${JSON.stringify(importedState)}`);
await page.locator('[data-preset="preset_rainy_cafe"]').click();await page.waitForTimeout(350);

const savedId=await page.evaluate(()=>window.LullabySavedScenes.create('My Sleep Scene'));
await page.waitForTimeout(80);await visible(`[data-user-preset="${savedId}"]`);await visible(`[data-saved-load="${savedId}"]`);await visible(`[data-saved-rename="${savedId}"]`);await visible(`[data-saved-overwrite="${savedId}"]`);
let savedState=await page.evaluate(id=>window.LullabySavedScenes.list().find(scene=>scene.id===id),savedId);
if(savedState?.name!=='My Sleep Scene'||!savedState.mix?.rain||!savedState.mix?.cafe)throw new Error(`saved scene snapshot failed: ${JSON.stringify(savedState)}`);
if(!(await page.evaluate(id=>window.LullabySavedScenes.rename(id,'Renamed Sleep Scene'),savedId)))throw new Error('saved scene rename returned false');
await page.waitForTimeout(80);
if((await page.locator(`[data-user-preset="${savedId}"] strong`).textContent())?.trim()!=='Renamed Sleep Scene')throw new Error('saved scene rename did not update UI');

const windAgain=page.locator('#inspectorMixerList [data-quick-source="wind"] [data-quick-volume]');
await windAgain.evaluate(input=>{input.value='33';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))});await page.waitForTimeout(180);
if(!(await page.evaluate(id=>window.LullabySavedScenes.overwrite(id),savedId)))throw new Error('saved scene overwrite returned false');
savedState=await page.evaluate(id=>window.LullabySavedScenes.list().find(scene=>scene.id===id),savedId);
if(Math.abs((savedState?.mix?.wind??0)-0.33)>.02)throw new Error(`saved scene overwrite missed current mix: ${JSON.stringify(savedState)}`);
await page.evaluate(()=>window.LullabyQuickMixer.turnAllOff());await page.waitForTimeout(100);
if(!(await page.evaluate(id=>window.LullabySavedScenes.load(id),savedId)))throw new Error('saved scene load returned false');
await page.waitForTimeout(300);
const loadedState=await page.evaluate(id=>({active:window.LullabySavedScenes.activeId,scene:window.LullabySavedScenes.list().find(item=>item.id===id),rain:window.LullabyPlayerRuntime.getMixerUiState('rain'),cafe:window.LullabyPlayerRuntime.getMixerUiState('cafe'),wind:window.LullabyPlayerRuntime.getMixerUiState('wind')}),savedId);
if(loadedState.active!==savedId||!loadedState.rain.on||!loadedState.cafe.on||!loadedState.wind.on||Math.abs(loadedState.wind.volume-33)>2)throw new Error(`saved scene load failed: ${JSON.stringify(loadedState)}`);
if(!(await page.locator(`[data-user-preset="${savedId}"]`).locator('xpath=..').evaluate(card=>card.classList.contains('is-active-saved-scene'))))throw new Error('loaded saved scene is not marked active');

if((await page.locator('[data-visitor-today]').textContent())?.trim()!=='7'||(await page.locator('[data-visitor-total]').textContent())?.trim()!=='42')throw new Error('page-view counter did not render API values');
await page.setViewportSize({width:390,height:844});await visible('[data-scene-content="simple"]');await visible('[data-preset="preset_rainy_cafe"]');await visible(`[data-saved-load="${savedId}"]`);
await page.setViewportSize({width:1440,height:1000});

await page.locator('[data-view="mixer"]').first().click();await visible('[data-panel="mixer"]');
await page.locator('[data-view="timer"]').first().click();await visible('[data-panel="timer"]');
await page.locator('[data-view="settings"]').first().click();await visible('[data-panel="settings"]');
await page.locator('[data-view="scene"]').first().click();await page.locator('[data-scene-mode="journey"]').click();await visible('[data-scene-content="journey"]');
await page.locator('[data-duration="600"]').click();if(!(await page.locator('#durationOutput').textContent())?.includes('10h'))throw new Error('10h shortcut failed');
await page.locator('#durationDirect').fill('10:15');await page.locator('#durationDirectApply').click();await page.waitForTimeout(50);
let directState=await page.evaluate(()=>({output:document.querySelector('#durationOutput')?.textContent,input:document.querySelector('#durationDirect')?.value,duration:typeof durationMinutes==='number'?durationMinutes:null,controls:!!window.LullabyControls}));
if(!directState.output?.includes('10h 15m')||directState.input!=='10:15'||directState.duration!==615)throw new Error(`minute-precise HH:MM duration failed: ${JSON.stringify(directState)}`);
await page.locator('#durationDirect').fill('00:05');await page.locator('#durationDirectApply').click();await page.waitForTimeout(50);
directState=await page.evaluate(()=>({output:document.querySelector('#durationOutput')?.textContent,input:document.querySelector('#durationDirect')?.value,duration:typeof durationMinutes==='number'?durationMinutes:null,phaseStart:phaseFor(0,5*60000)[0],phaseEnd:phaseFor(5*60000,5*60000)[0]}));
if(directState.output!=='5m'||directState.input!=='00:05'||directState.duration!==5)throw new Error(`free short duration failed: ${JSON.stringify(directState)}`);
if(directState.phaseStart!=='Taxi out'||directState.phaseEnd!=='Arrived')throw new Error(`compressed phase timeline failed: ${JSON.stringify(directState)}`);
const fixed=await page.evaluate(()=>window.LullabyJourneyDurationProfiles?.aircraft?.fixedDurations);
if(JSON.stringify(fixed)!=='[360,480,600]')throw new Error(`aircraft fixed duration profile changed: ${JSON.stringify(fixed)}`);
await page.locator('[data-scene-mode="simple"]').click();await page.locator('[data-fx="warmth"]').first().evaluate(el=>{el.value='72';el.dispatchEvent(new Event('input',{bubbles:true}))});if((await page.locator('[data-fx-output="warmth"]').first().textContent())!=='72%')throw new Error('Simple Scene FX control failed');
await page.evaluate(()=>window.LullabyLocales.setLanguage('en'));await page.waitForTimeout(100);if((await page.locator('[data-scene-mode="simple"]').textContent())?.trim()!=='Ready-made Scenes')throw new Error('language switch failed');
if((await page.locator('#simpleScenePlayPause').textContent())?.trim()!=='Ⅱ Pause')throw new Error('Simple Scene transport did not localize');
if((await page.locator('#saveSceneButton').textContent())?.trim()!=='Save scene')throw new Error('saved scene controls did not localize');
if((await page.locator(`[data-saved-rename="${savedId}"]`).textContent())?.trim()!=='Rename')throw new Error('saved scene rename control did not localize');
if((await page.locator('[data-visitor-today-label]').textContent())?.trim()!=='Views today')throw new Error('page-view counter did not localize');

await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>{window.switchView('scene');window.setLullabySceneMode('journey')});await page.locator('#journeySceneTab').focus();await page.keyboard.press('ArrowRight');const tabState=await page.evaluate(()=>{const focusTarget=document.getElementById('simpleSceneTab');return{selected:focusTarget?.getAttribute('aria-selected'),hidden:document.getElementById('simpleScenePanel')?.getAttribute('aria-hidden'),focused:document.activeElement===focusTarget,outline:getComputedStyle(focusTarget).outlineStyle}});
if(tabState.selected!=='true'||tabState.hidden!=='false'||!tabState.focused||tabState.outline==='none')throw new Error(`Scene tabs are not keyboard accessible: ${JSON.stringify(tabState)}`);
for(const width of [390,768,1024,1440]){await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);if(overflow)throw new Error(`horizontal overflow at ${width}px`)}
await page.setViewportSize({width:390,height:900});const destinationStates=[];
for(const destination of ['scenes','mixer','prepared','fx','settings','timer']){await page.evaluate(value=>window.LullabyAndroidWebShell.showDestination(value),destination);await page.waitForTimeout(40);destinationStates.push(await page.evaluate(value=>{const visible=el=>el.getClientRects().length&&!el.closest('[aria-hidden="true"]'),unnamed=[...document.querySelectorAll('input,select')].filter(visible).filter(el=>el.type!=='hidden'&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')&&!el.labels?.length),short=[...document.querySelectorAll('button,a.button')].filter(visible).filter(el=>el.getBoundingClientRect().height<43.5);return{destination:value,unnamed:unnamed.length,short:short.map(el=>({text:el.textContent.trim(),height:el.getBoundingClientRect().height}))}},destination))}
if(destinationStates.some(state=>state.unnamed||state.short.length))throw new Error(`mobile accessibility failed: ${JSON.stringify(destinationStates)}`);
const adState=await page.evaluate(()=>{const slot=document.querySelector('[data-ad-slot="player"]'),emptyDisplay=getComputedStyle(slot).display;slot.innerHTML='<div style="width:728px;height:90px"></div>';const shown={display:getComputedStyle(slot).display,width:slot.getBoundingClientRect().width,height:slot.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};slot.replaceChildren();return{emptyDisplay,shown}});
if(adState.emptyDisplay!=='none'||adState.shown.display==='none'||adState.shown.width>320.5||adState.shown.height<99.5||adState.shown.overflow)throw new Error(`ad slot failed: ${JSON.stringify(adState)}`);
for(const path of ['/about/','/contact/','/privacy/']){
  const trustPage=await context.newPage();await trustPage.goto(`${baseUrl}${path}`,{waitUntil:'domcontentloaded'});const state=await trustPage.evaluate(()=>({title:document.title,h1:document.querySelector('h1')?.textContent.trim(),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,consentEnabled:window.LullabyConsent?.enabled,consentPanel:!!document.querySelector('.consent-panel'),email:document.querySelector('a[href="mailto:scenesuastudio@gmail.com"]')?.getAttribute('href')}));if(!state.title||!state.h1||state.overflow||state.consentEnabled!==false||state.consentPanel)throw new Error(`trust page failed: ${path} ${JSON.stringify(state)}`);if((path==='/contact/'||path==='/privacy/')&&!state.email)throw new Error(`contact email missing: ${path}`);await trustPage.close();
}
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('web interaction smoke test passed');
