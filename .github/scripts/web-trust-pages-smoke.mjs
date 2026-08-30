import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.TRUST_BASE_URL?.replace(/\/$/,'');
async function read(path){
  if(!base)return fs.readFile(`web${path.endsWith('/')?path+'index.html':path}`,'utf8');
  const response=await fetch(base+path,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`${path} is public`);
  return response.text();
}
const home=await read('/');
assert(home.includes('<meta name="google-adsense-account" content="ca-pub-7386173978832321">'),'Keep ownership verification');
assert.equal((await read('/ads.txt')).trim(),'google.com, pub-7386173978832321, DIRECT, f08c47fec0942fa0');
for(const path of ['/','/player/','/download/','/terms/','/credits/','/about/','/contact/','/privacy/']){
  const html=path==='/'?home:await read(path);
  const footer=html.slice(html.indexOf('<footer'));
  for(const link of ['/about/','/contact/','/privacy/'])assert(footer.includes(`href="${link}"`),`${path} links to ${link}`);
  for(const script of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/g)){
    assert.equal(new URL(script[1],'https://lullabyscene.com').origin,'https://lullabyscene.com','Only existing first-party scripts; no ad runtime');
  }
  if(['/about/','/contact/','/privacy/'].includes(path)){
    assert(html.includes(`rel="canonical" href="https://lullabyscene.com${path}"`));
    assert(html.includes('data-lang-block="ko"')&&html.includes('data-lang-block="en"'));
    assert(html.includes('/trust-pages.css?v=1'));
  }
  if(path==='/contact/'||path==='/privacy/')assert(html.includes('mailto:scenesuastudio@gmail.com'));
}
assert((await read('/privacy/')).includes('localStorage'));
assert((await read('/trust-pages.css')).includes('.story-hero'));
const sitemap=await read('/sitemap.xml'),locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
assert.equal(new Set(locations).size,locations.length,'No duplicate sitemap URLs');
for(const path of ['about','contact','privacy','credits'])assert(locations.includes(`https://lullabyscene.com/${path}/`));
console.log('Trust pages, navigation, ownership metadata and ads.txt verified'+(base?` on ${base}`:' locally'));
