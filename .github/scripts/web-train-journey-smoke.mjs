import fs from 'node:fs';
import playwright from 'playwright-core';
const {chromium}=playwright;

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:900},locale:'ko-KR'});
const errors=[];page.on('pageerror',error=>errors.push(String(error)));
await page.route('**/api/visitors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
await page.goto('http://127.0.0.1:4173/player/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.LullabyTrainJourney&&window.LullabyJourneyRuntime);
const journeyOrder=await page.locator('#journeySelector [data-journey]').evaluateAll(nodes=>nodes.map(node=>node.dataset.journey));
if(journeyOrder[2]!=='spacecraft_journey')throw new Error(`Spacecraft is not the third Journey: ${JSON.stringify(journeyOrder)}`);
await page.locator('[data-journey="train_journey"]').click();
let state=await page.evaluate(()=>({active:window.LullabyTrainJourney.active,title:document.querySelector('.aircraft-title-row h3')?.textContent,phase:document.querySelector('#phaseLabel')?.textContent}));
if(!state.active||!state.title?.includes('열차')||!['Ready','준비'].includes(state.phase))throw new Error(`Train selection failed: ${JSON.stringify(state)}`);
await page.waitForTimeout(1100);
state=await page.evaluate(()=>({title:document.querySelector('.aircraft-title-row h3')?.textContent,phase:document.querySelector('#phaseLabel')?.textContent}));
if(!state.title?.includes('열차')||!['Ready','준비'].includes(state.phase))throw new Error(`Train selection was overwritten by localization: ${JSON.stringify(state)}`);
await page.locator('#scenePlay').click();await page.waitForTimeout(700);
state=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,role:window.LullabyTrainJourney.audibleRole,playing:document.querySelector('#scenePlay')?.textContent}));
if(state.phase!=='Departing'||state.role!=='departure'||!state.playing.includes('Ⅱ'))throw new Error(`Train departure failed: ${JSON.stringify(state)}`);
await page.waitForTimeout(1100);
state=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,title:document.querySelector('.aircraft-title-row h3')?.textContent}));
if(['Ready','준비'].includes(state.phase)||!state.title?.includes('열차'))throw new Error(`Train playback was overwritten by localization: ${JSON.stringify(state)}`);
await page.locator('#journeyNextPhase').click();await page.waitForTimeout(700);
state=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,role:window.LullabyTrainJourney.audibleRole,elapsed:window.LullabyJourneyRuntime.elapsedMs}));
if(state.phase!=='Leaving city'||state.role!=='bed'||state.elapsed<35000)throw new Error(`Train bed transition failed: ${JSON.stringify(state)}`);
await page.evaluate(()=>window.LullabyJourneyRuntime.seekToMs(window.LullabyJourneyRuntime.totalMs-32000));await page.waitForTimeout(700);
state=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,role:window.LullabyTrainJourney.audibleRole}));
if(state.phase!=='Arriving'||state.role!=='arrival')throw new Error(`Train arrival transition failed: ${JSON.stringify(state)}`);
await page.locator('#scenePlay').click();await page.locator('[data-journey="passenger_aircraft_cabin"]').click();
if(await page.locator('.aircraft-title-row h3').textContent()!=='Passenger Aircraft Cabin')throw new Error('Aircraft selector did not restore the original journey');

for(const journey of[
  ['ferry_journey','야간 페리 여정',128667],
  ['spacecraft_journey','우주선 표류',17824],
  ['submarine_journey','잠수함 항해',47282]
]){
  const[id,title,departureMs]=journey;
  const immediate=await page.evaluate(id=>{document.querySelector(`[data-journey="${id}"]`)?.click();return{title:document.querySelector('.aircraft-title-row h3')?.textContent,phase:document.querySelector('#phaseLabel')?.textContent}},id);
  if(immediate.title!==title||!['Ready','준비'].includes(immediate.phase))throw new Error(`${id} flickered through the aircraft renderer: ${JSON.stringify(immediate)}`);
  await page.waitForTimeout(80);
  state=await page.evaluate(()=>({active:window.LullabyRemainingJourneys?.active,title:document.querySelector('.aircraft-title-row h3')?.textContent,phase:document.querySelector('#phaseLabel')?.textContent}));
  if(state.active!==id||state.title!==title||!['Ready','준비'].includes(state.phase))throw new Error(`${id} selection failed: ${JSON.stringify(state)}`);
  await page.waitForTimeout(1100);
  state=await page.evaluate(()=>({title:document.querySelector('.aircraft-title-row h3')?.textContent,phase:document.querySelector('#phaseLabel')?.textContent}));
  if(state.title!==title||!['Ready','준비'].includes(state.phase))throw new Error(`${id} selection was overwritten by localization: ${JSON.stringify(state)}`);
  await page.locator('#scenePlay').click();await page.waitForTimeout(650);
  state=await page.evaluate(()=>({role:window.LullabyRemainingJourneys?.audibleRole,playing:document.querySelector('#scenePlay')?.textContent}));
  if(state.role!=='departure'||!state.playing.includes('Ⅱ'))throw new Error(`${id} departure failed: ${JSON.stringify(state)}`);
  await page.waitForTimeout(1100);
  state=await page.evaluate(()=>({phase:document.querySelector('#phaseLabel')?.textContent,title:document.querySelector('.aircraft-title-row h3')?.textContent}));
  if(['Ready','준비'].includes(state.phase)||state.title!==title)throw new Error(`${id} playback was overwritten by localization: ${JSON.stringify(state)}`);
  await page.locator('#journeyNextPhase').click();await page.waitForTimeout(650);
  state=await page.evaluate(()=>({role:window.LullabyRemainingJourneys?.audibleRole,elapsed:window.LullabyJourneyRuntime.elapsedMs}));
  if(state.role!=='bed'||state.elapsed<departureMs-1000)throw new Error(`${id} bed transition failed: ${JSON.stringify(state)}`);
  await page.evaluate(()=>window.LullabyJourneyRuntime.seekToMs(window.LullabyJourneyRuntime.totalMs-1000));await page.waitForTimeout(650);
  state=await page.evaluate(()=>({role:window.LullabyRemainingJourneys?.audibleRole,paused:Object.fromEntries(Object.entries(window.LullabyRemainingJourneys?.activeNodes||{}).map(([key,node])=>[key,node.el.paused]))}));
  if(state.role!=='arrival'||Object.entries(state.paused).some(([key,paused])=>key!=='arrival'&&key!=='transition'&&!paused))throw new Error(`${id} arrival failed: ${JSON.stringify(state)}`);
  await page.locator('#scenePlay').click();await page.waitForTimeout(60);
}
await page.locator('[data-journey="passenger_aircraft_cabin"]').click();
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();console.log('Web Aircraft, Train, Ferry, Spacecraft and Submarine journey routing passed');
