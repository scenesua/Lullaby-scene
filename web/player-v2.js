const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
document.getElementById('year').textContent=new Date().getFullYear();

const AudioCtx=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,visualAnalyser=null,masterValue=+(localStorage.getItem('lullaby-master')||70)/100;
const nodes={};const eventState={};let catalog=[];let sourceById={};let currentFilter='all';let aircraftObjectUrl=null;
let sceneNode=null,sceneTimer=null,sceneStartedAt=0,pausedAt=0,scenePlaying=false,durationMinutes=480,sceneEvents=[],activeJourneyId='passenger_aircraft_cabin';
const macro={engine:.55,activity:.22,turbulence:.12,night:.68};
let sleepTimerEnd=0,sleepTimerTick=null,sleepFadeSeconds=30;
let deferredInstall=null;

const builtinPresets=[
 {id:'preset_rainy_cafe',name:'Rainy Cafe',master:.7,mix:{rain:.5,cafe:.35}},
 {id:'preset_forest_night',name:'Forest Night',master:.7,mix:{forest:.4,crickets:.25,wind:.15}},
 {id:'preset_beach',name:'Beach',master:.7,mix:{ocean:.5,wind:.3}},
 {id:'preset_cozy_fireplace',name:'Cozy Fireplace',master:.7,mix:{fire:.5,rain:.25}},
 {id:'preset_train_journey',name:'Train Journey',master:.7,mix:{train:.5,city:.2}},
 {id:'preset_city_night',name:'City Night',master:.7,mix:{city:.4,rain:.3}},
 {id:'preset_thunderstorm',name:'Thunderstorm',master:.65,mix:{rain:.45,thunder:.3,wind:.18}},
 {id:'preset_forest_morning',name:'Forest Morning',master:.7,mix:{forest:.5,stream:.2,wind:.15}},
 {id:'preset_bamboo_meditation',name:'Bamboo Meditation',master:.65,mix:{bamboo_forest:.4,singing_bowl:.3,stream:.12}},
 {id:'preset_deep_focus',name:'Deep Focus',master:.65,mix:{pink_noise:.35,brown_noise:.22,cafe:.12}},
 {id:'preset_quiet_night',name:'Quiet Night',master:.7,mix:{brown_noise:.35,crickets:.2,wind:.1}},
 {id:'preset_morning_birds',name:'Morning Birds',master:.7,mix:{birds:.45,forest:.3}},
 {id:'preset_ocean_waves',name:'Ocean Waves',master:.7,mix:{ocean:.45,white_noise:.12}},
 {id:'preset_rainy_night',name:'Rainy Night',master:.7,mix:{rain:.5,brown_noise:.2}},
 {id:'preset_fan_room',name:'Fan Room',master:.65,mix:{fan:.45,pink_noise:.2}},
 {id:'preset_cafe_focus',name:'Cafe Focus',master:.65,mix:{cafe:.35,pink_noise:.2}},
 {id:'preset_simple_aircraft',name:'Aircraft Cabin · Simple',master:.65,mix:{aircraft_cabin:.5}},
 {id:'preset_simple_train',name:'Night Train · Simple',master:.65,mix:{train_journey_bed:.5}},
 {id:'preset_simple_ferry',name:'Night Ferry · Simple',master:.65,mix:{ferry_journey_bed:.46}},
 {id:'preset_simple_spacecraft',name:'Spacecraft Drift · Simple',master:.62,mix:{spacecraft_journey_bed:.48}},
 {id:'preset_simple_submarine',name:'Submarine Voyage · Simple',master:.62,mix:{submarine_journey_engine_bed:.32,submarine_journey_water_bed:.34,submarine_sonar:.08}},
 {id:'preset_winter_lighthouse',name:'Winter Lighthouse',master:.65,mix:{snowy_night:.38,lighthouse:.25,wind:.1}},
 {id:'preset_harbor_cabin',name:'Harbor Cabin',master:.65,mix:{ferry_journey_bed:.35,ocean:.22,lighthouse:.14}},
 {id:'preset_polar_night_train',name:'Polar Night Train',master:.65,mix:{train_journey_bed:.38,snowy_night:.28,brown_noise:.1}}
];

