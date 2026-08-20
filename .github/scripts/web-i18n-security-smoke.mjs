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
await page.addStyleTag({url:'http://127.0.0.1:4173/mobile-android-shell-v1.css?v=1'});
await page.addScriptTag({url:'http://127.0.0.1:4173/site-locales-v10.js?v=10'});
await page.addScriptTag({url:'http://127.0.0.1:4173/player-runtime-bridge-v12.js?v=12'});
await page.addScriptTag({url:'http://127.0.0.1:4173/i18n-catalog-v2.js?v=2'});
await page.addScriptTag({url:'http://127.0.0.1:4173/mixer-interaction-v14.js?v=14'});
await page.addScriptTag({url:'http://127.0.0.1:4173/simple-scene-quick-mixer-v12.js?v=12'});
await page.addScriptTag({url:'http://127.0.0.1:4173/mobile-android-shell-v1.js?v=1'});
await page.waitForSelector('[data-quick-source="rain"]',{state:'attached'});
await page.waitForTimeout(350);

async function text(selector){return (await page.locator(selector).first().textContent())?.trim()}
async function expectText(selector,expected){const actual=await text(selector);if(actual!==expected)throw new Error(`${selector}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)}
async function setLanguage(code){await page.evaluate(code=>window.LullabyLocales.setLanguage(code),code);await page.waitForTimeout(100)}

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
  vi:['Cảnh dựng sẵn','Mưa','Quán cà phê mưa'],
};

const options=await page.locator('.language-select').first().locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
if(JSON.stringify(options)!==JSON.stringify(Object.keys(expected)))throw new Error(`language dropdown mismatch: ${JSON.stringify(options)}`);
for(const [code,[prepared,rain,preset]] of Object.entries(expected)){
  await setLanguage(code);
  await expectText('[data-i18n="simpleScenes"]',prepared);
  await expectText('#mixerGrid [data-source="rain"] strong',rain);
  await expectText('#builtInPresets [data-preset="preset_rainy_cafe"] strong',preset);
}
await setLanguage('en');
const simpleLeak=await page.locator('body').evaluate(el=>/\bSimple Scenes?\b/.test(el.innerText));
if(simpleLeak)throw new Error('English UI still exposes legacy Simple Scene wording');

await page.setViewportSize({width:390,height:844});
await page.waitForTimeout(220);
const shell=await page.evaluate(()=>({
  header:document.querySelector('.site-header')?getComputedStyle(document.querySelector('.site-header')).display:null,
  intro:document.querySelector('.player-page-intro')?getComputedStyle(document.querySelector('.player-page-intro')).display:null,
  subtabs:document.querySelector('.scene-subtabs')?getComputedStyle(document.querySelector('.scene-subtabs')).display:null,
  nav:document.querySelector('.mobile-tabs')?getComputedStyle(document.querySelector('.mobile-tabs')).display:null,
  navCount:document.querySelectorAll('[data-android-dest]').length,
  top:document.querySelector('.mobile-player-top')?getComputedStyle(document.querySelector('.mobile-player-top')).display:null,
}));
if(shell.header!=='none'||shell.intro!=='none'||shell.subtabs!=='none'||shell.nav==='none'||shell.navCount!==5||shell.top==='none')throw new Error(`Android shell mismatch: ${JSON.stringify(shell)}`);

await page.locator('[data-android-dest="prepared"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-scene-content="simple"]').evaluate(el=>el.classList.contains('active')))throw new Error('Prepared bottom destination did not open prepared scene panel');
await expectText('[data-android-title]','Ready-made Scenes');

await page.locator('[data-android-dest="fx"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="fx"]').evaluate(el=>el.classList.contains('active')))throw new Error('FX bottom destination did not open FX panel');
await page.locator('[data-android-dest="settings"]').click();await page.waitForTimeout(80);
if(await page.locator('.android-language-setting .language-select').count()!==1)throw new Error('Settings language dropdown missing');

await page.locator('[data-android-timer]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="timer"]').evaluate(el=>el.classList.contains('active')))throw new Error('Top timer action did not open timer panel');
if(await page.locator('[data-android-back]').getAttribute('hidden')!==null)throw new Error('Timer back button is not visible');
await page.locator('[data-android-back]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="settings"]').evaluate(el=>el.classList.contains('active')))throw new Error('Timer back did not restore prior primary destination');

if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('13-locale catalog and Android narrow-shell smoke passed');
