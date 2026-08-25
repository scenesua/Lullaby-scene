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
  const body=route.request().postDataJSON?.()||{};
  requests.push(body);
  const count=requests.length;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    available:true,backend:'countapi.mileshilliard-v1',mode:'pageviews',version:7,
    day:body.day,today:count,total:count,incremented:true,
  })});
});

async function loadCounter(){
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('[data-visitor-total]')?.textContent!=='—');
  return page.evaluate(()=>({
    today:document.querySelector('[data-visitor-today]')?.textContent?.trim(),
    total:document.querySelector('[data-visitor-total]')?.textContent?.trim(),
    todayLabel:document.querySelector('[data-visitor-today-label]')?.textContent?.trim(),
    totalLabel:document.querySelector('[data-visitor-total-label]')?.textContent?.trim(),
    backend:document.querySelector('[data-visitor-stats]')?.dataset.backend,
    version:document.querySelector('[data-visitor-stats]')?.dataset.counterVersion,
    mode:document.querySelector('[data-visitor-stats]')?.dataset.counterMode,
  }));
}

// Old unique-visitor markers must be irrelevant to the new page-view counter.
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.evaluate(()=>{
  localStorage.setItem('lullaby-visitor-total-counted-v4','1');
  localStorage.setItem('lullaby-visitor-day-counted-v4','2099-01-01');
  localStorage.setItem('lullaby-visitor-id','old-visitor-id-that-must-not-matter');
});
requests.length=0;

let state=await loadCounter();
if(state.today!=='1'||state.total!=='1'||state.todayLabel!=='오늘 조회수'||state.totalLabel!=='총 조회수'||state.backend!=='countapi.mileshilliard-v1'||state.version!=='7'||state.mode!=='pageviews')throw new Error(`page-view first load failed: ${JSON.stringify(state)}`);
if(requests.length!==1||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(requests[0].day||''))throw new Error(`first page-view request invalid: ${JSON.stringify(requests)}`);
if('visitorId' in requests[0]||'countTotal' in requests[0]||'countDay' in requests[0])throw new Error(`legacy visitor fields leaked into page-view request: ${JSON.stringify(requests[0])}`);

// A second navigation/refresh must count again, even in the same browser.
state=await loadCounter();
if(state.today!=='2'||state.total!=='2')throw new Error(`second page view did not increment: ${JSON.stringify(state)}`);
if(requests.length!==2)throw new Error(`expected exactly two page-view POSTs, got ${requests.length}`);

state=await loadCounter();
if(state.today!=='3'||state.total!=='3')throw new Error(`third page view did not increment: ${JSON.stringify(state)}`);
if(requests.length!==3)throw new Error(`expected exactly three page-view POSTs, got ${requests.length}`);

if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('same-browser reload page-view counter v7 smoke test passed');
