import fs from 'node:fs';
import {chromium} from 'playwright-core';

const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});

await page.goto('http://127.0.0.1:4173/player/',{waitUntil:'networkidle'});
await page.waitForSelector('#builtInPresets [data-preset="preset_rainy_cafe"]',{state:'attached'});
await page.addStyleTag({url:'http://127.0.0.1:4173/mobile-android-shell-v1.css?v=3'});
for(const src of [
  '/site-locales-v10.js?v=11',
  '/player-runtime-bridge-v12.js?v=12',
  '/mixer-interaction-v14.js?v=14',
  '/simple-scene-quick-mixer-v12.js?v=12',
  '/saved-scenes-v13.js?v=13',
  '/i18n-runtime-v3.js?v=3',
  '/mobile-android-shell-v1.js?v=2'
])await page.addScriptTag({url:`http://127.0.0.1:4173${src}`});
await page.waitForSelector('[data-quick-source="rain"]',{state:'attached'});
await page.waitForTimeout(450);

async function text(selector){return (await page.locator(selector).first().textContent())?.trim()}
async function expectText(selector,expected){const actual=await text(selector);if(actual!==expected)throw new Error(`${selector}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)}
async function setLanguage(code){await page.evaluate(code=>window.LullabyLocales.setLanguage(code),code);await page.waitForTimeout(70)}

const expected={
  ko:['준비된 장면','비','비 오는 카페'],
  en:['Ready-made Scenes','Rain','Rainy Cafe'],
  ja:['用意されたシーン','雨','雨のカフェ'],
  'zh-CN':['预设场景','雨','雨天咖啡馆'],
  'zh-TW':['預設場景','雨聲','雨天咖啡館'],
  ru:['Готовые сцены','Дождь','Дождливое кафе'],
  fr:['Scènes prêtes à l’emploi','Pluie','Café sous la pluie'],
  es:['Escenas preparadas','Lluvia','Café lluvioso'],
  pt:['Cenas prontas','Chuva','Café com chuva'],
  th:['ฉากพร้อมใช้','ฝน','คาเฟ่ยามฝนตก'],
  tl:['Mga Nakahandang Eksena','Ulan','Maulang Café'],
  hi:['तैयार दृश्य','बारिश','बरसाती कैफ़े'],
  vi:['Cảnh dựng sẵn','Mưa','Quán cà phê mưa']
};
const options=await page.locator('.language-select').first().locator('option').evaluateAll(nodes=>nodes.map(node=>node.value));
if(JSON.stringify(options)!==JSON.stringify(Object.keys(expected)))throw new Error(`language dropdown mismatch: ${JSON.stringify(options)}`);
for(const [code,[prepared,rain,preset]] of Object.entries(expected)){
  await setLanguage(code);
  await expectText('[data-i18n="simpleScenes"]',prepared);
  await expectText('#mixerGrid [data-source="rain"] strong',rain);
  await expectText('#builtInPresets [data-preset="preset_rainy_cafe"] strong',preset);
  await expectText('[data-quick-source="rain"] strong',rain);
}
await setLanguage('en');
if(await page.locator('body').evaluate(el=>/\bSimple Scenes?\b/.test(el.innerText)))throw new Error('English UI still exposes legacy Simple Scene wording');

// A translated phase must not pin the old phase key when the player advances.
await setLanguage('ko');
await page.evaluate(()=>{const phase=document.getElementById('phaseLabel');phase.dataset.phaseKey='Ready';phase.textContent='Taxi out';window.LullabyCatalogI18n.apply()});
await page.waitForTimeout(40);await expectText('#phaseLabel','지상 이동');
await page.evaluate(()=>{const phase=document.getElementById('phaseLabel');phase.textContent='Takeoff';window.LullabyCatalogI18n.apply()});
await page.waitForTimeout(40);await expectText('#phaseLabel','이륙');

// Stress repeated locale changes, then verify the renderer becomes idle instead of entering a MutationObserver feedback loop.
await page.evaluate(()=>{window.__mutationCount=0;window.__mutationObserver=new MutationObserver(records=>window.__mutationCount+=records.length);window.__mutationObserver.observe(document.getElementById('webPlayer'),{subtree:true,childList:true,attributes:true,characterData:true})});
const codes=Object.keys(expected);
for(let i=0;i<39;i++)await setLanguage(codes[i%codes.length]);
await setLanguage('ko');
await page.waitForTimeout(900);
await page.evaluate(()=>window.__mutationCount=0);
const ticks=await page.evaluate(()=>new Promise(resolve=>{let ticks=0;const id=setInterval(()=>ticks++,50);setTimeout(()=>{clearInterval(id);resolve(ticks)},2200)}));
const mutationCount=await page.evaluate(()=>window.__mutationCount);
if(ticks<30)throw new Error(`renderer event loop stalled during idle stability test: ${ticks} ticks`);
if(mutationCount>40)throw new Error(`renderer kept mutating while idle: ${mutationCount} mutations`);

await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
const shell=await page.evaluate(()=>({
  header:getComputedStyle(document.querySelector('.site-header')).display,
  intro:getComputedStyle(document.querySelector('.player-page-intro')).display,
  subtabs:getComputedStyle(document.querySelector('.scene-subtabs')).display,
  nav:getComputedStyle(document.querySelector('.mobile-tabs')).display,
  navCount:document.querySelectorAll('[data-android-dest]').length,
  top:getComputedStyle(document.querySelector('.mobile-player-top')).display
}));
if(shell.header!=='none'||shell.intro!=='none'||shell.subtabs!=='none'||shell.nav==='none'||shell.navCount!==5||shell.top==='none')throw new Error(`Android shell mismatch: ${JSON.stringify(shell)}`);
await page.locator('[data-android-dest="prepared"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-scene-content="simple"]').evaluate(el=>el.classList.contains('active')))throw new Error('Prepared destination did not open ready-made scenes');
await expectText('[data-android-title]','준비된 장면');
const preparedLayout=await page.evaluate(()=>{
  const preset=document.querySelector('#builtInPresets [data-preset="preset_rainy_cafe"]');
  const transport=document.querySelector('#simpleSceneTransport');
  const quick=document.querySelector('#simpleQuickMixerSection');
  const mixerSource=document.querySelector('#mixerGrid [data-source="rain"]');
  return{
    presetVisible:!!preset&&getComputedStyle(preset).display!=='none',
    presetTop:preset?.getBoundingClientRect().top??null,
    transportTop:transport?.getBoundingClientRect().top??null,
    quickDisplay:quick?getComputedStyle(quick).display:null,
    mixerSourceVisible:!!mixerSource&&mixerSource.getClientRects().length>0
  };
});
if(!preparedLayout.presetVisible||preparedLayout.quickDisplay!=='none'||preparedLayout.mixerSourceVisible||preparedLayout.presetTop===null||preparedLayout.transportTop===null||preparedLayout.presetTop>=preparedLayout.transportTop)throw new Error(`Prepared mobile layout mismatch: ${JSON.stringify(preparedLayout)}`);
await page.locator('[data-android-dest="mixer"]').click();await page.waitForTimeout(80);
if(!await page.locator('#mixerGrid [data-source="rain"]').isVisible())throw new Error('Mixer destination did not expose source controls');
await page.locator('[data-android-dest="prepared"]').click();await page.waitForTimeout(80);
await page.locator('[data-android-dest="fx"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="fx"]').evaluate(el=>el.classList.contains('active')))throw new Error('FX destination did not open');
await page.locator('[data-android-dest="settings"]').click();await page.waitForTimeout(80);
if(await page.locator('.android-language-setting .language-select').count()!==1)throw new Error('Settings language dropdown missing');
await page.locator('[data-android-timer]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="timer"]').evaluate(el=>el.classList.contains('active')))throw new Error('Top timer action did not open timer');
await page.locator('[data-android-back]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="settings"]').evaluate(el=>el.classList.contains('active')))throw new Error('Timer back did not restore Settings');

await page.evaluate(()=>window.__mutationObserver?.disconnect());
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log(`13-locale + Android shell + prepared-scene mobile layout stable; idle mutations=${mutationCount}, ticks=${ticks}`);