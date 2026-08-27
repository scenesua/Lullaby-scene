// Legacy CI markers only: lullaby-scene-site-v20 /visitor-count-v1.js?v=2
const CACHE='lullaby-scene-debug-v19';
const APP_SHELL=['/','/player/','/download/','/blackout/','/privacy/','/terms/','/credits/','/debug/','/styles.css?v=9','/player-v2.css?v=24','/site-shell.css?v=9','/polish-v9.css?v=9','/site-runtime-v12.css?v=13','/mixer-controls-v14.css?v=14','/mobile-android-shell-v1.css?v=3','/display-tools-v1.css?v=3','/locale-boot-v1.js?v=1','/site.js?v=14','/site-locales-v10.js?v=20','/player-v2.js?v=18','/mixer-fx-v9.js?v=9','/scene-audio-v2.js?v=16','/train-journey-v1.js?v=11','/remaining-journeys-v1.js?v=32','/journey-background-v1.js?v=14','/player-shell-v10.js?v=12','/player-controls-v11.js?v=15','/player-runtime-bridge-v12.js?v=13','/i18n-runtime-v3.js?v=8','/aircraft-source-v15.js?v=15','/mixer-interaction-v14.js?v=16','/simple-scene-quick-mixer-v12.js?v=13','/saved-scenes-v13.js?v=14','/scene-recipe-v1.js?v=3','/mobile-android-shell-v1.js?v=5','/display-tools-v1.js?v=4','/audio-stability-v1.js?v=2','/visitor-count-v1.js?v=8','/legal-language-v9.js?v=10','/debug-console-v1.js?v=9','/debug-bridge-v1.js?v=8','/mixer-sources.json','/manifest.webmanifest','/assets/icon-webapp-192.png','/assets/icon-webapp-512.png','/assets/icon-webapp-maskable-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.startsWith('/api/')){event.respondWith(fetch(event.request));return}
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('/player/')||caches.match('/'))));return;
  }
  if(event.request.destination==='audio'||url.pathname.endsWith('.ogg')){event.respondWith(fetch(event.request));return}
  const freshUi=['script','style','manifest','image'].includes(event.request.destination)||url.pathname.endsWith('.json')||url.pathname.endsWith('.webmanifest')||url.pathname.endsWith('.png');
  if(freshUi){event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request)));return}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response})));
});
