const CACHE='lullaby-scene-site-v10';
const APP_SHELL=['/','/player/','/download/','/styles.css?v=9','/player-v2.css?v=9','/site-shell.css?v=9','/polish-v9.css?v=9','/site.js?v=9','/player-v2.js?v=9','/mixer-fx-v9.js?v=9','/scene-audio-v2.js?v=9','/player-shell-v9.js?v=9','/player-shell-v10.js?v=10','/legal-language-v9.js?v=9','/mixer-sources.json','/manifest.webmanifest','/assets/icon.svg','/privacy/','/terms/'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/player/')||caches.match('/'))));return;
  }
  const freshUi=['script','style','manifest'].includes(event.request.destination)||url.pathname.endsWith('.json')||url.pathname.endsWith('.webmanifest');
  if(freshUi){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request)));return}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})));
});
