import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium,firefox,webkit } from 'playwright-core';
const engine=process.env.BROWSER||'chromium',browserType={chromium,firefox,webkit}[engine];
assert(browserType,'Unknown browser engine');
const executablePath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium'].find(path=>path&&fs.existsSync(path));
if(engine==='chromium')assert(executablePath,'Set CHROME_PATH');
const browser=await browserType.launch(engine==='chromium'?{executablePath,headless:true,args:['--no-sandbox']}:{headless:true});
const base=process.env.WEB_BASE_URL||'http://127.0.0.1:4173';
try{
  for(const width of [390,768,1024,1440]){
    const context=await browser.newContext({viewport:{width,height:844},locale:'ko-KR',hasTouch:width<=900,serviceWorkers:'block'}),page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(String(error)));page.on('console',message=>{if(message.type()==='error')console.error(`${engine}: ${message.text()}`)});
    await page.route('**/api/visitors',route=>route.fulfill({json:{available:false}}));
    await page.goto(base+'/player/?scene=simple',{waitUntil:'networkidle'});
    if(width<=900)await page.locator('[data-android-dest="prepared"]').click();
    else await page.locator('[data-scene-mode="simple"]').click();
    const picker=page.locator('#presetPicker'),summary=picker.locator('summary');
    const open=async()=>{if(!await picker.evaluate(el=>el.open))await summary.click()};
    assert.equal(await picker.evaluate(el=>el.open),false);
    assert(await page.locator('#simpleQuickMixerSection').isVisible());
    await summary.focus();await page.keyboard.press('Enter');
    assert(await picker.evaluate(el=>el.open),'Keyboard opens picker');
    assert.equal(await page.evaluate(()=>Object.keys(window.LullabyPlayerRuntime.snapshotMix()).length),0,'Opening does not play');
    const first=picker.locator('[data-preset]').first();
    assert((await first.boundingBox()).height>=80,'Wide image-backed option');
    assert((await first.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('.webp'));
    await page.keyboard.press('Escape');assert.equal(await picker.evaluate(el=>el.open),false);
    await open();await picker.locator('[data-preset="preset_rainy_cafe"]').click();
    await page.waitForFunction(()=>window.LullabyPlayerRuntime.getMixerUiState('rain').on&&window.LullabyPlayerRuntime.getMixerUiState('cafe').on);
    assert.equal(await picker.evaluate(el=>el.open),false,'Selection collapses picker');
    const ids=()=>page.locator('#simpleQuickMixerList [data-quick-source]').evaluateAll(rows=>rows.map(row=>row.dataset.quickSource));
    assert.deepEqual((await ids()).slice(0,2),['rain','cafe']);
    await page.locator('#simpleQuickMixerList [data-quick-toggle="rain"]').click();
    await page.waitForFunction(()=>!window.LullabyMixerInteraction.stateFor('rain').on);
    assert.deepEqual((await ids()).slice(0,2),['rain','cafe'],'Disabled preset source stays pinned');
    const wind=page.locator('#simpleQuickMixerList [data-quick-volume="wind"]');
    await wind.focus();await wind.press('ArrowRight');await page.waitForTimeout(180);
    assert.equal(await wind.evaluate(el=>document.activeElement===el),true,'Keyboard focus survives sorting');
    assert.deepEqual((await ids()).slice(0,3),['rain','cafe','wind']);
    await page.locator('#simpleQuickMixerList [data-quick-toggle="wind"]').click();
    const catalog=await page.evaluate(()=>window.LullabyPlayerRuntime.catalog.map(s=>s.id).filter(id=>!['rain','cafe'].includes(id)));
    assert.deepEqual((await ids()).slice(2),catalog,'Unused sources retain catalog order');
    // Mouse drag retains the actual range node until release; a second pointer
    // input cannot lose its target to a reorder halfway through the gesture.
    await wind.scrollIntoViewIfNeeded();let box=await wind.boundingBox();
    if(width<=900){await page.touchscreen.tap(box.x+box.width*.25,box.y+box.height/2);await page.waitForTimeout(150);assert(await page.evaluate(()=>window.LullabyMixerInteraction.stateFor('wind').on),'Touch tap sets volume');await page.locator('#simpleQuickMixerList [data-quick-toggle="wind"]').click();await wind.scrollIntoViewIfNeeded()}
    box=await wind.boundingBox();
    await wind.evaluate(el=>window.__dragRange=el);
    await page.mouse.move(box.x+6,box.y+box.height/2);await page.mouse.down();
    await page.mouse.move(box.x+box.width*.28,box.y+box.height/2,{steps:5});
    assert(await wind.evaluate(el=>el===window.__dragRange),'Range remains mounted during drag');
    await page.mouse.up();await page.waitForTimeout(200);
    assert.deepEqual((await ids()).slice(0,3),['rain','cafe','wind']);
    const nav=page.locator(width<=900?'.mobile-tabs':'.desktop-rail');
    await nav.locator(width<=900?'[data-android-dest="mixer"]':'[data-view="mixer"]').click();
    assert.deepEqual(await page.locator('#mixerGrid [data-source]').evaluateAll(rows=>rows.slice(0,3).map(row=>row.dataset.source)),['rain','cafe','wind']);
    await nav.locator(width<=900?'[data-android-dest="prepared"]':'[data-view="scene"]').click();
    await open();await picker.locator('[data-preset="preset_beach"]').click();
    await page.waitForFunction(()=>window.LullabyPlayerRuntime.getMixerUiState('ocean').on);
    assert.deepEqual((await ids()).slice(0,2),['ocean','wind'],'New selection replaces pinned group');
    for(const theme of ['light','dark']){
      await page.evaluate(value=>window.applyTheme(value),theme);
      await page.waitForFunction(()=>{const el=document.querySelector('#simpleQuickMixerList [data-quick-volume="wind"]');return el&&getComputedStyle(el).appearance==='none'});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
      if(process.env.PICKER_ARTIFACT_DIR){fs.mkdirSync(process.env.PICKER_ARTIFACT_DIR,{recursive:true});await summary.scrollIntoViewIfNeeded();await page.screenshot({path:`${process.env.PICKER_ARTIFACT_DIR}/${width}-${theme}.png`})}
    }
    await open();await summary.focus();await summary.press('ArrowDown');
    assert(await first.evaluate(el=>document.activeElement===el));
    await page.keyboard.press('Escape');
    assert.equal(errors.length,0,errors.join('\n'));await context.close();
    console.log(`Preset picker, pinned/active ordering and capsule range passed at ${width}px`);
  }
}finally{await browser.close()}
