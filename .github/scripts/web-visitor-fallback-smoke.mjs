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
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    available:true,backend:'countapi.mileshilliard-v1',version:6,day:'2026-08-20',
    today:13,total:101,countedDay:body.countDay===true,countedTotal:body.countTotal===true,
  })});
});

async function loadCounter(targetPage=page){
  await targetPage.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await targetPage.addScriptTag({url:'http://127.0.0.1:4173/visitor-count-v1.js?v=6'});
  await targetPage.waitForFunction(()=>document.querySelector('[data-visitor-total]')?.textContent!=='—');
  return targetPage.evaluate(()=>({
    today:document.querySelector('[data-visitor-today]')?.textContent?.trim(),
    total:document.querySelector('[data-visitor-total]')?.textContent?.trim(),
    backend:document.querySelector('[data-visitor-stats]')?.dataset.backend,
    version:document.querySelector('[data-visitor-stats]')?.dataset.counterVersion,
    totalMarker:localStorage.getItem('lullaby-visitor-total-counted-v4'),
    dayMarker:localStorage.getItem('lullaby-visitor-day-counted-v4'),
    totalLast:localStorage.getItem('lullaby-visitor-total-last-v4'),
    dayLast:localStorage.getItem('lullaby-visitor-day-last-v4'),
  }));
}

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>localStorage.clear());
let state=await loadCounter();
if(state.today!=='13'||state.total!=='101'||state.backend!=='countapi.mileshilliard-v1'||state.version!=='6'||state.totalMarker!=='1'||!/^\d{4}-\d{2}-\d{2}$/.test(state.dayMarker||'')||state.totalLast!=='101'||state.dayLast!=='13')throw new Error(`visitor v6 first load failed: ${JSON.stringify(state)}`);
if(requests.length!==1||requests[0].countTotal!==true||requests[0].countDay!==true)throw new Error(`first visit count flags invalid: ${JSON.stringify(requests)}`);

state=await loadCounter();
if(state.today!=='13'||state.total!=='101')throw new Error(`visitor v6 reload failed: ${JSON.stringify(state)}`);
if(requests.length!==2||requests[1].countTotal!==false||requests[1].countDay!==false)throw new Error(`reload count flags invalid: ${JSON.stringify(requests)}`);

// Regression: even if stale markers say this browser was already counted, a
// 0/0 response must trigger a second POST with both count flags forced true.
const repairContext=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const repairPage=await repairContext.newPage();
const repairRequests=[];
await repairPage.route('**/api/visitors',async route=>{
  const body=route.request().postDataJSON?.()||{};repairRequests.push(body);
  const repairing=repairRequests.length>1;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    available:true,backend:'countapi.mileshilliard-v1',version:6,day:'2026-08-20',
    today:repairing?1:0,total:repairing?1:0,
    countedDay:repairing,countedTotal:repairing,
  })});
});
await repairPage.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await repairPage.evaluate(()=>{
  localStorage.setItem('lullaby-visitor-total-counted-v4','1');
  localStorage.setItem('lullaby-visitor-day-counted-v4',new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
});
const repaired=await loadCounter(repairPage);
if(repaired.today!=='1'||repaired.total!=='1'||repairRequests.length!==2)throw new Error(`stale 0/0 was not repaired: ${JSON.stringify({repaired,repairRequests})}`);
if(repairRequests[0].countTotal!==false||repairRequests[0].countDay!==false||repairRequests[1].countTotal!==true||repairRequests[1].countDay!==true)throw new Error(`repair flags invalid: ${JSON.stringify(repairRequests)}`);
await repairContext.close();

if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('same-origin visitor counter v6 smoke test passed');