const presetVisuals={
 preset_rainy_cafe:'/assets/simple-scenes/rainy-cafe.webp',preset_cafe_focus:'/assets/simple-scenes/rainy-cafe.webp',
 preset_forest_night:'/assets/simple-scenes/forest-night.webp',preset_quiet_night:'/assets/simple-scenes/forest-night.webp',
 preset_beach:'/assets/simple-scenes/ocean-night.webp',preset_ocean_waves:'/assets/simple-scenes/ocean-night.webp',
 preset_cozy_fireplace:'/assets/simple-scenes/cozy-fireplace.webp',preset_city_night:'/assets/simple-scenes/city-night.webp',
 preset_thunderstorm:'/assets/simple-scenes/thunderstorm.webp',preset_rainy_night:'/assets/simple-scenes/thunderstorm.webp',
 preset_forest_morning:'/assets/simple-scenes/forest-morning.webp',preset_morning_birds:'/assets/simple-scenes/forest-morning.webp',
 preset_bamboo_meditation:'/assets/simple-scenes/bamboo-meditation.webp',preset_deep_focus:'/assets/simple-scenes/deep-focus.webp',
 preset_fan_room:'/assets/simple-scenes/fan-room.webp',preset_winter_lighthouse:'/assets/simple-scenes/winter-lighthouse.webp',
 preset_train_journey:'/assets/journeys/train.webp',preset_simple_train:'/assets/journeys/train.webp',preset_polar_night_train:'/assets/journeys/train.webp',
 preset_simple_aircraft:'/assets/journeys/aircraft.webp',preset_simple_ferry:'/assets/journeys/ferry.webp',preset_harbor_cabin:'/assets/journeys/ferry.webp',
 preset_simple_spacecraft:'/assets/journeys/spacecraft.webp',preset_simple_submarine:'/assets/journeys/submarine.webp'
};
window.LullabyPresetVisuals=presetVisuals;

