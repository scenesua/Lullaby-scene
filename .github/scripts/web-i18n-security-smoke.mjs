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
await page.waitForSelector('#builtInPresets [data-preset="preset_rainy_cafe"]');
await page.addScriptTag({url:'http://127.0.0.1:4173/player-runtime-bridge-v12.js?v=12'});
await page.addScriptTag({url:'http://127.0.0.1:4173/i18n-catalog-v1.js?v=1'});
await page.addScriptTag({url:'http://127.0.0.1:4173/mixer-interaction-v14.js?v=14'});
await page.addScriptTag({url:'http://127.0.0.1:4173/simple-scene-quick-mixer-v12.js?v=12'});
await page.waitForSelector('[data-quick-source="rain"]');
await page.waitForTimeout(250);

async function text(selector){return (await page.locator(selector).first().textContent())?.trim()}
async function expectText(selector,expected){const actual=await text(selector);if(actual!==expected)throw new Error(`${selector}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)}

await expectText('[data-i18n="simpleScenes"]','준비된 장면');
await expectText('#builtInPresets [data-preset="preset_rainy_cafe"] strong','비 오는 카페');
await expectText('#mixerGrid [data-source="rain"] strong','비');
await expectText('[data-filter="nature"]','자연');
await expectText('[data-quick-source="rain"] strong','비');
await expectText('.aircraft-title-row h3','여객기 객실');

await page.locator('.language-toggle').first().click();
await page.waitForTimeout(250);
await expectText('[data-i18n="simpleScenes"]','Simple Scenes');
await expectText('#builtInPresets [data-preset="preset_rainy_cafe"] strong','Rainy Cafe');
await expectText('#mixerGrid [data-source="rain"] strong','Rain');
await expectText('[data-filter="nature"]','Nature');
await expectText('[data-quick-source="rain"] strong','Rain');
await expectText('.aircraft-title-row h3','Passenger Aircraft Cabin');

if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log('catalog localization smoke passed');
