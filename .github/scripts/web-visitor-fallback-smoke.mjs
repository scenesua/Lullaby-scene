import fs from 'node:fs';
import { chromium } from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];const requests=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});

await page.route('**/api/visitors',async route=>{
  const request=route.request();
  const body=request.postDataJSON?.()||{};requests.push(body);
  const first=requests.length===1;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    available:true,
    backend:'counterapi.com',
    day:'2026-08-19',
    today:first?13:0,
    total:first?101:0,
  })});
});

async function loadCounter(){
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.addScriptTag({url:'http://127.0.0.1:4173/visitor-count-v1.js?v=3'});
  await page.waitForFunction(()=>document.querySelector('[data-visitor-total]')?.textContent!=='—');
  return page.evaluate(()=>({
    today:document.querySelector('[data-visitor-today]')?.textContent?.trim(),
    total:document.querySelector('[data-visitor-total]')?.textContent?.trim(),
    backend:document.querySelector('[data-visitor-stats]')?.dataset.backend,
    totalMarker:localStorage.getItem('lullaby-visitor-total-counted-v2'),
    dayMarker:localStorage.getItem('lullaby-visitor-day-counted-v2'),
    totalLast:localStorage.getItem('lullaby-visitor-total-last-v2'),
    dayLast:localStorage.getItem('lullaby-visitor-day-last-v2'),
  }));
}

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
let state=await loadCounter();
if(state.today!=='13'||state.total!=='101'||state.backend!=='counterapi.com'||state.totalMarker!=='1'||!/^\d{4}-\d{2}-\d{2}$/.test(state.dayMarker||'')||state.totalLast!=='101'||state.dayLast!=='13')throw new Error(`same-origin visitor fallback failed: ${JSON.stringify(state)}`);
if(requests.length!==1||requests[0].countTotal!==true||requests[0].countDay!==true)throw new Error(`first visit count flags invalid: ${JSON.stringify(requests)}`);

state=await loadCounter();
if(state.today!=='13'||state.total!=='101'||state.backend!=='counterapi.com')throw new Error(`visitor fallback reload failed: ${JSON.stringify(state)}`);
if(requests.length!==2||requests[1].countTotal!==false||requests[1].countDay!==false)throw new Error(`reload count flags invalid: ${JSON.stringify(requests)}`);
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('same-origin visitor counter fallback smoke test passed');