function setStatus(text){const el=$('#playerStatus');if(el)el.textContent=text}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function fmt(ms,compact=false){ms=Math.max(0,ms);const sec=Math.floor(ms/1000),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;if(compact&&h===0)return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
async function ensureContext(){if(!AudioCtx)throw new Error('Web Audio API unavailable');if(!ctx){ctx=new AudioCtx();master=ctx.createGain();visualAnalyser=ctx.createAnalyser();visualAnalyser.fftSize=128;visualAnalyser.smoothingTimeConstant=.94;master.gain.value=masterValue;master.connect(visualAnalyser).connect(ctx.destination)}if(ctx.state==='suspended')await ctx.resume();return ctx}
window.LullabyAudioReactive={get analyser(){return visualAnalyser},get context(){return ctx}};
function setMaster(value,fromTimer=false){masterValue=clamp(+value,0,1);if(!fromTimer)localStorage.setItem('lullaby-master',String(Math.round(masterValue*100)));$$('.master-volume').forEach(r=>r.value=Math.round(masterValue*100));if(master&&ctx){const timerScale=sleepTimerEnd?clamp((sleepTimerEnd-Date.now())/(sleepFadeSeconds*1000),0,1):1;master.gain.setTargetAtTime(masterValue*timerScale,ctx.currentTime,.05)}}
$$('.master-volume').forEach(r=>{r.value=Math.round(masterValue*100);r.addEventListener('input',e=>setMaster(+e.target.value/100))});

function makeMediaNode(url,{loop=true,preload='auto'}={}){const el=new Audio();el.loop=loop;el.preload=preload;el.crossOrigin='anonymous';el.src=url;const src=ctx.createMediaElementSource(el),filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='lowpass';filter.frequency.value=20000;gain.gain.value=.3;src.connect(filter).connect(gain).connect(master);return{el,src,filter,gain,url}}
async function getAircraftUrl(){if(aircraftObjectUrl)return aircraftObjectUrl;const parts=await Promise.all([0,1,2,3].map(i=>fetch(`/audio/aircraft.part0${i}`).then(r=>{if(!r.ok)throw new Error(`aircraft part ${i}`);return r.text()})));const b64=parts.join('').replace(/\s/g,'');const bin=atob(b64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);aircraftObjectUrl=URL.createObjectURL(new Blob([bytes],{type:'audio/ogg'}));return aircraftObjectUrl}
async function makeSourceNode(def){await ensureContext();if(def.kind==='aircraft')return makeMediaNode(await getAircraftUrl());return makeMediaNode(def.url)}

async function loadCatalog(){const res=await fetch('/mixer-sources.json',{cache:'no-cache'});if(!res.ok)throw new Error('mixer catalog');const data=await res.json();catalog=data.sources;sourceById=Object.fromEntries(catalog.map(s=>[s.id,s]));renderMixerFilters();renderMixer();renderPresets()}
function renderMixerFilters(){const labels={all:'All',nature:'Nature',indoor:'Indoor',travel:'Travel',other:'Other'};$('#mixerFilters').innerHTML=Object.entries(labels).map(([id,label])=>`<button type="button" data-filter="${id}" class="${currentFilter===id?'active':''}">${label}</button>`).join('');$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{currentFilter=b.dataset.filter;renderMixerFilters();renderMixer()}))}
function renderMixer(){const list=currentFilter==='all'?catalog:catalog.filter(s=>s.category===currentFilter);$('#mixerGrid').innerHTML=list.map(def=>{const st=getMixerUiState(def.id);const kind=def.kind==='event'?'event layer':'continuous';return`<article class="mixer-source ${st.on?'on':''}" data-source="${def.id}"><div><strong>${def.name}</strong><span>${def.category} · ${kind}</span></div><button type="button" data-source-toggle="${def.id}">${st.on?'On':'Off'}</button><input data-source-volume="${def.id}" type="range" min="0" max="100" value="${st.volume}" aria-label="${def.name} volume"></article>`}).join('');$$('[data-source-toggle]').forEach(b=>b.addEventListener('click',()=>toggleMixer(b.dataset.sourceToggle)));$$('[data-source-volume]').forEach(r=>r.addEventListener('input',e=>setSourceVolume(e.target.dataset.sourceVolume,+e.target.value/100)))}
function getMixerUiState(id){const def=sourceById[id]||{};if(def.kind==='event')return{on:!!eventState[id]?.enabled,volume:Math.round((eventState[id]?.volume??(def.defaultVolume||30)/100)*100)};const n=nodes[id];return{on:!!n&&!n.el.paused,volume:Math.round((n?.gain?.gain?.value??(def.defaultVolume||30)/100)*100)}}
async function toggleMixer(id){try{const def=sourceById[id];if(!def)return;if(def.kind==='event'){if(eventState[id]?.enabled)stopEventLayer(id);else{stopJourneyPlayback();startEventLayer(def)}renderMixer();return}await ensureContext();if(!nodes[id])nodes[id]=await makeSourceNode(def);const n=nodes[id];if(n.el.paused){stopJourneyPlayback();n.gain.gain.value=(def.defaultVolume||30)/100;const slider=$(`[data-source-volume="${id}"]`);if(slider)n.gain.gain.value=+slider.value/100;await n.el.play()}else n.el.pause();renderMixer();updateNowPlaying()}catch(err){console.error(err);setStatus(`${sourceById[id]?.name||id} 오디오를 시작하지 못했습니다.`)}}
function setSourceVolume(id,value){const def=sourceById[id];if(def?.kind==='event'){eventState[id]=eventState[id]||{};eventState[id].volume=value;return}const n=nodes[id];if(n&&ctx)n.gain.gain.setTargetAtTime(value,ctx.currentTime,.05)}
function startEventLayer(def){eventState[def.id]={enabled:true,volume:(def.defaultVolume||30)/100,timer:null};scheduleEvent(def.id,100)}
function stopEventLayer(id){const st=eventState[id];if(!st)return;st.enabled=false;if(st.timer)clearTimeout(st.timer);st.timer=null;updateNowPlaying()}
function scheduleEvent(id,delayMs=null){const st=eventState[id],def=sourceById[id];if(!st?.enabled||!def)return;const wait=delayMs??rand((def.eventMinSeconds||2)*1000,(def.eventMaxSeconds||12)*1000);st.timer=setTimeout(async()=>{if(!st.enabled)return;try{await ensureContext();const node=makeMediaNode(def.url,{loop:false});node.gain.gain.value=st.volume??.35;node.el.addEventListener('ended',()=>{try{node.src.disconnect();node.filter.disconnect();node.gain.disconnect()}catch{}});await node.el.play()}catch(err){console.error(err)}finally{if(st.enabled)scheduleEvent(id)}},wait)}
function stopAllMixer(){Object.values(nodes).forEach(n=>{n.el.pause();n.el.currentTime=0});Object.keys(eventState).forEach(stopEventLayer);renderMixer();updateNowPlaying()}
$('#stopAllMixer')?.addEventListener('click',stopAllMixer);
$('#scenePlay')?.addEventListener('click',()=>{if(!scenePlaying){const stopSimple=window.LullabyControls?.simple?.stop;if(stopSimple)stopSimple();else stopAllMixer()}},true);

