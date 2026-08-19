import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];let increments=0;
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});

await page.route('**/api/visitors',route=>route.fulfill({status:503,contentType:'application/json',body:'{"available":false,"error":"VISITOR_DB binding missing"}'}));
await page.route('https://api.counterapi.dev/v1/lullaby-scene-site/**',route=>{
  const url=new URL(route.request().url());
  const isUp=url.pathname.endsWith('/up');if(isUp)increments++;
  const isTotal=url.pathname.includes('/visitors-total-v1');
  route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({value:isTotal?101:13})});
});

async function loadCounter(){
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.addScriptTag({url:'http://127.0.0.1:4173/visitor-count-v1.js?v=2'});
  await page.waitForFunction(()=>document.querySelector('[data-visitor-total]')?.textContent!=='—');
  return page.evaluate(()=>({
    today:document.querySelector('[data-visitor-today]')?.textContent?.trim(),
    total:document.querySelector('[data-visitor-total]')?.textContent?.trim(),
    backend:document.querySelector('[data-visitor-stats]')?.dataset.backend,
    totalMarker:localStorage.getItem('lullaby-counterapi-total-counted-v1'),
    dayMarker:localStorage.getItem('lullaby-counterapi-day-counted-v1'),
  }));
}

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  localStorage.removeItem('lullaby-counterapi-total-counted-v1');
  localStorage.removeItem('lullaby-counterapi-day-counted-v1');
});
let state=await loadCounter();
if(state.today!=='13'||state.total!=='101'||state.backend!=='counterapi'||state.totalMarker!=='1'||!/^\d{4}-\d{2}-\d{2}$/.test(state.dayMarker||''))throw new Error(`static visitor fallback failed: ${JSON.stringify(state)}`);
if(increments!==2)throw new Error(`expected exactly two first-visit increments, got ${increments}`);

state=await loadCounter();
if(state.today!=='13'||state.total!=='101'||state.backend!=='counterapi')throw new Error(`static visitor fallback reload failed: ${JSON.stringify(state)}`);
if(increments!==2)throw new Error(`reload incremented counters again: ${increments}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('static visitor counter fallback smoke test passed');
