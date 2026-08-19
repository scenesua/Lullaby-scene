import fs from 'node:fs';
import { chromium } from 'playwright-core';

const soundId=process.argv[2]||'853735';
const pageUrl=`https://freesound.org/people/jasonm911/sounds/${soundId}/`;
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=candidates.find(path=>fs.existsSync(path));
if(!executablePath)throw new Error('No Chrome/Chromium executable found on runner');

const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();
const seen=new Set();
const add=value=>{
  if(!value)return;
  const text=String(value).replaceAll('\\/','/').replaceAll('&amp;','&');
  for(const match of text.matchAll(/https?:\/\/[^\s"'<>\\]+/g))seen.add(match[0].replace(/[),;]+$/,''));
};
page.on('request',request=>add(request.url()));
page.on('response',response=>add(response.url()));
await page.goto(pageUrl,{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForTimeout(3000);

async function collect(){
  add(await page.content());
  const values=await page.evaluate(()=>{
    const out=[];
    document.querySelectorAll('*').forEach(el=>{
      for(const name of ['src','href','data-src','data-url','data-mp3','data-ogg','data-preview','data-audio']){
        const value=el.getAttribute?.(name);if(value)out.push(value);
      }
    });
    performance.getEntriesByType('resource').forEach(entry=>out.push(entry.name));
    for(const key of Object.keys(window)){
      if(!/sound|preview|audio/i.test(key))continue;
      try{const value=window[key];if(typeof value==='string')out.push(value);else if(value&&typeof value==='object')out.push(JSON.stringify(value))}catch{}
    }
    return out;
  });
  values.forEach(add);
}
await collect();

function choose(){
  const urls=[...seen].filter(url=>url.includes(soundId)&&/\.(ogg|mp3)(?:\?|$)/i.test(url));
  return urls.find(url=>/-hq\.ogg(?:\?|$)/i.test(url))
    ||urls.find(url=>/hq.*\.ogg(?:\?|$)/i.test(url))
    ||urls.find(url=>/\.ogg(?:\?|$)/i.test(url))
    ||urls.find(url=>/-hq\.mp3(?:\?|$)/i.test(url))
    ||urls[0];
}
let chosen=choose();
if(!chosen){
  const playSelectors=['button[aria-label*="play" i]','button[title*="play" i]','[class*="play" i] button','button[class*="play" i]'];
  for(const selector of playSelectors){
    const button=page.locator(selector).first();
    if(await button.count()){
      try{await button.click({timeout:1500});await page.waitForTimeout(2500);break}catch{}
    }
  }
  await collect();chosen=choose();
}
await browser.close();
if(!chosen){
  console.error(`Could not discover a preview URL for Freesound ${soundId}. Saw ${seen.size} URLs.`);
  console.error([...seen].filter(url=>/freesound|audio|preview/i.test(url)).slice(0,80).join('\n'));
  process.exit(2);
}
process.stdout.write(chosen);
