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
    const navigation=page.locator(width>900?'.desktop-rail':'.mobile-tabs');
    for(const theme of ['light','dark','system']){
      await navigation.locator(width>900?'[data-view="settings"]':'[data-android-dest="settings"]').click();
      await page.locator('#themeSelect').selectOption(theme);
      await navigation.locator(width>900?'[data-view="scene"]':'[data-android-dest="scenes"]').click();
      const contrasts=await page.evaluate(()=>{
        const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
        const ctx=canvas.getContext('2d',{willReadFrequently:true});
        const rgb=value=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);const data=ctx.getImageData(0,0,1,1).data;return [data[0],data[1],data[2],data[3]/255]};
        const blend=(front,back)=>front.slice(0,3).map((value,i)=>value*(front[3]??1)+back[i]*(1-(front[3]??1)));
        const background=element=>element?blend(rgb(getComputedStyle(element).backgroundColor),background(element.parentElement)):[255,255,255];
        const luminance=color=>color.map(value=>{value/=255;return value<=.04045?value/12.92:((value+.055)/1.055)**2.4}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
        return ['.aircraft-title-row h3','.control-heading strong','#phaseLabel','.mobile-scene-heading h3'].map(selector=>{
          const element=document.querySelector(selector),back=background(element),front=blend(rgb(getComputedStyle(element).color),back),a=luminance(front),b=luminance(back);
          return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
        });
      });
      for(const contrast of contrasts)assert(contrast.ratio>=4.5,`${theme} ${contrast.selector} contrast ${contrast.ratio}`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme} overflow`);
      if(artifacts&&width===1024)await page.screenshot({path:`${artifacts}/player-${width}-${theme}.png`,fullPage:true});
    }
    console.log(`UI/UX layout and controls passed at ${width}px`);
    await context.close();
  }
}finally{await browser.close()}
