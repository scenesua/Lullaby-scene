import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const executablePath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/chromium'].find(path=>path&&fs.existsSync(path));
assert(executablePath,'Set CHROME_PATH to a Chromium browser');
const base=(process.env.WEB_BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
const artifacts=process.env.UIUX_ARTIFACT_DIR;
if(artifacts)fs.mkdirSync(artifacts,{recursive:true});
try{
  for(const width of [390,768,1024,1440]){
    const context=await browser.newContext({viewport:{width,height:844},locale:'ko-KR',serviceWorkers:'block'});
    const page=await context.newPage();
    await page.route('**/api/visitors',route=>route.fulfill({json:{available:false}}));
    await page.goto(base+'/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('main .button.primary').count(),1,'One primary landing CTA');
    const hero=await page.locator('.hero .primary').boundingBox();
    assert(hero.y+hero.height<844,'Primary CTA is visible in the first viewport');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Home overflow');
    if(artifacts)await page.screenshot({path:`${artifacts}/home-${width}.png`,fullPage:true});
    await page.goto(base+'/player/',{waitUntil:'networkidle'});
    assert.equal(await page.locator('#journeySelector svg').count(),7,'Seven matching Journey icons');
    assert.equal(await page.locator('#journeySelector button').last().getAttribute('data-journey'),'hood_journey');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Player overflow');
    if(width>900){
      const workspace=await page.locator('.workspace-main').boundingBox();
      assert(workspace.width>=550,'Central workspace is not compressed');
    }else{
      const details=page.locator('details.mobile-macros');
      assert.equal(await details.getAttribute('open'),null,'Controls initially folded');
      const play=await page.locator('#scenePlay').boundingBox();
      const status=await page.locator('.journey-status').boundingBox();
      assert(play.y<status.y,'Time and transport precede secondary status controls');
      await details.locator('summary').click();
      const slider=details.locator('[data-macro="engine"]');
      await slider.focus();await slider.press('End');
      assert.equal(await slider.inputValue(),'100','Keyboard changes the macro');
      assert.equal(await details.locator('[data-output="engine"]').textContent(),'100%');
      await details.locator('summary').click();await details.locator('summary').click();
      assert.equal(await slider.inputValue(),'100','Fold keeps values');
      await page.setViewportSize({width:1024,height:768});
      assert.equal(await page.locator('.desktop-macros [data-macro="engine"]').inputValue(),'100','Rotation keeps matching controls');
      await page.setViewportSize({width,height:844});
      await details.locator('summary').click();
      await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
      const summary=await details.locator('summary').boundingBox(),tabs=await page.locator('.mobile-tabs').boundingBox();
      assert(summary.y+summary.height<=tabs.y,'Bottom tab bar does not hide the last control');
    }
    await page.evaluate(()=>scrollTo(0,0));
    if(artifacts)await page.screenshot({path:`${artifacts}/player-${width}.png`,fullPage:true});
    console.log(`UI/UX layout and controls passed at ${width}px`);
    await context.close();
  }
}finally{await browser.close()}
