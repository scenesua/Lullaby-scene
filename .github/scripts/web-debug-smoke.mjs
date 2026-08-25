import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const text=path=>readFileSync(new URL(path,root),'utf8');
for(const file of['web/debug/index.html','web/debug-console-v1.js','web/debug-bridge-v1.js']){
  if(!existsSync(new URL(file,root)))throw new Error(`Missing debug asset: ${file}`);
}
const page=text('web/debug/index.html'),player=text('web/player/index.html'),bridge=text('web/debug-bridge-v1.js'),consoleJs=text('web/debug-console-v1.js'),worker=text('web/_worker.js'),headers=text('web/_headers'),redirects=text('web/_redirects');
for(const marker of['랜덤 이벤트 당장 발생','다음 루프 직전으로','단계 바로 이동','Audio Nodes'])if(!page.includes(marker))throw new Error(`Debug console missing ${marker}`);
for(const marker of['triggerEvent','jumpBeforeLoop','selectJourney','setAudioContext','snapshot'])if(!bridge.includes(marker)||!consoleJs.includes(marker))throw new Error(`Debug bridge is not wired for ${marker}`);
if(!player.includes('/debug-bridge-v1.js?v=1'))throw new Error('Player does not load the debug bridge');
if(!worker.includes("frame-src 'self'; frame-ancestors 'self'"))throw new Error('Debug CSP does not allow its same-origin player frame');
if(!headers.includes("frame-src 'self'; frame-ancestors 'self'"))throw new Error('Static debug CSP does not allow its same-origin player frame');
if(!redirects.startsWith('/ /debug/ 302'))throw new Error('Debug project root does not open the console');
if(!page.includes('noindex,nofollow,noarchive'))throw new Error('Debug page must not be indexed');
console.log('Debug console static smoke passed');
