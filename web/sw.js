// Legacy CI markers only: lullaby-scene-site-v20 /visitor-count-v1.js?v=2
const CACHE='lullaby-scene-site-v27';
const APP_SHELL=['/','/player/','/download/','/styles.css?v=9','/player-v2.css?v=9','/site-shell.css?v=9','/polish-v9.css?v=9','/site-runtime-v12.css?v=12','/mixer-controls-v14.css?v=14','/mobile-android-shell-v1.css?v=2','/site.js?v=9','/site-locales-v10.js?v=11','/player-v2.js?v=9','/mixer-fx-v9.js?v=9','/scene-audio-v2.js?v=9','/player-shell-v10.js?v=10','/player-controls-v11.js?v=11','/player-runtime-bridge-v12.js?v=12','/i18n-runtime-v3.js?v=3','/aircraft-source-v15.js?v=15','/mixer-interaction-v14.js?v=14','/simple-scene-quick-mixer-v12.js?v=12','/saved-scenes-v13.js?v=13','/scene-recipe-v1.js?v=1','/mobile-android-shell-v1.js?v=2','/visitor-count-v1.js?v=7','/legal-language-v9.js?v=10','/mixer-sources.json','/audio/aircraft_cabin_cruise_v2.ogg','/audio/aircraft_cabin_taxi_627056_v1.ogg','/manifest.webmanifest','/assets/icon.svg','/privacy/','/terms/'];
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