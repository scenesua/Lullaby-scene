import {existsSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import debugWorker from '../../web/_worker.js';

const root=new URL('../../',import.meta.url);
const text=path=>readFileSync(new URL(path,root),'utf8');
for(const file of['web/debug/index.html','web/debug-console-v1.js','web/debug-bridge-v1.js']){
  if(!existsSync(new URL(file,root)))throw new Error(`Missing debug asset: ${file}`);
}
const page=text('web/debug/index.html'),player=text('web/player/index.html'),bridge=text('web/debug-bridge-v1.js'),consoleJs=text('web/debug-console-v1.js'),worker=text('web/_worker.js'),routes=JSON.parse(text('web/_routes.json')),headers=text('web/_headers'),redirects=text('web/_redirects');
for(const marker of['선택 이벤트 즉시 발생','다음 루프 직전으로','단계 바로 이동','Audio Nodes'])if(!page.includes(marker))throw new Error(`Debug console missing ${marker}`);
for(const marker of['triggerEvent','jumpBeforeLoop','selectJourney','setAudioContext','snapshot'])if(!bridge.includes(marker)||!consoleJs.includes(marker))throw new Error(`Debug bridge is not wired for ${marker}`);
if(!player.includes('/debug-bridge-v1.js?v=8'))throw new Error('Player does not load the debug bridge');
for(const marker of['EVENT_OPTIONS','eventOptions','forest_temple_journey','heartSutra','hood_journey','동네 개 짖는 소리'])if(!bridge.includes(marker))throw new Error(`Journey event selector missing ${marker}`);
if(page.indexOf('forest_temple_journey')<0||page.indexOf('forest_temple_journey')>page.indexOf('hood_journey'))throw new Error('Forest Temple must appear immediately before HOOD in debug target order');
for(const host of ['debug.lullabyscene.com','lullabyscene.com','localhost']){
  for(const path of ['/debug/','/player/','/about/']){
    const response=await debugWorker.fetch(new Request(`https://${host}${path}`),{ASSETS:{fetch:async()=>new Response('test')}});
    const embedded=host==='debug.lullabyscene.com'&&path!=='/about/';
    assert.equal(response.headers.get('X-Frame-Options'),embedded?'SAMEORIGIN':'DENY');
    assert(response.headers.get('Content-Security-Policy').includes(embedded?"frame-src 'self'; frame-ancestors 'self'":"frame-src 'none'; frame-ancestors 'none'"));
  }
}
assert.equal((await debugWorker.fetch(new Request('https://preview.pages.dev/player/'),{})).status,404);
if(!routes.include.includes('/*'))throw new Error('Debug Worker must cover static routes');
if(!worker.includes("url.hostname.endsWith('.pages.dev')"))throw new Error('Raw Pages hosts must not bypass Access');
if(!headers.includes("frame-src 'none'; frame-ancestors 'none'"))throw new Error('Static pages must retain deny-by-default framing');
if(!redirects.startsWith('/ /debug/ 302'))throw new Error('Debug project root does not open the console');
if(!page.includes('noindex,nofollow,noarchive'))throw new Error('Debug page must not be indexed');
console.log('Debug console static smoke passed');
