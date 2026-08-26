import fs from 'node:fs';
import vm from 'node:vm';

const listeners=new Map(),cacheCalls=[],fetchCalls=[];
const sandbox={
  URL,
  self:{location:{origin:'https://lullabyscene.com'},addEventListener:(name,handler)=>listeners.set(name,handler)},
  fetch:request=>{fetchCalls.push(request);return Promise.resolve({ok:true})},
  caches:{
    match:request=>{cacheCalls.push(['match',request]);return Promise.resolve(null)},
    open:name=>{cacheCalls.push(['open',name]);return Promise.resolve({addAll:()=>Promise.resolve(),put:()=>Promise.resolve()})},
    keys:()=>Promise.resolve([]),
    delete:name=>{cacheCalls.push(['delete',name]);return Promise.resolve(true)}
  }
};
vm.runInNewContext(fs.readFileSync('web/sw.js','utf8'),sandbox,{filename:'web/sw.js'});
const handler=listeners.get('fetch');
if(!handler)throw new Error('Service Worker fetch handler is missing');

const request={method:'GET',url:'https://lullabyscene.com/api/private-settings',mode:'cors',destination:''};
let response;
handler({request,respondWith:value=>{response=value}});
if(!response)throw new Error('API GET was not handled');
await response;
if(fetchCalls.length!==1||fetchCalls[0]!==request)throw new Error('API GET was not sent directly to the network');
if(cacheCalls.length)throw new Error(`API GET touched Cache API: ${JSON.stringify(cacheCalls)}`);

console.log('Service Worker bypasses Cache API for same-origin /api/* GET requests');