function phaseFor(ms,total){const m=ms/60000,t=total/60000;if(m<12)return['Taxi out',true];if(m<13.2)return['Takeoff',true];if(m<27)return['Climb',true];if(m<t-42)return['Cruise',false];if(m<t-15)return['Descent',true];if(m<t-7)return['Approach',true];if(m<t-6)return['Touchdown',true];if(m<t)return['Taxi in',true];return['Arrived',false]}
function currentElapsed(){return scenePlaying?pausedAt+(performance.now()-sceneStartedAt):pausedAt}
function buildSceneEvents(){const total=durationMinutes*60000,descentStart=total-42*60000,stopAt=descentStart-20*60000;const out=[];let t=27*60000+90*60000;while(t<stopAt){const dur=rand(45,150)*1000;out.push({type:'turbulence',start:t,end:t+dur});t+=rand(100,180)*60000}t=27*60000+30*60000;while(t<stopAt){let candidate=t;if(out.some(e=>Math.abs(e.start-candidate)<15*60000)){t+=20*60000;continue}const dur=rand(25,90)*1000;out.push({type:'cabin',start:candidate,end:candidate+dur});t+=rand(60,120)*60000}sceneEvents=out.sort((a,b)=>a.start-b.start)}
async function ensureSceneNode(){await ensureContext();if(sceneNode)return sceneNode;setStatus('Passenger Aircraft Cabin 오디오를 준비하는 중…');sceneNode=makeMediaNode(await getAircraftUrl());sceneNode.gain.gain.value=.55;return sceneNode}
function activeSceneEvent(ms){return sceneEvents.find(e=>ms>=e.start&&ms<e.end)||null}
function updateSceneAudio(ms){if(!sceneNode||!ctx)return;const total=durationMinutes*60000,[phase]=phaseFor(ms,total),event=activeSceneEvent(ms);let phaseGain={"Taxi out":.58,Takeoff:.82,Climb:.72,Cruise:.6,Descent:.64,Approach:.7,Touchdown:.76,"Taxi in":.54,Arrived:0}[phase]??.6;let turbulence=0;if(event?.type==='turbulence')turbulence=.06*macro.turbulence*Math.sin(ms/300);const gain=Math.max(0,phaseGain*(.45+macro.engine*.7)+turbulence);sceneNode.gain.gain.setTargetAtTime(gain,ctx.currentTime,.8);const cutoff=Math.max(1800,17000-(macro.night*8500)-((1-macro.engine)*2600));sceneNode.filter.frequency.setTargetAtTime(cutoff,ctx.currentTime,1.2)}
function updateSceneUi(){const elapsed=currentElapsed(),total=durationMinutes*60000,remaining=Math.max(0,total-elapsed),[phase,belt]=phaseFor(elapsed,total),ev=activeSceneEvent(elapsed);$('#phaseLabel').textContent=phase;$('#elapsedLabel').textContent=fmt(elapsed,true);$('#remainingLabel').textContent=fmt(remaining);$('#seatbeltLabel').textContent=belt?'ON':'OFF';$('#journeyProgress').style.width=`${Math.min(100,elapsed/total*100)}%`;$('#eventLabel').textContent=ev?(ev.type==='turbulence'?'Light turbulence':'Quiet cabin movement'):'None';updateSceneAudio(elapsed);updateNowPlaying();if(elapsed>=total)stopScene(true)}
async function startScene(){try{await ensureSceneNode();if(scenePlaying){pauseScene();return}sceneStartedAt=performance.now();scenePlaying=true;await sceneNode.el.play();$('#scenePlay').textContent='Ⅱ 일시정지';setStatus('Passenger Aircraft Cabin 재생 중');clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi()}catch(err){console.error(err);setStatus('Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}}
function pauseScene(){if(!scenePlaying)return;pausedAt=currentElapsed();scenePlaying=false;sceneNode?.el.pause();clearInterval(sceneTimer);$('#scenePlay').textContent='▶ 계속 재생';setStatus('일시정지됨');updateNowPlaying()}
function stopScene(arrived=false){scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);if(sceneNode){sceneNode.el.pause();sceneNode.el.currentTime=0;sceneNode.gain.gain.value=.55}$('#scenePlay').textContent='▶ 장면 시작';$('#phaseLabel').textContent=arrived?'Arrived':'Ready';$('#elapsedLabel').textContent='00:00';$('#remainingLabel').textContent=fmt(durationMinutes*60000);$('#seatbeltLabel').textContent='—';$('#journeyProgress').style.width='0';$('#eventLabel').textContent='None';setStatus(arrived?'여정이 종료되었습니다.':'정지됨');updateNowPlaying()}
function stopJourneyPlayback(){if(scenePlaying||pausedAt>0)stopScene(false)}
$('#scenePlay')?.addEventListener('click',startScene);$('#sceneStop')?.addEventListener('click',()=>stopScene(false));
function setDuration(v){durationMinutes=clamp(+v,240,720);$('#durationSlider').value=durationMinutes;$('#durationOutput').textContent=durationMinutes%60?`${Math.floor(durationMinutes/60)}h ${durationMinutes%60}m`:`${durationMinutes/60}h`;$$('[data-duration]').forEach(b=>b.classList.toggle('active',+b.dataset.duration===durationMinutes));buildSceneEvents();if(!scenePlaying&&pausedAt===0)$('#remainingLabel').textContent=fmt(durationMinutes*60000);else updateSceneUi()}
$('#durationSlider')?.addEventListener('input',e=>setDuration(e.target.value));$$('[data-duration]').forEach(b=>b.addEventListener('click',()=>setDuration(b.dataset.duration)));
$$('[data-macro]').forEach(input=>input.addEventListener('input',e=>{const k=e.target.dataset.macro,v=+e.target.value/100;macro[k]=v;$$(`[data-output="${k}"]`).forEach(o=>o.textContent=`${Math.round(v*100)}%`);$$(`[data-macro="${k}"]`).forEach(other=>{if(other!==e.target)other.value=e.target.value});updateSceneAudio(currentElapsed())}));

function updateNowPlaying(){const active=[],journeyNames={train_journey:'Overnight Train Journey',ferry_journey:'Night Ferry Journey',spacecraft_journey:'Spacecraft Drift',submarine_journey:'Submarine Voyage'};if(scenePlaying)active.push(journeyNames[activeJourneyId]||'Passenger Aircraft Cabin');catalog.forEach(s=>{const st=getMixerUiState(s.id);if(st.on)active.push(s.name)});$('#railNowPlaying').textContent=active.length?`${active.length} active`:'Stopped'}

function renderPresets(){if(!$('#builtInPresets'))return;$('#builtInPresets').innerHTML=builtinPresets.map(p=>`<button class="preset-card preset-card-visual" data-preset="${p.id}" type="button"><strong>${p.name}</strong><span>${Object.keys(p.mix).length} sources</span></button>`).join('');$$('#builtInPresets [data-preset]').forEach(b=>{b.style.setProperty('--preset-image',`url("${presetVisuals[b.dataset.preset]}")`);b.addEventListener('click',()=>applyPreset(b.dataset.preset))});renderUserPresets()}
async function applyPreset(id){const p=builtinPresets.find(x=>x.id===id)||loadUserPresets().find(x=>x.id===id);if(!p)return;try{await ensureContext();stopJourneyPlayback();stopAllMixer();setMaster(p.master);for(const [sourceId,volume] of Object.entries(p.mix)){const def=sourceById[sourceId];if(!def)continue;if(def.kind==='event'){startEventLayer(def);eventState[sourceId].volume=volume}else{if(!nodes[sourceId])nodes[sourceId]=await makeSourceNode(def);nodes[sourceId].gain.gain.value=volume;await nodes[sourceId].el.play()}}renderMixer();updateNowPlaying();setStatus(`${p.name} 프리셋 적용됨`);if(presetVisuals[id])document.dispatchEvent(new CustomEvent('lullaby-preset-applied',{detail:{id,image:presetVisuals[id]}}));switchView('mixer')}catch(err){console.error(err);setStatus('프리셋을 적용하지 못했습니다.')}}
function snapshotMix(){const mix={};catalog.forEach(s=>{const st=getMixerUiState(s.id);if(st.on)mix[s.id]=st.volume/100});return mix}
function loadUserPresets(){try{return JSON.parse(localStorage.getItem('lullaby-user-presets')||'[]')}catch{return[]}}
function saveUserPresets(list){localStorage.setItem('lullaby-user-presets',JSON.stringify(list));renderUserPresets()}
function renderUserPresets(){const root=$('#userPresets');if(!root)return;const list=loadUserPresets();root.innerHTML=list.length?list.map(p=>`<div class="preset-card user"><button data-user-preset="${p.id}" type="button"><strong>${escapeHtml(p.name)}</strong><span>${Object.keys(p.mix).length} sources</span></button><button class="preset-delete" data-delete-preset="${p.id}" aria-label="삭제">×</button></div>`).join(''):'<p class="muted-copy">저장한 프리셋이 없습니다.</p>';$$('[data-user-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(b.dataset.userPreset)));$$('[data-delete-preset]').forEach(b=>b.addEventListener('click',()=>saveUserPresets(loadUserPresets().filter(p=>p.id!==b.dataset.deletePreset))))}
function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
$('#savePreset')?.addEventListener('click',()=>{const name=prompt('프리셋 이름을 입력하세요.');if(!name?.trim())return;const list=loadUserPresets();list.push({id:`user_${Date.now()}`,name:name.trim(),master:masterValue,mix:snapshotMix()});saveUserPresets(list);setStatus('현재 믹스를 저장했습니다.')});

function startSleepTimer(minutes){minutes=clamp(+minutes,1,1440);sleepTimerEnd=Date.now()+minutes*60000;clearInterval(sleepTimerTick);sleepTimerTick=setInterval(updateSleepTimer,500);updateSleepTimer();switchView('timer')}
function cancelSleepTimer(){sleepTimerEnd=0;clearInterval(sleepTimerTick);sleepTimerTick=null;if(master&&ctx)master.gain.setTargetAtTime(masterValue,ctx.currentTime,.1);updateSleepTimer()}
function updateSleepTimer(){const remaining=sleepTimerEnd-Date.now(),label=$('#timerRemaining'),state=$('#timerState'),cancel=$('#cancelTimer');if(!sleepTimerEnd||remaining<=0){if(sleepTimerEnd&&remaining<=0){sleepTimerEnd=0;stopEverything();setStatus('취침 타이머가 종료되어 재생을 멈췄습니다.')}label.textContent='꺼짐';state.textContent='실행 중인 타이머가 없습니다.';cancel.hidden=true;return}label.textContent=fmt(remaining);state.textContent='타이머 실행 중';cancel.hidden=false;if(master&&ctx&&remaining<=sleepFadeSeconds*1000){const scale=clamp(remaining/(sleepFadeSeconds*1000),0,1);master.gain.setTargetAtTime(masterValue*scale,ctx.currentTime,.2)}}
$$('[data-timer-minutes]').forEach(b=>b.addEventListener('click',()=>startSleepTimer(b.dataset.timerMinutes)));$('#startCustomTimer')?.addEventListener('click',()=>{const v=+$('#customTimer').value;if(v>=1&&v<=1440)startSleepTimer(v);else setStatus('타이머는 1~1440분 사이로 입력해 주세요.')});$('#cancelTimer')?.addEventListener('click',cancelSleepTimer);$('#mobileTimerShortcut')?.addEventListener('click',()=>switchView('timer'));
function stopEverything(){stopScene(false);stopAllMixer();if(master&&ctx)master.gain.setTargetAtTime(masterValue,ctx.currentTime,.1)}

function applyTheme(value){document.documentElement.dataset.theme=value;localStorage.setItem('lullaby-theme',value);$('#themeSelect').value=value}
const savedTheme=localStorage.getItem('lullaby-theme')||'system';applyTheme(savedTheme);$('#themeSelect')?.addEventListener('change',e=>applyTheme(e.target.value));
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});window.addEventListener('appinstalled',()=>{deferredInstall=null;setStatus('Lullaby Scene 웹 앱이 설치되었습니다.')});
$('#installPwa')?.addEventListener('click',async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;return}setStatus('설치 메뉴가 보이지 않으면 브라우저 메뉴에서 “앱 설치” 또는 “홈 화면에 추가”를 선택해 주세요.')});
$('#clearCache')?.addEventListener('click',async()=>{try{const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));setStatus('웹 오디오 캐시를 초기화했습니다. 다음 재생 때 다시 받아옵니다.')}catch(err){console.error(err);setStatus('캐시 초기화에 실패했습니다.')}});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(console.error));

const viewTitles={scene:'Scenes',mixer:'Mixer',presets:'Presets',timer:'취침 타이머',settings:'Settings'};
function switchView(view){$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===view));const title=$('#mobileTitle');if(title)title.textContent=viewTitles[view]||view;document.querySelector('#player')?.scrollIntoView({block:'start',behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));

setMaster(masterValue);setDuration(480);buildSceneEvents();loadCatalog().catch(err=>{console.error(err);$('#mixerGrid').innerHTML='<p class="muted-copy">Mixer 소스 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p>';setStatus('Mixer 카탈로그 로드 실패')});updateSleepTimer();
