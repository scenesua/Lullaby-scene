
(()=>{'use strict';

// Strict 32-color source palette for the scene, shared by WebGL and 2D effects.
const PALETTE32=["#0a1015", "#15202a", "#1c2f38", "#26434a", "#305a58", "#3e7064", "#5a8970", "#80a17c", "#172b36", "#214454", "#326171", "#4f8090", "#78a3a9", "#b4cbd0", "#dde7df", "#f4f0d9", "#232b27", "#354037", "#4e5944", "#6a7653", "#89936b", "#b5b08a", "#d6c799", "#f0e0ad", "#3d302d", "#5e4840", "#816047", "#aa805b", "#d0a477", "#edbb8b", "#b77362", "#e59880"];
const RGB32=PALETTE32.map(c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]);
const paletteLUT=new Uint8Array(32768);
for(let ix=0;ix<32768;ix++){const rr=((ix>>10)&31)*8+4,gg=((ix>>5)&31)*8+4,bb=(ix&31)*8+4;let closest=0,best=Infinity;
 for(let j=0;j<32;j++){const t=RGB32[j],d=(rr-t[0])**2*.28+(gg-t[1])**2*.58+(bb-t[2])**2*.14;if(d<best){best=d;closest=j;}}paletteLUT[ix]=closest;}
const BAYER4=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function quantizeRGBA(buf,w){for(let i=0;i<buf.length;i+=4){if(buf[i+3]===0)continue;const pix=i>>2,xx=pix%w,yy=(pix/w)|0,dd=(BAYER4[((yy&3)<<2)|(xx&3)]-7.5)*.38;
 const rr=Math.max(0,Math.min(255,buf[i]+dd))|0,gg=Math.max(0,Math.min(255,buf[i+1]+dd))|0,bb=Math.max(0,Math.min(255,buf[i+2]+dd))|0;
 const key=(rr>>3<<10)|(gg>>3<<5)|(bb>>3);const c=RGB32[paletteLUT[key]];buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];}}
const paletteShader=`vec3 palette32(vec3 c){c=clamp(c,vec3(0.),vec3(1.));float best=999.;vec3 result=vec3(0.);vec3 v0=vec3(0.03922,0.06275,0.08235);float d0=dot(c-v0,c-v0);if(d0<best){best=d0;result=v0;}vec3 v1=vec3(0.08235,0.12549,0.16471);float d1=dot(c-v1,c-v1);if(d1<best){best=d1;result=v1;}vec3 v2=vec3(0.10980,0.18431,0.21961);float d2=dot(c-v2,c-v2);if(d2<best){best=d2;result=v2;}vec3 v3=vec3(0.14902,0.26275,0.29020);float d3=dot(c-v3,c-v3);if(d3<best){best=d3;result=v3;}vec3 v4=vec3(0.18824,0.35294,0.34510);float d4=dot(c-v4,c-v4);if(d4<best){best=d4;result=v4;}vec3 v5=vec3(0.24314,0.43922,0.39216);float d5=dot(c-v5,c-v5);if(d5<best){best=d5;result=v5;}vec3 v6=vec3(0.35294,0.53725,0.43922);float d6=dot(c-v6,c-v6);if(d6<best){best=d6;result=v6;}vec3 v7=vec3(0.50196,0.63137,0.48627);float d7=dot(c-v7,c-v7);if(d7<best){best=d7;result=v7;}vec3 v8=vec3(0.09020,0.16863,0.21176);float d8=dot(c-v8,c-v8);if(d8<best){best=d8;result=v8;}vec3 v9=vec3(0.12941,0.26667,0.32941);float d9=dot(c-v9,c-v9);if(d9<best){best=d9;result=v9;}vec3 v10=vec3(0.19608,0.38039,0.44314);float d10=dot(c-v10,c-v10);if(d10<best){best=d10;result=v10;}vec3 v11=vec3(0.30980,0.50196,0.56471);float d11=dot(c-v11,c-v11);if(d11<best){best=d11;result=v11;}vec3 v12=vec3(0.47059,0.63922,0.66275);float d12=dot(c-v12,c-v12);if(d12<best){best=d12;result=v12;}vec3 v13=vec3(0.70588,0.79608,0.81569);float d13=dot(c-v13,c-v13);if(d13<best){best=d13;result=v13;}vec3 v14=vec3(0.86667,0.90588,0.87451);float d14=dot(c-v14,c-v14);if(d14<best){best=d14;result=v14;}vec3 v15=vec3(0.95686,0.94118,0.85098);float d15=dot(c-v15,c-v15);if(d15<best){best=d15;result=v15;}vec3 v16=vec3(0.13725,0.16863,0.15294);float d16=dot(c-v16,c-v16);if(d16<best){best=d16;result=v16;}vec3 v17=vec3(0.20784,0.25098,0.21569);float d17=dot(c-v17,c-v17);if(d17<best){best=d17;result=v17;}vec3 v18=vec3(0.30588,0.34902,0.26667);float d18=dot(c-v18,c-v18);if(d18<best){best=d18;result=v18;}vec3 v19=vec3(0.41569,0.46275,0.32549);float d19=dot(c-v19,c-v19);if(d19<best){best=d19;result=v19;}vec3 v20=vec3(0.53725,0.57647,0.41961);float d20=dot(c-v20,c-v20);if(d20<best){best=d20;result=v20;}vec3 v21=vec3(0.70980,0.69020,0.54118);float d21=dot(c-v21,c-v21);if(d21<best){best=d21;result=v21;}vec3 v22=vec3(0.83922,0.78039,0.60000);float d22=dot(c-v22,c-v22);if(d22<best){best=d22;result=v22;}vec3 v23=vec3(0.94118,0.87843,0.67843);float d23=dot(c-v23,c-v23);if(d23<best){best=d23;result=v23;}vec3 v24=vec3(0.23922,0.18824,0.17647);float d24=dot(c-v24,c-v24);if(d24<best){best=d24;result=v24;}vec3 v25=vec3(0.36863,0.28235,0.25098);float d25=dot(c-v25,c-v25);if(d25<best){best=d25;result=v25;}vec3 v26=vec3(0.50588,0.37647,0.27843);float d26=dot(c-v26,c-v26);if(d26<best){best=d26;result=v26;}vec3 v27=vec3(0.66667,0.50196,0.35686);float d27=dot(c-v27,c-v27);if(d27<best){best=d27;result=v27;}vec3 v28=vec3(0.81569,0.64314,0.46667);float d28=dot(c-v28,c-v28);if(d28<best){best=d28;result=v28;}vec3 v29=vec3(0.92941,0.73333,0.54510);float d29=dot(c-v29,c-v29);if(d29<best){best=d29;result=v29;}vec3 v30=vec3(0.71765,0.45098,0.38431);float d30=dot(c-v30,c-v30);if(d30<best){best=d30;result=v30;}vec3 v31=vec3(0.89804,0.59608,0.50196);float d31=dot(c-v31,c-v31);if(d31<best){best=d31;result=v31;}return result;}`;
function quantizeCanvas2D(context,w,h){try{const image=context.getImageData(0,0,w,h);quantizeRGBA(image.data,w);context.putImageData(image,0,0);}catch(e){}}
const $=id=>document.getElementById(id);
const canvas=$('world'),fx=$('effects'),pen=fx.getContext('2d',{alpha:true}),fallbackCanvas=$('fallbackScene'),fallpen=fallbackCanvas.getContext('2d');
const contextOptions={antialias:false,alpha:false,depth:true,stencil:false,powerPreference:'high-performance',premultipliedAlpha:false};
const realGL=canvas.getContext('webgl2',contextOptions)||canvas.getContext('webgl',contextOptions);
const gl=realGL||new Proxy({},{get:(t,k)=>{if(k==='getShaderParameter'||k==='getProgramParameter')return()=>true;
 if(k==='createShader'||k==='createProgram'||k==='createBuffer')return()=>({});return()=>undefined;}});
const isWebGL2=!!realGL && typeof WebGL2RenderingContext!=='undefined' && realGL instanceof WebGL2RenderingContext;
const PI=Math.PI,TAU=PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t,fract=v=>v-Math.floor(v),H=n=>fract(Math.sin(n*127.1+78.233)*43758.5453),R=(a,b)=>a+Math.random()*(b-a);
const DATA={
  river:{ko:'강',eng:'RIVER BANK',desc:'강 건너편 강둑 너머로 바람이 붑니다',fish:[['쏘가리',.5,.3,2.1,3700,'#b9c7ad',21,56],['잉어',.37,.8,7,1150,'#ae9874',32,92],['메기',.24,.7,6,1700,'#74877a',28,93],['꺽지',.42,.09,.43,3900,'#b5b18b',11,27],['피라미',.59,.04,.3,650,'#bfd0cd',9,23]]},
  sea:{ko:'바다',eng:'COASTLINE',desc:'잔잔한 파도가 갯바위를 두드립니다',fish:[['농어',.38,.6,6,2600,'#d3ded6',29,87],['참돔',.17,.5,4.7,7400,'#d58d7f',30,74],['우럭',.43,.27,3.1,2300,'#918d81',18,57],['고등어',.47,.18,1.2,1400,'#8ba8bd',21,48],['광어',.24,.8,7.0,2500,'#aea187',35,100]]},
  lake:{ko:'저수지',eng:'RESERVOIR',desc:'맞은편 소나무 숲이 고요하게 물에 비칩니다',fish:[['붕어',.57,.2,2.4,1700,'#b2a280',16,55],['배스',.47,.3,4.2,1600,'#8ca883',25,65],['잉어',.32,.7,8,1300,'#a69672',34,105],['가물치',.19,.7,5.9,3500,'#757e74',35,104],['블루길',.39,.07,.42,730,'#85a2bd',11,26]]}
};
// 54 regional species; catalogue is static, requiring no storage API.
if(window.StillwaterContent?.spots)Object.assign(DATA,window.StillwaterContent.spots);
const GRADES=[{label:'일반',en:'COMMON',color:'#dbe6db',factor:1},{label:'실버',en:'SILVER',color:'#d3e3f6',factor:2.4},{label:'골드',en:'GOLD',color:'#ffe4a0',factor:6.2},{label:'플래티넘',en:'PLATINUM',color:'#bcecf1',factor:19},{label:'다이아',en:'DIAMOND',color:'#a2fdff',factor:70}];
const WEATHER={clear:{ko:'맑음',icon:'☀',bit:1,cloud:.14},cloud:{ko:'흐림',icon:'☁',bit:.9,cloud:.65},fog:{ko:'안개',icon:'≋',bit:1.25,cloud:.2},rain:{ko:'비',icon:'☂',bit:.83,cloud:.8},storm:{ko:'폭풍우',icon:'ϟ',bit:1.55,cloud:1}};
const storageKey='lullaby_stillwater_webgl_v03', settingsKey='lullaby_stillwater_settings_v05';
const RODS={bamboo:{name:'낡은 대나무 낚싯대',price:0,desc:'물가에서 시작하는 오래된 낚싯대',reel:1,stress:1,cast:1},graphite:{name:'흑연 스피닝 로드',price:6500,desc:'릴 감기 +14% · 줄 부담 −8%',reel:1.14,stress:.92,cast:1.08},carbon:{name:'카본 텔레스코픽',price:29000,desc:'릴 감기 +30% · 줄 부담 −18%',reel:1.30,stress:.82,cast:1.19},moon:{name:'달빛의 낚싯대',price:115000,desc:'릴 감기 +48% · 줄 부담 −29%',reel:1.48,stress:.71,cast:1.28}};
const BAITS={worm:{name:'지렁이',price:0,count:Infinity,desc:'기본 미끼 · 무료 · 언제나 사용 가능',bite:1,rarity:0},shrimp:{name:'새우',price:500,count:3,desc:'3회분 · 바닷물고기 조황 향상',bite:.84,rarity:0},lure:{name:'스푼 루어',price:1300,count:3,desc:'3회분 · 공격적인 어종 유인',bite:.91,rarity:.01},glow:{name:'달빛 발광 미끼',price:3900,count:3,desc:'3회분 · 입질 단축 · 특수 등급 소폭 우대',bite:.72,rarity:.035}};
const SPECIES_RARITY={'피라미':1,'고등어':1,'블루길':1,'붕어':2,'잉어':2,'배스':2,'메기':3,'우럭':3,'농어':3,'꺽지':4,'쏘가리':4,'광어':4,'가물치':5,'참돔':5};
for(const pool of Object.values(DATA))for(const f of pool.fish)if(!Object.hasOwn(SPECIES_RARITY,f[0]))SPECIES_RARITY[f[0]]=f[1]<.19?5:f[1]<.30?4:f[1]<.40?3:f[1]<.52?2:1;
const SIDES=['일반','실버','골드','플래티넘','다이아'];

// Distinct silhouettes/materials for four purchasable rods, both held and on the stand.
const ROD_SKINS={
 bamboo:{shaft:'#a87b4b',highlight:'#ddbf80',tip:'#e6d5a6',guide:'#8b6b4a',grip:'#67472f',reel:'#a88f66',spool:'#c9b487',flex:1.18},
 graphite:{shaft:'#344d52',highlight:'#72a19c',tip:'#a1b7a3',guide:'#8cabb2',grip:'#243138',reel:'#566f74',spool:'#c2d3ce',flex:.96},
 carbon:{shaft:'#222d38',highlight:'#8594a2',tip:'#b6c0c4',guide:'#a6b7c6',grip:'#171e29',reel:'#303f4b',spool:'#d0dad5',flex:.83},
 moon:{shaft:'#4c4a76',highlight:'#b1b5dc',tip:'#c0e7e0',guide:'#a8e7d0',grip:'#353047',reel:'#7365a0',spool:'#f1dfab',flex:1.05}
};
function rodSkin(){return ROD_SKINS[inventory.rod]||ROD_SKINS.bamboo;}

let inventory={money:0,fish:[],records:[],rods:['bamboo'],rod:'bamboo',baitStock:{shrimp:0,lure:0,glow:0},badges:[]};
try{const v=JSON.parse(localStorage.getItem(storageKey)||'null');if(v&&Array.isArray(v.fish)){inventory.money=Number(v.money)||0;inventory.fish=v.fish.slice(0,100);inventory.records=Array.isArray(v.records)?v.records.slice(0,300):[];inventory.rods=Array.isArray(v.rods)?v.rods.filter(k=>RODS[k]):['bamboo'];if(!inventory.rods.includes('bamboo'))inventory.rods.unshift('bamboo');inventory.rod=inventory.rods.includes(v.rod)?v.rod:'bamboo';inventory.baitStock={shrimp:0,lure:0,glow:0,...v.baitStock};if(v.journal&&typeof v.journal==='object'&&!Array.isArray(v.journal))inventory.journal=v.journal;if(Array.isArray(v.badges))inventory.badges=v.badges.filter(x=>typeof x==='string').slice(0,30);}}
catch{}
const state={biteMode:'reality',biteTarget:0,spot:'river',weather:'clear',time:17.5,autoTime:true,test:false,bait:'worm',started:false,menu:null,phase:'idle',castStart:0,power:0,flight:0,wait:0,waiting:0,biteWindow:0,fish:null,landedFish:null,distance:0,energy:1,tension:.16,runTimer:0,runIntensity:0,snapCount:0,escapeCount:0,reeling:false,lifting:false,fishMood:'느긋하게 버티는 중',baitX:0,baitZ:-13,particles:[],ripples:[],sceneSeconds:0,gameSeconds:0,shake:0,flash:0,eventLeft:0,dayLuck:Math.random(),soundOn:false,voiceTimer:0,fishSide:0,fishDepth:.0,tailPhase:0,fishBehavior:'hover',behaviorClock:0,behaviorLength:2,runBurst:0,fightLastSecond:0,weatherAuto:false,weatherClock:0,weatherPrev:'clear',weatherBlend:1,fightFeedback:0,quality:'pixel',fov:0,activeBait:'worm',rodRested:false,restProps:{beer:true,smoke:true,sashimi:true},restAction:'',restActionTime:0,restCooldown:0,restCaptionTime:0,marketVisits:0,restDuration:2.8,restTime:0,headPitch:0,headRoll:0,strikeAge:99,reelBlend:0,slackBlend:0,reelRotation:0,reelClickClock:0,hookJolt:0,rodQuiver:0,foam:[],lineMeters:0,sashimiPieces:6,sashimiTaking:false,restReturned:false,bowAmount:0,restBeat:0,restTouch:false,restContactUntil:0,restContactKind:"",landingAge:0,landingRevealed:false,firstStamp:false,nibbleClock:0,nibbleUntil:0,dragClock:0,dragSpin:0,fishLeap:0,castWaveAge:0,perfFps:60,perfFrameCost:16.6,hiddenAt:0,surfaceRainClock:0,splashClock:0,splashSoundCount:0,recordCelebrationUntil:0,retrieveAge:0,retrieveDuration:3.0,retrieveFromX:0,retrieveFromZ:0,biteThreshold:0,biteHazard:0,quickBiteAt:0,waitWallClock:0};
let vw=innerWidth,vh=innerHeight,aspect=vw/vh,portrait=vh>vw,viewProj=new Float32Array(16),sceneBuffer=null,waterBuffer=null,sceneVertexCount=0,waterVertexCount=0,last=0,fxClock=0,hudClock=0,lastWash='',fallbackActive=!realGL;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallbackActive=true;fallbackCanvas.style.display='block';canvas.style.opacity='0'});
canvas.addEventListener('webglcontextrestored',()=>{fallbackActive=true;fallbackCanvas.style.display='block';canvas.style.opacity='0'});
if(fallbackActive){fallbackCanvas.style.display='block';canvas.style.opacity='0';}
let audioCtx=null,audioMaster=null,audioNoiseGain=null,audioOscGain=null,noiseSource=null,audioOsc=null,customAudio=null,customAudioURL=null;let natureSources=[],waterSound=null,windSound=null,rainSound=null,cricketsSound=null,birdsSound=null,thunderTimer=0,footSFXClock=0;

function setWeather(w){if(!WEATHER[w])return;state.weatherPrev=state.weather;state.weather=w;state.weatherBlend=0;$('weatherSelect').value=w;eventMsg(`날씨: ${WEATHER[w].ko}`,'WEATHER SHIFT',1.4);updateAudio();refreshHUD();}
function loadSettings(){try{const o=JSON.parse(localStorage.getItem(settingsKey)||localStorage.getItem('lullaby_stillwater_settings_v04')||'null');if(!o)return;if(DATA[o.spot])state.spot=o.spot;if(WEATHER[o.weather])state.weather=o.weather;if(Number.isFinite(o.time))state.time=clamp(o.time,0,24);if(BAITS[o.bait]&&(o.bait==='worm'||(inventory.baitStock[o.bait]||0)>0))state.bait=o.bait;state.autoTime=o.autoTime!==false;state.weatherAuto=!!o.weatherAuto;state.quality=o.quality==='smooth'?'smooth':'pixel';$('weatherSelect').value=state.weather;$('baitSelect').value=state.bait;$('autoTime').checked=state.autoTime;$('autoWeather').checked=state.weatherAuto;$('renderQuality').value=state.quality;if(typeof o.volume==='number')$('soundVolume').value=o.volume; if(['festival','arcade','relaxed','reality'].includes(o.biteMode))state.biteMode=o.biteMode;if($('biteMode'))$('biteMode').value=state.biteMode;if(o.restProps){for(const k of ['beer','smoke','sashimi'])if(typeof o.restProps[k]==='boolean')state.restProps[k]=o.restProps[k];} for(const k of ['beer','smoke','sashimi'])$(k==='smoke'?'smokeVisible':k+'Visible').checked=state.restProps[k];}catch(e){console.warn('Settings:',e)}}
function persistSettings(){try{localStorage.setItem(settingsKey,JSON.stringify({spot:state.spot,weather:state.weather,time:state.time,bait:state.bait,biteMode:state.biteMode,autoTime:state.autoTime,weatherAuto:state.weatherAuto,quality:state.quality,volume:Number($('soundVolume').value),restProps:state.restProps}))}catch{}}
function forecastText(){const good=(state.time>5.5&&state.time<8.5)||(state.time>16.4&&state.time<19.4);return `오늘의 조황 ${luckName()} · ${good?'활성 시간대':'보통 시간대'} · ${WEATHER[state.weather].ko}`;}
let lastForecastHTML='';function forecastUI(){const l=luckName(),good=(state.time>5.5&&state.time<8.5)||(state.time>16.4&&state.time<19.4);$('forecastName').textContent='조황 '+l;$('forecastDesc').textContent=good?'입질 활발 시간':'평온한 시간';const html=`<strong>오늘의 조황: ${l}</strong><p>맑은 날도 기다림이 길 수 있어요. ${good?'지금은 물고기가 활발해질 가능성이 높은 시간대입니다.':'새벽 05:30~08:30, 해질녘 16:30~19:30에는 입질이 조금 더 유리합니다.'}</p><p>${WEATHER[state.weather].ko} · ${DATA[state.spot].ko} · ${state.bait==='lure'?'루어':state.bait==='shrimp'?'새우':'지렁이'} 미끼</p>`;if(lastForecastHTML!==html){$('forecastPanel').innerHTML=html;lastForecastHTML=html;}}
function randomWeather(){const all=['clear','cloud','fog','rain','storm'];const curr=state.weather;if(curr==='storm')return Math.random()<.68?'rain':'cloud';if(curr==='fog')return Math.random()<.6?'clear':'cloud';if(curr==='rain')return Math.random()<.55?'cloud':Math.random()<.76?'storm':'clear';if(curr==='clear')return Math.random()<.48?'cloud':Math.random()<.72?'fog':'rain';return Math.random()<.31?'clear':Math.random()<.62?'rain':Math.random()<.84?'fog':'storm';}
function ambientBridge(type,detail={}){try{window.parent?.postMessage({source:'stillwater-game',type,...detail},window.location.origin==='null'?'*':window.location.origin)}catch{}}

function money(n){return '¤ '+Math.round(n).toLocaleString('ko-KR')}
function luckName(){return state.dayLuck>.83?'대박':state.dayLuck>.62?'좋음':state.dayLuck>.29?'보통':'뜸함'}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(inventory))}catch{}}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function fishScore(f){if(Number.isFinite(f.score))return f.score;
 const species=SPECIES_RARITY[f.name]||2;
 const src=DATA[f.spot]?.fish.find(x=>x[0]===f.name)||Object.values(DATA).flatMap(d=>d.fish).find(x=>x[0]===f.name);
 const weight=src?clamp((f.weight-src[2])/(src[3]-src[2]),0,1):clamp(f.weight/8,0,1),size=src?clamp((f.length-src[6])/(src[7]-src[6]),0,1):clamp(f.length/110,0,1);
 const tiers=[0,900,2250,3650,5350];return Math.round(300+tiers[clamp(f.grade||0,0,4)]+species*365+1050*weight+950*size+280*Math.sqrt(weight*size)*(1+(f.grade||0)*.22));}
function ensureFishID(f){if(!f.id)f.id='fish-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);f.score=fishScore(f);return f;}
function equippedRod(){return RODS[inventory.rod]||RODS.bamboo;}
function baitInventoryLabel(k){return k==='worm'?'∞':String(inventory.baitStock[k]||0);}
function applyBaitValue(){const select=$('baitSelect');select.innerHTML=Object.entries(BAITS).map(([k,b])=>`<option value="${k}">${b.name} · ${baitInventoryLabel(k)}</option>`).join('');if(state.bait!=='worm'&&!(inventory.baitStock[state.bait]>0))state.bait='worm';select.value=state.bait;}
function recordCatch(f,status){ensureFishID(f);window.StillwaterExtras?.recordCatch(f);const idx=inventory.records.findIndex(x=>x.id===f.id);const record={...f,status,when:new Date().toISOString()};if(idx>=0)inventory.records[idx]=record;else inventory.records.unshift(record);inventory.records=inventory.records.slice(0,300);save();}

function hexToRgb(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)}
function rgbToHex(rgb){return '#'+rgb.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('')}
function mixColor(a,b,t){return a.map((x,i)=>lerp(x,b[i],t))}
function colorMul(a,f){return a.map(v=>clamp(v*f,0,1))}
const C={grass:hexToRgb('#5c7651'),dirt:hexToRgb('#7e7052'),wood:hexToRgb('#6d5642'),stone:hexToRgb('#727d77')};
function projectMatrix(fovy,asp,near,far){const f=1/Math.tan(fovy/2),nf=1/(near-far);return new Float32Array([f/asp,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
function lookAt(eye,target,up){let z=[eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]],zl=Math.hypot(...z);z=z.map(v=>v/zl);let x=[up[1]*z[2]-up[2]*z[1],up[2]*z[0]-up[0]*z[2],up[0]*z[1]-up[1]*z[0]],xl=Math.hypot(...x);x=x.map(v=>v/xl);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]),-(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]),-(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]),1]);}
function matMul(A,B){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){out[c*4+r]=0;for(let k=0;k<4;k++)out[c*4+r]+=A[k*4+r]*B[c*4+k]}return out}
let cameraView=lookAt([0,3.75,13.5],[0,.5,-24],[0,1,0]);
function viewPoint(world){const m=cameraView,[x,y,z]=world;return [m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
function updateCamera(){
 // Viewpoint of an adult sitting in a low fishing chair (not a standing camera).
 const seatEye=portrait?[0,1.68,12.70]:[0,1.72,13.10];
 const target=portrait?[0,.48,-23]:[0,.48,-24];const fov=portrait?74:62;
 const bend=clamp(state.bowAmount||0,0,1);
 // Bend at the waist: the eyes lower and move nearer to the physical table.
 const eye=[seatEye[0]+TABLE3D.x*.29*bend,seatEye[1]-.39*bend,seatEye[2]-.84*bend];
 const pickedAnchor=state.restAction&&state.restActionTime>0?restAnchor(state.restAction):null;
  const tableLook=[pickedAnchor?pickedAnchor[0]:TABLE3D.x,TABLE3D.y+.06,TABLE3D.z-.04];const gaze=clamp(fpSmooth(bend)*(portrait?1.17:.93),0,1);
 for(let i=0;i<3;i++)target[i]=lerp(target[i],tableLook[i],gaze);
 target[1]+=(state.headPitch||0)*20;
 target[0]+=Math.sin(state.headRoll||0)*1.3;
 // Subtle breathing makes the sightline feel connected to a body, not a floating drone.
 if(state.restAction){eye[1]+=Math.sin(state.sceneSeconds*3.2)*.005;}
 cameraView=lookAt(eye,target,[Math.sin(state.headRoll||0),Math.cos(state.headRoll||0),0]);
 viewProj=matMul(projectMatrix(fov*PI/180,aspect,.08,650),cameraView);
}
function screenPoint(p){let [x,y,z]=p,m=viewProj,cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw=m[3]*x+m[7]*y+m[11]*z+m[15];if(cw<=.01)return [vw/2,vh/2];return[(cx/cw*.5+.5)*vw,(1-(cy/cw*.5+.5))*vh]}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error('Shader compile:',gl.getShaderInfoLog(s));throw new Error('WebGL shader compilation failed')}return s}
function toWebGL1(source,vertex,sky=false){if(isWebGL2)return source;if(sky&&vertex)return `precision highp float; attribute vec2 aScreen; varying vec2 vUv; void main(){vUv=(aScreen+1.0)*.5; gl_Position=vec4(aScreen,0.,1.);}`;
  let out=source.replace(/^#version 300 es\s*/, '');
  if(vertex){out=out.replace(/layout\(location=\d+\)in /g,'attribute ').replace(/\bout /g,'varying ');}
  else{out=out.replace(/\bin /g,'varying ').replace(/out vec4 o;/g,'').replace(/\bo\s*=/g,'gl_FragColor=');}
  return out;
}
function prog(v,f,sky=false){f=f.replace(/void main\(\)/,paletteShader+'void main()').replace(/o=vec4\((sky|col),1\.\);/g,'o=vec4(palette32($1+vec3((hash(floor(gl_FragCoord.xy*.65))-.5)*.022)),1.);');const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,toWebGL1(v,true,sky)));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,toWebGL1(f,false)));gl.bindAttribLocation(p,0,sky?'aScreen':'aPos');if(!sky){gl.bindAttribLocation(p,1,'aColor');gl.bindAttribLocation(p,2,'aNormal');}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error('Shader link',gl.getProgramInfoLog(p));throw Error('Shader program linkage failed')}return p}
const skyProgram=prog(`#version 300 es
precision highp float;
out vec2 vUv;
void main(){vec2 pos=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=pos*.5;gl_Position=vec4(pos*2.-1.,0.,1.);}`,`#version 300 es
precision highp float;
in vec2 vUv;out vec4 o;
uniform vec3 uSkyTop,uSkyLow,uSunColor;uniform float uDay,uTime,uCloud,uRain,uFlash,uSunX,uSunY;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
void main(){vec2 uv=vUv;float a=smoothstep(.05,1.0,uv.y);vec3 sky=mix(uSkyLow,uSkyTop,pow(a,.95));
 float cloud=noise(uv*vec2(7.,3.2)+vec2(uTime*.002,0.));cloud+=noise(uv*vec2(14.,7.)-vec2(uTime*.004,0.))*.4;float mask=smoothstep(.67,.93,cloud)*uCloud*smoothstep(.15,.65,uv.y);sky=mix(sky,mix(vec3(.83,.83,.78),vec3(.25,.34,.41),uRain),mask*.67);
 vec2 s=vec2((uv.x-uSunX)*1.35,uv.y-uSunY);float d=length(s);float sun=1.-smoothstep(.019,.026,d);float halo=pow(max(0.,1.-d),18.)*.45;sky+=uSunColor*(sun*.88+halo*.46)*uDay;
 if(uDay<.35){vec2 grid=floor(uv*vec2(620.,360.));float star=step(.9988,hash(grid))*(1.-smoothstep(.25,.78,uv.y));sky+=vec3(.58,.69,.8)*star*(.35-uDay)*2.;}
 sky+=uFlash*.26;float grain=hash(floor(gl_FragCoord.xy*.55)+uTime*.09)*.016;sky+=grain-.008;o=vec4(sky,1.);}`,true);
const objectVertex=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aColor;layout(location=2)in vec3 aNormal;
uniform mat4 uVP;uniform float uTime;out vec3 vColor,vNormal;out float vDepth;out vec3 vPos;
void main(){vPos=aPos;vColor=aColor;vNormal=aNormal;vec4 p=uVP*vec4(aPos,1.);vDepth=length(aPos-vec3(0.,3.,13.));gl_Position=p;}`;
const objectProgram=prog(objectVertex,`#version 300 es
precision highp float;
in vec3 vColor,vNormal,vPos;in float vDepth;out vec4 o;
uniform vec3 uLight,uLightColor,uAmbient,uFogColor;uniform float uFog,uTime,uNight,uInk;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float n=max(dot(normalize(vNormal),normalize(uLight)),0.);vec3 col=vColor*(uAmbient+uLightColor*(.2+.8*n));float fog=1.-exp(-vDepth*uFog);col=mix(col,uFogColor,clamp(fog,0.,.97));float edge=pow(1.-abs(dot(normalize(vNormal),normalize(vec3(0.,4.,16.)-vPos))),3.3);col*=1.-edge*uInk*.78;float dith=(hash(floor(gl_FragCoord.xy*.65))-0.5)*.022;col=floor((col+dith)*40.)/40.;o=vec4(col,1.);}`);
const waterVertex=`#version 300 es
precision highp float;
layout(location=0)in vec3 aPos;layout(location=1)in vec3 aColor;layout(location=2)in vec3 aNormal;
uniform mat4 uVP;uniform float uTime,uWave;out vec3 vPos,vColor;out float vDist;
void main(){vec3 p=aPos;p.y+=sin(p.x*.38+uTime*.76)*.065*uWave+sin(p.z*.42-uTime*.64+p.x*.24)*.045*uWave;vPos=p;vColor=aColor;vDist=length(p-vec3(0.,3.,13.));gl_Position=uVP*vec4(p,1.);}`;
const waterProgram=prog(waterVertex,`#version 300 es
precision highp float;
in vec3 vPos,vColor;in float vDist;out vec4 o;
uniform vec3 uWater,uFogColor,uSunColor;uniform float uTime,uDay,uFog,uWave,uSunX,uWeather;
float hash(vec2 p){return fract(sin(dot(p,vec2(23.3,79.7)))*43758.5);}
void main(){float a=sin(vPos.z*2.8-uTime*.75+sin(vPos.x*.19+uTime*.1)*.7);float b=sin(vPos.z*6.7+vPos.x*.16-uTime*1.3);float c=sin(vPos.z*12.4+sin(vPos.x*.37)*.35-uTime*2.0);float wash=a*.43+b*.3+c*.16;float stripe=smoothstep(.45,.8,wash);float fine=smoothstep(.82,.97,b*.57+c*.43);float back=sin(vPos.z*.34+uTime*.3+sin(vPos.x*.3)*.3);vec3 col=uWater*(.81+wash*.095+back*.065+stripe*.10);col+=vec3(.15,.17,.15)*fine*.16;float facet=step(.76,fract(vPos.x*.23+sin(vPos.z*.3+uTime*.15)))*step(.77,fract(vPos.z*.15-uTime*.1));col+=vec3(.038,.046,.036)*facet;float glint=pow(max(0.,1.-abs((vPos.x/90.+.5)-uSunX)*2.4),5.)*fine;col+=uSunColor*glint*.34*uDay;col+=uSunColor*stripe*.045*uDay;col+=uWeather*.018*stripe;float fog=1.-exp(-vDist*uFog*.76);col=mix(col,uFogColor,fog*.82);col=floor(col*42.)/42.;o=vec4(col,1.);}`);
function uniform(p,name){return gl.getUniformLocation(p,name)}
const U={sky:{top:uniform(skyProgram,'uSkyTop'),low:uniform(skyProgram,'uSkyLow'),sun:uniform(skyProgram,'uSunColor'),day:uniform(skyProgram,'uDay'),time:uniform(skyProgram,'uTime'),cloud:uniform(skyProgram,'uCloud'),rain:uniform(skyProgram,'uRain'),flash:uniform(skyProgram,'uFlash'),sunX:uniform(skyProgram,'uSunX'),sunY:uniform(skyProgram,'uSunY')},obj:{vp:uniform(objectProgram,'uVP'),time:uniform(objectProgram,'uTime'),light:uniform(objectProgram,'uLight'),lightColor:uniform(objectProgram,'uLightColor'),ambient:uniform(objectProgram,'uAmbient'),fogColor:uniform(objectProgram,'uFogColor'),fog:uniform(objectProgram,'uFog'),night:uniform(objectProgram,'uNight'),ink:uniform(objectProgram,'uInk')},water:{vp:uniform(waterProgram,'uVP'),time:uniform(waterProgram,'uTime'),wave:uniform(waterProgram,'uWave'),color:uniform(waterProgram,'uWater'),fogColor:uniform(waterProgram,'uFogColor'),fog:uniform(waterProgram,'uFog'),sun:uniform(waterProgram,'uSunColor'),sunX:uniform(waterProgram,'uSunX'),day:uniform(waterProgram,'uDay'),weather:uniform(waterProgram,'uWeather')}};
let mesh=[],waterMesh=[];
function put(target,a,b,c,color){let u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],nl=Math.hypot(...n)||1;n=n.map(x=>x/nl);for(const p of [a,b,c])target.push(...p,...color,...n)}
function tri(a,b,c,col,target=mesh){put(target,a,b,c,col)}
function quad(a,b,c,d,col,target=mesh){tri(a,b,c,col,target);tri(a,c,d,col,target)}
function box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],dd=[x-w/2,y,z+d/2],a2=a.map((v,i)=>i===1?v+h:v),b2=b.map((v,i)=>i===1?v+h:v),c2=c.map((v,i)=>i===1?v+h:v),d2=dd.map((v,i)=>i===1?v+h:v);quad(a,b,b2,a2,colorMul(color,1.04));quad(b,c,c2,b2,colorMul(color,.84));quad(c,dd,d2,c2,colorMul(color,.91));quad(dd,a,a2,d2,colorMul(color,.83));quad(a2,b2,c2,d2,colorMul(color,1.16));}
function rock(x,y,z,s,seed){const base=hexToRgb(seed>.5?'#939b91':'#828f86');const sides=6;const low=[],high=[];for(let i=0;i<sides;i++){const t=i/sides*TAU,radius=s*(.85+H(seed*100+i)*.35);low.push([x+Math.cos(t)*radius,y,z+Math.sin(t)*radius*.7]);high.push([x+Math.cos(t)*radius*.78,y+s*(.44+H(seed+i*11)*.2),z+Math.sin(t)*radius*.49]);}const peak=[x,y+s*.87,z];for(let i=0;i<sides;i++){const j=(i+1)%sides,col=colorMul(base,.67+H(seed*32+i)*.5);quad(low[i],low[j],high[j],high[i],col);tri(high[i],high[j],peak,colorMul(base,.85+H(seed+i*17)*.3));}}
function pine(x,y,z,s,seed){box(x,y,z,.21*s,1.8*s,.22*s,hexToRgb('#625643'));let base=y+1.05*s;for(let l=0;l<3;l++){const rad=(1.32-l*.27)*s,hh=(1.7-l*.18)*s,cy=base+l*.65*s;const n=5;const peak=[x,cy+hh,z];for(let i=0;i<n;i++){let a=i/n*TAU,b=(i+1)/n*TAU;tri([x+Math.cos(a)*rad,cy,z+Math.sin(a)*rad],[x+Math.cos(b)*rad,cy,z+Math.sin(b)*rad],peak,hexToRgb(['#304f43','#446650','#375e4b','#42634c','#50755a'][(i+l+Math.floor(seed))%5]));}}}
function broadleaf(x,y,z,s,seed){box(x,y,z,.24*s,2.3*s,.24*s,hexToRgb('#755f47'));const colors=['#526c4e','#687e56','#829166','#5f7757','#9fa478'].map(hexToRgb);const b=y+2.2*s;for(let j=0;j<5;j++){const dx=(H(seed*17+j)-.5)*1.8*s,dz=(H(seed*41+j)-.5)*1.4*s,yy=b+(H(seed+j*7)-.3)*1*s,rr=(.9+H(seed*31+j)*.5)*s;const verts=[[x+dx,yy+rr,z+dz],[x+dx-rr,yy,z+dz],[x+dx,yy,z+dz-rr],[x+dx+rr,yy,z+dz],[x+dx,yy,z+dz+rr],[x+dx,yy-rr*.45,z+dz]];for(let i=1;i<=4;i++){let next=i===4?1:i+1;tri(verts[0],verts[i],verts[next],colors[(i+j)%colors.length]);tri(verts[5],verts[next],verts[i],colorMul(colors[(i+j+1)%colors.length],.8));}}}
function reeds(x,y,z,s,seed){const count=5;for(let i=0;i<count;i++){const xx=x+(H(seed+i)-.5)*s,zz=z+(H(seed+10+i)-.5)*s,h=(.7+H(seed+i*7))*.95*s;const col=hexToRgb(i%2?'#9aab69':'#bdba83');quad([xx-.035,y,zz],[xx+.035,y,zz],[xx+.075,y+h,zz],[xx-.012,y+h,zz],col);if(i%2===0)box(xx+.01,y+h*.82,zz,.06,h*.14,.08,hexToRgb('#695e42'));}}
function grassyMounds(){const far=state.spot==='lake'?-43:-32;for(let i=0;i<85;i++){const x=-145+i*3.44,next=x+3.44,z=far+Math.sin(x*.042)*1.75+Math.sin(x*.14)*.42,z2=far+Math.sin(next*.042)*1.75+Math.sin(next*.14)*.42;const col=hexToRgb(['#72936a','#7d9468','#657d58','#91a072'][i%4]);quad([x,.05,z],[next,.05,z2],[next,.40,z2-2],[x,.40,z-2],hexToRgb(i%3?'#8f8870':'#728777'));quad([x,.40,z-2],[next,.40,z2-2],[next,1.65,z2-10],[x,1.65,z-10],col);quad([x,1.65,z-10],[next,1.65,z2-10],[next,2.8,z2-23],[x,2.8,z-23],colorMul(col,.76));}}
function makeCabin(){const x=-18,z=-44;box(x,2.9,z,6.7,4.1,5.5,hexToRgb('#816d50'));box(x,6.9,z,7.5,.4,6,hexToRgb('#5d5144'));quad([x-4.6,7,z+3.4],[x,10,z+3.4],[x,10,z-3.4],[x-4.6,7,z-3.4],hexToRgb('#624d42'));quad([x,10,z+3.4],[x+4.6,7,z+3.4],[x+4.6,7,z-3.4],[x,10,z-3.4],hexToRgb('#7b6053'));box(x-1,4,z+2.8,1.2,1.4,.15,hexToRgb('#f0b96e'));box(x+2,2.95,z+2.8,1.8,2.8,.2,hexToRgb('#403b34'));for(let i=0;i<5;i++)box(x+4+i*1.5,.2,z+5.2,.22,1.6,.23,hexToRgb('#786448'));quad([x+2,.9,z+4.5],[x+11,.9,z+4.5],[x+11,.9,z+7],[x+2,.9,z+7],hexToRgb('#827354'));}

// Short, directional ground-shadow polygons. Rebuilt when the clock crosses an artistic lighting step.
function shadowTree(x,y,z,size){const t=state.time;if(t<6.0||t>19.4)return;const overcast=state.weather==='cloud'||state.weather==='storm'||state.weather==='rain';if(overcast)return;
 const altitude=Math.max(.22,Math.sin((t-5.8)/13.5*PI)),len=clamp(size*2.1/(altitude+.12),2.2,size*9),dir=Math.sin((t-12)/13*PI)*.96,dx=dir*len,dz=-len*.34;
 const col=colorMul(hexToRgb('#3e5a45'),state.weather==='fog'?.89:.77);
 quad([x-.47*size,y+.04,z],[x+.47*size,y+.04,z],[x+dx+.67*size,y+.05,z+dz],[x+dx-.67*size,y+.05,z+dz],col);
}
function fallenLog(x,y,z,s,seed){const bark=hexToRgb('#69533d');
 box(x,y,z,s*1.9,s*.35,s*.45,bark);box(x+s*.2,y+s*.32,z,s*.25,s*.14,s*.23,hexToRgb('#947653'));
}
function lilyPads(){for(let i=0;i<42;i++){let x=-24+H(i*28)*48,z=-28+H(i*119)*22,r=.36+H(i*13)*.4;
 const col=hexToRgb(i%3===0?'#608456':'#71966b');const c=[x,-.145,z];const n=6;for(let j=0;j<n;j++){let a=j*TAU/n,b=(j+1)*TAU/n;tri(c,[x+Math.cos(a)*r,-.14,z+Math.sin(a)*r*.52],[x+Math.cos(b)*r,-.14,z+Math.sin(b)*r*.52],colorMul(col,.85+H(i+j)*.25));}
 if(i%9===0){const warm=hexToRgb('#f0d9a8');box(x,.03,z,.08,.31,.08,hexToRgb('#56734c'));
 for(let j=0;j<5;j++){let a=j*TAU/5;tri([x,.36,z],[x+Math.cos(a)*.16,.17,z+Math.sin(a)*.16],[x+Math.cos(a+.9)*.16,.17,z+Math.sin(a+.9)*.16],warm);}}}}
// Real near-shore props are measured from the seated player's view, not an upright standing eye.
// Approximate ground level here is 0.3–0.5m: tabletop ~0.97m, seated eye ~1.7m.
const TABLE3D={x:-.90,z:10.75,y:.97,width:1.04,depth:.73};
const ROD_STAND={x:1.55,ground:.40,z:10.40};
function layoutWorldProps(){TABLE3D.x=portrait?-.24:-.90;TABLE3D.width=portrait?.88:1.04;ROD_STAND.x=portrait?.28:1.55;}

function buildShoreTable(){
 const T=TABLE3D,wood=hexToRgb('#68523e'),top=hexToRgb('#a28a68'),metal=hexToRgb('#544b3b');
 // 3D boards cast their own faceted shading, anchored in the near-shore terrain.
 box(T.x,T.y-.13,T.z,T.width,.13,T.depth,top);
 for(let i=0;i<6;i++)box(T.x-T.width*.40+i*T.width*.16,T.y-.005,T.z,T.width*.147,.025,T.depth*.96,colorMul(top,.81+(i%3)*.075));
 for(let side of [-1,1])for(let front of [-1,1]){
  const xx=T.x+side*T.width*.40,zz=T.z+front*T.depth*.40;
  box(xx,.30,zz,.075,T.y-.38,.075,wood);
 }
 box(T.x,1.09,T.z,T.width*.85,.065,.065,metal);
 box(T.x,1.30,T.z-T.depth*.37,T.width*.88,.07,.055,colorMul(wood,.75));
}
// Compact metal rod rest planted on the near bank, with front and back legs.
function buildRodStand3D(){
 const x=ROD_STAND.x,z=ROD_STAND.z,ground=ROD_STAND.ground,metal=hexToRgb('#474d43'),wood=hexToRgb('#9a896b');
 box(x,ground,z,.10,.52,.10,metal);
 for(const d of [-1,1]){
  tri([x,ground+.54,z],[x+d*.25,ground+.02,z+.14],[x+d*.18,ground+.08,z+.20],metal);
 }
 box(x,ground+.53,z,.29,.09,.12,wood);
 box(x,ground+.60,z,.18,.055,.11,metal);
}
function nearShoreDetails(){for(let i=0;i<35;i++){let x=-20+H(i*61)*40,z=5.8+H(i*7)*.9;
 if(i%8===0)fallenLog(x,.17,z,.48+H(i)*.9,i);else if(i%3===0)rock(x,.03,z,.12+H(i*43)*.4,H(i));else reeds(x,.18,z,.35+H(i*3)*.75,i*3);}
 // weathered dock board and bank-side tackle markers, intentionally at foreground only.
 for(let i=0;i<12;i++){const x=-5.8+i*.9;box(x,.12,9.3,.83,.10,1.85,hexToRgb(i%2?'#82725b':'#766b56'));}
 for(let i=0;i<4;i++)box(-5.8+i*3,.11,8.7,.22,.85,.25,hexToRgb('#625846'));
 box(-7.7,.24,11.1,1.4,.48,.90,hexToRgb('#485948'));
 box(-7.7,.74,11.1,1.43,.12,.95,hexToRgb('#a68d63'));
}

function buildWorld(){mesh=[];waterMesh=[];const river=state.spot==='river',lake=state.spot==='lake',sea=state.spot==='sea';
 // Both river and reservoir are intentionally viewed ACROSS the water, with a single distant bank.
 // The near shore sits only along the bottom edge behind the first-person rod.
 const far=river?-32:lake?-43:-420;
 for(let ix=0;ix<36;ix++){for(let iz=0;iz<42;iz++){const x=-180+ix*10,x2=x+10,z=far+(8-far)*iz/42,z2=far+(8-far)*(iz+1)/42;const color=hexToRgb(sea?'#496a78':lake?'#50766c':'#547c71');quad([x,-.17,z],[x2,-.17,z],[x2,-.17,z2],[x,-.17,z2],color,waterMesh)}}
 // foreground grassy ledge; geometry is below the camera, not walls left and right
 for(let i=0;i<45;i++){const x=-90+i*4,next=x+4;const col=hexToRgb(['#64765b','#758567','#58694e','#758266'][i%4]);quad([x,.14,7.5],[next,.14,7.5],[next,1.5,30],[x,1.5,30],col);quad([x,-.1,6],[next,-.1,6],[next,.14,7.5],[x,.14,7.5],hexToRgb('#938770'));}
 if(!sea){grassyMounds();for(let i=0;i<60;i++){let x=-130+i*4.7+(H(i*11)-.5)*3,z=far-12-H(i*12)*15;const s=.85+H(i*17)*1.45;if(lake){if(i%6===0)broadleaf(x,2.8,z,s*.8,i+110);else pine(x,2.8,z,s,i+91);}else{if(i%4===0)pine(x,2.8,z,s*.85,i+80);else broadleaf(x,2.8,z,s,i+14)}shadowTree(x,2.82,z,s);}
 for(let i=0;i<90;i++){const x=-126+i*2.9,z=far-1.4+Math.sin(x*.042)*1.6;if(i%5===0)rock(x,.04,z,.65+H(i)*.85,i*.11);else reeds(x,.15,z,.45+H(i*3)*.65,i*13)}
 if(river)makeCabin();if(lake)lilyPads();
 for(let i=0;i<50;i++){const x=-200+i*8;const y=7+H(i*13)*10+(i%7===0?9:0),col=hexToRgb(lake?'#566c69':'#6d8185');tri([x,2.5,-123],[x+12,y,-123],[x+29,2.5,-123],colorMul(col,.75+H(i*7)*.17));}
 }else{
 for(let i=0;i<33;i++){const x=-195+i*12;const hh=H(i*13)*3.5;tri([x,.2,-170],[x+16,hh+1,-170],[x+40,.2,-170],hexToRgb(i%2?'#6a8187':'#71838b'));}
 for(let i=0;i<34;i++){const x=(i<17?-1:1)*(12+(i%17)*4.8),z=7+H(i*7)*5;rock(x,0,z,1.1+H(i*3)*2.4,i/45)}
 // Old lighthouse far to the right of the coast
 box(60,.5,-80,3,12,3,hexToRgb('#b7b6a7'));box(60,12.5,-80,4.4,2.4,4.4,hexToRgb('#985b4c'));box(60,15,-80,5,1.4,5,hexToRgb('#665b53'));box(60,11.8,-76.9,1.2,1.5,.15,hexToRgb('#f4dca8'));
 }
 for(let i=0;i<48;i++){let x=-36+H(i*17)*72,z=6+H(i*31)*3.2;if(i%3===0)rock(x,.09,z,.4+H(i*5)*.45,i*.65);else if(!sea)reeds(x,.15,z,.35+H(i)*.65,i*37)}if(!sea)nearShoreDetails();buildShoreTable();buildRodStand3D();
 const mb=new Float32Array(mesh),wb=new Float32Array(waterMesh);if(sceneBuffer)gl.deleteBuffer(sceneBuffer);if(waterBuffer)gl.deleteBuffer(waterBuffer);sceneBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sceneBuffer);gl.bufferData(gl.ARRAY_BUFFER,mb,gl.STATIC_DRAW);sceneVertexCount=mb.length/9;waterBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,waterBuffer);gl.bufferData(gl.ARRAY_BUFFER,wb,gl.STATIC_DRAW);waterVertexCount=wb.length/9;}
function bindGeometry(buf){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.vertexAttribPointer(0,3,gl.FLOAT,false,36,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,36,12);gl.vertexAttribPointer(2,3,gl.FLOAT,false,36,24);for(let i=0;i<3;i++)gl.enableVertexAttribArray(i)}
function lighting(){const t=state.time,day=clamp(Math.sin((t-5.5)/14*PI),0,1),twilight=clamp(1-Math.abs(t-18.2)/3.2,0,1),dawn=clamp(1-Math.abs(t-6.3)/2.5,0,1),gold=Math.max(twilight,dawn);const night=1-day;let top=mixColor(hexToRgb('#111e31'),hexToRgb('#6c9eb1'),day),low=mixColor(hexToRgb('#26304d'),hexToRgb('#bdcfd1'),day),sun=hexToRgb('#fff1c7'),fog=mixColor(hexToRgb('#364957'),hexToRgb('#a8bab2'),day);top=mixColor(top,hexToRgb('#886f7d'),gold*.56);low=mixColor(low,hexToRgb('#f0ac86'),gold*.75);const wmix=clamp(state.weatherBlend,0,1),rainCode=w=>w==='storm'?.48:w==='rain'?.27:w==='cloud'?.12:0;let rain=lerp(rainCode(state.weatherPrev),rainCode(state.weather),wmix); top=mixColor(top,hexToRgb('#303f4d'),rain);low=mixColor(low,hexToRgb('#7a9096'),rain);fog=mixColor(fog,hexToRgb('#75868b'),rain);const fogMix=lerp(state.weatherPrev==='fog'?1:0,state.weather==='fog'?1:0,wmix);if(fogMix>0)fog=mixColor(fog,hexToRgb('#c5c9c0'),.6*fogMix);const light=[Math.cos((t-6)/12*PI)*.78,.20+day*.85,-.70],sunX=.18+clamp((t-5)/14,0,1)*.7,sunY=.18+Math.sin(clamp((t-5)/14,0,1)*PI)*.58;return{top,low,fog,day,night,gold,sun,sunX,sunY,light,cloud:lerp(WEATHER[state.weatherPrev].cloud,WEATHER[state.weather].cloud,wmix),rainShader:lerp(state.weatherPrev==='storm'?1:state.weatherPrev==='rain'?.65:0,state.weather==='storm'?1:state.weather==='rain'?.65:0,wmix),lightColor:mixColor([.34,.43,.53],[.87,.82,.67],day),ambient:mixColor([.32,.38,.47],[.54,.57,.53],day),wave:state.spot==='sea'?1.8:state.spot==='lake'?.45:.85,fogStrength:lerp(state.weatherPrev==='fog'?.025:state.weatherPrev==='storm'?.018:.008,state.weather==='fog'?.025:state.weather==='storm'?.018:.008,wmix),water:state.spot==='sea'?hexToRgb('#39748a'):state.spot==='lake'?hexToRgb('#426e65'):hexToRgb('#3b6e62')};}
const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);

// ORIGINAL LOW-POLY FISH — species silhouettes, facet shading and grade materials.
// Every fish is built from 3D rings, fins and tails and rendered by the WebGL object shader.
const fishBuffer=gl.createBuffer();let fishVertices=0,heldAnchor=[0,2,6],visibleFishCenter=null;
function fishClass(name){
 if(/광어|도다리|가자미/.test(name))return 'flat';
 if(/메기|동자개|대구/.test(name))return 'cat';
 if(/가물치|미꾸라지/.test(name))return 'eel';
 if(/갈치/.test(name))return 'ribbon';
 if(/학꽁치|강준치/.test(name))return 'needle';
 if(/산천어|송어|은어/.test(name))return 'salmon';
 if(/참돔|감성돔|벵에돔|전어|붕어|떡붕어|참붕어|블루길|납자루/.test(name))return 'deep';
 if(/꺽지|우럭|볼락|쏘가리|쥐노래미/.test(name))return 'spiny';
 if(/고등어|삼치|전갱이|피라미|빙어|끄리|쉬리|버들치/.test(name))return 'slender';
 if(/잉어|향어|누치|돌고기|참마자|모래무지/.test(name))return 'carp';
 return 'bass';
}
function fishMorph(name){
 // Individualized silhouette details layered over the ten shared low-poly families.
 const tag=name||'';
 if(/피라미|빙어|전갱이|쉬리/.test(tag))return {length:1.16,depth:.80,tail:1.13,spot:0};
 if(/향어|잉어|붕어|떡붕어/.test(tag))return {length:1.02,depth:1.17,tail:.88,spot:0};
 if(/쏘가리|꺽지|우럭|볼락/.test(tag))return {length:.98,depth:1.11,tail:.95,spot:1};
 if(/송어|산천어|은어/.test(tag))return {length:1.18,depth:.86,tail:1.20,spot:2};
 if(/가물치|메기|동자개/.test(tag))return {length:1.14,depth:.76,tail:1.08,spot:1};
 if(/참돔|감성돔|벵에돔/.test(tag))return {length:.92,depth:1.27,tail:.93,spot:3};
 if(/광어|도다리|가자미/.test(tag))return {length:1.17,depth:.95,tail:.72,spot:3};
 return {length:1,depth:1,tail:1,spot:0};
}
function emitFish(fish,world,time){const kind=fishClass(fish.name),grade=fish.grade||0;
 const morph=fishMorph(fish.name);
 const col=hexToRgb(fish.tint||'#a7bdac'),metal=grade===1?hexToRgb('#dbe8f7'):grade===2?hexToRgb('#eec65a'):grade===3?hexToRgb('#d7f8fb'):hexToRgb('#79e5ec');
 const topCol=grade?mixColor(colorMul(col,.84),metal,grade===1?.68:.86):colorMul(col,.75);
 const flankCol=grade?mixColor(col,metal,grade===1?.76:.91):col;
 const bellyCol=grade?mixColor(hexToRgb('#e9e1c4'),metal,.65):mixColor(col,hexToRgb('#f6e6b7'),.52);
 const finCol=grade?mixColor(topCol,hexToRgb('#577d80'),.2):colorMul(col,.64);
 const baseWidth=kind==='ribbon'?1.9:kind==='needle'?1.67:kind==='eel'?1.60:kind==='deep'?1.13:kind==='flat'?1.32:kind==='slender'?1.24:kind==='salmon'?1.15:.99;
 const width=baseWidth*morph.length;
 const baseTall=kind==='deep'?1.52:kind==='flat'?.31:kind==='ribbon'?.26:kind==='needle'?.39:kind==='eel'?.49:kind==='slender'?.67:kind==='salmon'?.94:kind==='cat'?.82:kind==='carp'?1.28:1;
 const tall=baseTall*morph.depth;
 const thick=kind==='flat'?1.85:kind==='ribbon'?.26:kind==='needle'?.42:kind==='eel'?.7:kind==='cat'?1.42:kind==='deep'?1.15:1;
 const scale=world.scale,cyaw=Math.cos(world.yaw),syaw=Math.sin(world.yaw);
 const burst=world.mode==='fight'?state.runIntensity:.34;
 const beat=time*(world.mode==='landed'?9.8:7.8+burst*7.3)+(world.mode==='fight'?state.fishSide:2);
 const swim=Math.sin(beat),finBeat=Math.sin(beat*1.9+.8),thrust=.16+burst*.18;
 const tx=p=>{let [x,y,z]=p;const rear=clamp((x+.1)/1.7,0,1);z+=Math.pow(rear,1.45)*swim*thrust;
  y+=Math.sin(beat*.55+x*1.8)*.018*rear;
  // Hang rotation turns the hooked mouth upward, letting the body flap BELOW the line.
  const hang=world.hang||0,px=x*Math.cos(hang)-y*Math.sin(hang),py=x*Math.sin(hang)+y*Math.cos(hang);
  x=px*scale;y=py*scale;z*=scale;
  return[world.x+x*cyaw+z*syaw,world.y+y*Math.cos(world.roll)-z*Math.sin(world.roll),world.z+z*cyaw-x*syaw];};
 const out=[];const face=(a,b,c,color)=>put(out,tx(a),tx(b),tx(c),color);
 const pair=(a,b,c,d,color)=>{face(a,b,c,color);face(a,c,d,color);};
 const xs=[-1.02,-.83,-.56,-.18,.20,.53,.79,.99].map(n=>n*width);
 const radii=[.12,.53,.78,1,.93,.67,.37,.11],nr=8,rings=[];
 for(let i=0;i<xs.length;i++){
  let ring=[]; for(let j=0;j<nr;j++){const a=j/nr*TAU,yy=Math.sin(a)*.47*tall*radii[i],zz=Math.cos(a)*.34*thick*radii[i];ring.push([xs[i],yy,zz]);} rings.push(ring);
 }
 for(let i=0;i<rings.length-1;i++) for(let j=0;j<nr;j++){
  const k=(j+1)%nr;const factor=1+.06*Math.sin(i*17+j*9);
  const c=j<=2?flankCol:j<=4?bellyCol:topCol;
  pair(rings[i][j],rings[i+1][j],rings[i+1][k],rings[i][k],colorMul(c,factor));
 }
 // Head and mouth, visible from either side.
 face([-1.12*width,-.055,0],rings[0][1],rings[0][3],colorMul(flankCol,.88));
 face([-1.12*width,-.055,0],rings[0][6],rings[0][0],colorMul(flankCol,.75));
 const tailX=1.02*width,tailEnd=(1.52+Math.cos(beat)*.035)*width,tailS=swim*(.22+burst*.25);
 const tailY=morph.tail*(kind==='eel'?.18:kind==='needle'?.37:kind==='ribbon'?.25:kind==='salmon'?.43:.6);
 for(const side of [-1,1]){
  face([tailX,0,side*.02],[tailEnd,tailY*tall,side*.03+tailS],[tailEnd-.1,-.02,side*.06+tailS],colorMul(finCol,1.05));
  face([tailX,0,side*.02],[tailEnd-.1,-.02,side*.06+tailS],[tailEnd,-tailY*tall,side*.03+tailS],finCol);
  // Dorsal/anal fins and pectoral fins (faceted triangles).
  face([-.35*width,.36*tall,side*.06],[.3*width,(kind==='spiny'?.94:.77)*tall,side*.05],[.75*width,.22*tall,side*.05],finCol);
  face([-.12*width,-.36*tall,side*.1],[.35*width,-.67*tall,side*.02],[.68*width,-.15*tall,side*.05],colorMul(finCol,1.09));
  face([-.52*width,-.04,side*.28*thick],[.05*width,(-.33-finBeat*.11)*tall,side*(.6+finBeat*.1)*thick],[.09*width,.03,side*.23*thick],colorMul(finCol,.93));
  // Gill cover pulses separately from the tail and pectoral fins.
  pair([-.70*width,-.12,side*.31*thick],[-.59*width,-.19,side*(.34+.018*finBeat)*thick],[-.57*width,.13,side*(.34+.018*finBeat)*thick],[-.68*width,.18,side*.31*thick],colorMul(finCol,.76));
  // eyes are actual octahedral facets, not flat sprites
  let cx=-.79*width,ey=.17*tall,ez=side*.255*thick;
  const eyecolor=grade>=3?hexToRgb('#17394b'):hexToRgb('#111f24');
  const eye=[cx,ey,ez+side*.057],ea=[cx-.057,ey,ez],eb=[cx+.057,ey,ez],ec=[cx,ey+.058,ez],ed=[cx,ey-.058,ez];
  face(eye,ea,ec,eyecolor);face(eye,ec,eb,eyecolor);face(eye,eb,ed,eyecolor);face(eye,ed,ea,eyecolor);
  face([cx-.015,ey+.025,ez+side*.060],[cx+.009,ey+.028,ez+side*.060],[cx+.005,ey+.010,ez+side*.060],hexToRgb('#f4f6ec'));
  if(kind==='cat'){ // triangular whiskers distinct from other fish
    pair([-1.02*width,-.11,side*.13],[-1.5*width,-.25,side*.32],[-1.45*width,-.28,side*.33],[-1.01*width,-.13,side*.14],colorMul(finCol,.62));
    pair([-1.02*width,-.19,side*.13],[-1.38*width,-.43,side*.39],[-1.34*width,-.44,side*.39],[-1.01*width,-.21,side*.14],colorMul(finCol,.57));
  }
  if(kind==='spiny'){for(let i=0;i<5;i++){
    const sx=(-.48+i*.23)*width;face([sx,.39*tall,side*.05],[sx+.13,.84*tall,side*.03],[sx+.26,.33*tall,side*.04],colorMul(finCol,.78));}}
  if(['bass','eel','spiny','slender','salmon','needle'].includes(kind)){
   for(let k=0;k<4;k++){const sx=(-.28+k*.25)*width;
    pair([sx,.06*tall,side*.30*thick],[sx+.10,.17*tall,side*.27*thick],[sx+.15,-.19*tall,side*.27*thick],[sx+.035,-.20*tall,side*.30*thick],colorMul(topCol,.65));}
  }
  if(morph.spot){for(let i=0;i<7;i++){
    const sx=(-.52+i*.19)*width,sz=side*.31*thick;
    const r=.018+(i%3)*.007,sy=(.14*Math.sin(i*2.4))*tall;
    face([sx,sy,sz],[sx+r,sy+r*.45,sz+side*.008],[sx+r*.4,sy-r,sz+side*.008],colorMul(morph.spot===2?flankCol:topCol,.55));
   }}
  if(kind==='flat'){ // flattened body with spots visible on broad side
   for(let i=0;i<5;i++){let sx=(-.50+i*.24)*width;
    face([sx,.09*tall,side*.36*thick],[sx+.065,.19*tall,side*.34*thick],[sx+.12,.06*tall,side*.37*thick],colorMul(flankCol,.67));}
  }
 }
 return out;
}

function fishMouthWorld(fish=state.phase==='landed'?state.landedFish:state.fish,pose=fishLocation()){
 if(!fish)return null;
 const kind=fishClass(fish.name),morph=fishMorph(fish.name);
 const base=kind==='ribbon'?1.9:kind==='needle'?1.67:kind==='eel'?1.60:kind==='deep'?1.13:kind==='flat'?1.32:kind==='slender'?1.24:kind==='salmon'?1.15:.99;
 const x=-1.12*base*morph.length,y=-.055;
 const hang=pose.hang||0,X=(x*Math.cos(hang)-y*Math.sin(hang))*pose.scale,Y=(x*Math.sin(hang)+y*Math.cos(hang))*pose.scale;
 const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw);
 return [pose.x+X*cy,pose.y+Y*Math.cos(pose.roll),pose.z-X*sy];
}
function fishHookPoint(){const f=state.phase==='landed'?state.landedFish:state.fish;
 return f?fishMouthWorld(f,fishLocation()):null;
}
function fishLocation(){const t=state.sceneSeconds,landed=state.phase==='landed';
 if(landed){
  const age=state.landingAge||0,drift=clamp(age/2.25,0,1),flutter=Math.sin(t*15.8)*.18+Math.sin(t*7.1)*.10;
  // Surface fish emerges along the fishing line, then hangs by the upper lip.
  const leap=-.07+drift*1.39+Math.sin(t*6.3)*.046;
  const x=lerp(state.baitX,portrait?.20:-.14,drift),z=lerp(state.baitZ,5.25,drift);
  heldAnchor=[x,leap,z];
  return{x,y:leap,z,scale:clamp((state.landedFish.length||50)/58,.62,1.75)*.58,
    yaw:.16+Math.sin(t*3.1)*.16,roll:flutter*.45,hang:-1.35+flutter*.29,mode:'landed'};}

 const burst=state.runIntensity;
 const leap=state.fishLeap*Math.max(0,Math.sin(clamp(state.fishLeap,0,1)*PI));
 return{x:state.baitX,y:-.14+burst*.10+Math.sin(t*7.2)*.04+leap*.32,z:state.baitZ,
  scale:clamp(state.fish.length/62,.47,1.2)*.9,
  yaw:Math.sin(t*(1.6+burst*2.6)+state.fishSide)*(.40+burst*.38),
  roll:Math.sin(t*(5+burst*7))*(.045+burst*.17),mode:'fight'};
}
function renderLowPolyFish(L,t){const f=state.phase==='landed'?state.landedFish:state.phase==='fight'?state.fish:null;
 if(!f)return;const pose=fishLocation(),verts=emitFish(f,pose,t);if(!verts.length)return;fishVertices=verts.length/9;visibleFishCenter=[pose.x,pose.y,pose.z];gl.useProgram(objectProgram);gl.uniform1f(U.obj.ink,state.quality==='pixel'?.77:.25);gl.uniformMatrix4fv(U.obj.vp,false,viewProj);gl.uniform1f(U.obj.time,t);gl.uniform3fv(U.obj.light,L.light);gl.uniform3fv(U.obj.lightColor,L.lightColor);gl.uniform3fv(U.obj.ambient,L.ambient);gl.uniform3fv(U.obj.fogColor,L.fog);gl.uniform1f(U.obj.fog,state.phase==='landed'?0:L.fogStrength);gl.uniform1f(U.obj.night,L.night);gl.bindBuffer(gl.ARRAY_BUFFER,fishBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);bindGeometry(fishBuffer);gl.drawArrays(gl.TRIANGLES,0,fishVertices);
}

// Articulated first-person hand + low-poly props, drawn in camera-local 3D space.
// This pass uses the SAME WebGL mesh shader as the environment. It is not a flat illustration.
const fpBuffer=gl.createBuffer();const tablePropsBuffer=gl.createBuffer();
const fpRGB=h=>hexToRgb(h), fpSmooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
function fpKey(p,keys){if(p<=keys[0][0])return keys[0].slice(1);for(let i=1;i<keys.length;i++)if(p<=keys[i][0]){let a=keys[i-1],b=keys[i],t=fpSmooth((p-a[0])/(b[0]-a[0]));return a.slice(1).map((v,k)=>lerp(v,b[k+1],t));}return keys[keys.length-1].slice(1);}
function fpCylinder(out,a,b,rA,rB,color,n=9){
 const ax=b[0]-a[0],ay=b[1]-a[1],az=b[2]-a[2],mag=Math.hypot(ax,ay,az)||1,dir=[ax/mag,ay/mag,az/mag];
 let t=Math.abs(dir[1])>.92?[1,0,0]:[0,1,0];let u=[dir[1]*t[2]-dir[2]*t[1],dir[2]*t[0]-dir[0]*t[2],dir[0]*t[1]-dir[1]*t[0]];let um=Math.hypot(...u)||1;u=u.map(v=>v/um);let v=[dir[1]*u[2]-dir[2]*u[1],dir[2]*u[0]-dir[0]*u[2],dir[0]*u[1]-dir[1]*u[0]];
 for(let i=0;i<n;i++){const ang=i*Math.PI*2/n,ang2=(i+1)*Math.PI*2/n,pt=(o,r,q)=>o.map((c,j)=>c+r*(u[j]*Math.cos(q)+v[j]*Math.sin(q)));
 const a0=pt(a,rA,ang),a1=pt(a,rA,ang2),b0=pt(b,rB,ang),b1=pt(b,rB,ang2),c=colorMul(color,.90+.13*Math.cos(ang));put(out,a0,a1,b1,c);put(out,a0,b1,b0,c);put(out,a,a1,a0,colorMul(color,.75));put(out,b,b0,b1,colorMul(color,1.16));}}
function fpPoly(out,pts,col){for(let i=1;i<pts.length-1;i++)put(out,pts[0],pts[i],pts[i+1],col);}
// All hands, bottles and chopsticks use the same camera projection as the actual world table.
// Contact anchors are the *real* coordinates of the items, converted to view-space every frame.
const REST_MOTION={
 beer:{pickup:.245,putdown:.875,mouth:[-.025,-.11,-1.09],home:[.90,-1.05,-1.71],bend:[[0,0],[.10,.55],[.22,.90],[.32,.77],[.43,.10],[.68,0],[.77,.51],[.86,.87],[.94,.35],[1,0]],head:[[0,0],[.37,0],[.46,.085],[.57,.22],[.67,.12],[.75,0],[1,0]]},
 smoke:{pickup:.245,putdown:.876,mouth:[-.015,-.10,-1.04],home:[.87,-1.06,-1.69],bend:[[0,0],[.10,.50],[.22,.86],[.33,.73],[.44,.08],[.69,0],[.76,.54],[.86,.84],[.94,.31],[1,0]],head:[[0,0],[.43,-.018],[.60,-.018],[.68,.04],[.78,0],[1,0]]},
 sashimi:{pickup:.205,putdown:.885,mouth:[.005,-.085,-1.05],home:[.89,-1.05,-1.70],bend:[[0,0],[.09,.47],[.23,.81],[.38,.70],[.49,.10],[.68,.03],[.78,.57],[.88,.86],[.96,.28],[1,0]],head:[[0,0],[.49,-.018],[.64,.017],[.73,0],[1,0]]}
};
function restScalar(p,keys){if(p<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(p<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],fpSmooth((p-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));return keys[keys.length-1][1];}
function restAnchor(k){const T=TABLE3D,yy=T.y+.10;return k==='beer'?[T.x-T.width*.34,yy+.16,T.z+.02]:k==='smoke'?[T.x-T.width*.06,yy+.065,T.z+.005]:[T.x+T.width*.27,yy+.055,T.z+.005];}
// Mobile portrait uses a narrower hand rig: the shoulder begins near the right edge,
// instead of projecting completely offscreen from desktop-sized camera coordinates.
function fpShoulder(){return portrait?[.22,-1.26,-1.13]:[.93,-1.28,-1.06];}
function fpModelFrame(){if(!state.restAction||state.restActionTime<=0||state.menu)return null;
 const p=restProgress(),k=state.restAction,motion=REST_MOTION[k];if(!motion)return null;
 const localItem=viewPoint(restAnchor(k));
 // Fingers really converge on the position of the world item as we lean over it.
 const contact= k==='beer'?[localItem[0],localItem[1]-.15,localItem[2]]:k==='smoke'?[localItem[0]+.025,localItem[1]-.08,localItem[2]]:[localItem[0]+.04,localItem[1]-.12,localItem[2]];
 const home=portrait?[.27,motion.home[1],motion.home[2]]:motion.home,mouth=portrait?[0,-.15,-1.16]:motion.mouth;
 let xyz;
 if(p<.085){xyz=fpKey(p,[[0,...home],[.085,home[0]-.08,home[1]+.04,home[2]-.14]]);}
 else if(p<motion.pickup){const w=fpSmooth((p-.085)/(motion.pickup-.085));xyz=home.map((v,i)=>lerp(v,contact[i],w));}
 else if(k==='sashimi'&&p<.525){const w=fpSmooth((p-.365)/(.525-.365));xyz=contact.map((v,i)=>lerp(v,mouth[i],w));}
 else if(p<.445){const w=fpSmooth((p-motion.pickup)/(.445-motion.pickup));xyz=contact.map((v,i)=>lerp(v,mouth[i],w));}
 else if(p<.680){const w=(p-.445)/.235;xyz=[mouth[0]+Math.sin(w*15)*(k==='beer'?.006:.002),mouth[1]+(k==='beer'?Math.sin(w*20)*.009:k==='sashimi'?Math.sin(w*13)*.005:0),mouth[2]];}
 else if(p<.775){const w=fpSmooth((p-.68)/.095);xyz=mouth.map((v,i)=>lerp(v,contact[i],w*.66));}
 else if(p<motion.putdown){const w=fpSmooth((p-.775)/(motion.putdown-.775));xyz=mouth.map((v,i)=>lerp(v,contact[i],.66+.34*w));}
 else{const w=fpSmooth((p-motion.putdown)/(1-motion.putdown));xyz=contact.map((v,i)=>lerp(v,home[i],w));}
 const tilt=k==='beer'?restScalar(p,[[0,0],[.35,.15],[.45,.58],[.56,1.29],[.64,1.22],[.73,.31],[.86,0],[1,0]]):k==='smoke'?restScalar(p,[[0,0],[.42,.10],[.49,.36],[.62,.34],[.76,.10],[1,0]]):restScalar(p,[[0,0],[.39,-.18],[.53,.22],[.65,.29],[.76,.05],[1,0]]);
 return {k,p,x:xyz[0],y:xyz[1],z:xyz[2],tilt,grip:[xyz[0]+.06,xyz[1]-.12,xyz[2]+.035],head:restScalar(p,motion.head),bow:restScalar(p,motion.bend),holding:p>=motion.pickup&&p<motion.putdown, pickup:motion.pickup,putdown:motion.putdown,contact};
}
function fpHand(out,palm,scale=1){const skin=fpRGB('#c9a98b'),hi=fpRGB('#e0ba99'),shade=fpRGB('#9c7c66'),coat=fpRGB('#455957');
 const shoulder=fpShoulder(),elbow=[lerp(shoulder[0],palm[0],.44)+.12,lerp(shoulder[1],palm[1],.36)-.09,lerp(shoulder[2],palm[2],.50)];
 fpCylinder(out,shoulder,elbow,.145,.134,coat,8);fpCylinder(out,elbow,[palm[0]+.1,palm[1]-.12,palm[2]],.132,.100,coat,8);
 fpCylinder(out,[palm[0]+.09,palm[1]-.13,palm[2]],[palm[0],palm[1]+.005,palm[2]-.02],.094,.11,skin,8);
 for(let i=0;i<4;i++){let off=(i-1.5)*.034;fpCylinder(out,[palm[0]-.06+off,palm[1]-.02,palm[2]+.018],[palm[0]-.085+off,palm[1]+.12-(i%2)*.013,palm[2]-.045],.029,.023,i%2?hi:skin,6);}
 fpCylinder(out,[palm[0]+.068,palm[1]-.01,palm[2]+.12],[palm[0]-.008,palm[1]+.08,palm[2]+.115],.034,.026,shade,6);
}
function fpTransform(v,origin,tilt,side=0){const x=v[0],y=v[1],z=v[2],c=Math.cos(tilt),s=Math.sin(tilt);return [origin[0]+x+side*y,origin[1]+y*c-z*s,origin[2]+y*s+z*c];}
function fpBottle(out,frame){if(!frame.holding){fpHand(out,[frame.x,frame.y,frame.z]);return;}const base=[frame.x,frame.y,frame.z],tilt=frame.tilt,glass=fpRGB('#315b4b'),deep=fpRGB('#284e42'),cream=fpRGB('#d4c69a'),gold=fpRGB('#c1a66b');const P=v=>fpTransform(v,base,tilt);
 fpCylinder(out,P([0,-.24,0]),P([0,.16,0]),.125,.114,glass,10);fpCylinder(out,P([0,.16,0]),P([0,.28,0]),.114,.052,glass,10);fpCylinder(out,P([0,.28,0]),P([0,.51,0]),.049,.044,deep,9);fpCylinder(out,P([0,.52,0]),P([0,.545,0]),.052,.055,gold,9);
 fpCylinder(out,P([0,-.055,0]),P([0,.095,0]),.129,.127,cream,9);
 // Opaque ceramic-style label and dark glass highlight retain material identity throughout pickup.
 fpCylinder(out,P([-.054,-.18,.102]),P([-.054,.15,.102]),.015,.011,fpRGB('#c1d0a9'),5);fpCylinder(out,P([0,-.045,0]),P([0,-.023,0]),.131,.131,fpRGB('#89785f'),9);
 fpCylinder(out,P([0,-.23,0]),P([0,-.12,0]),.108,.113,fpRGB('#315b4b'),10);
 const h=Math.sin(state.sceneSeconds*5)*.008;fpCylinder(out,P([-.07,-.16,.081]),P([-.07,.14+h,.078]),.013,.011,fpRGB('#9fbca2'),5);
 fpHand(out,[frame.x+.065,frame.y-.10,frame.z+.09]);
 for(let j=0;j<3;j++){const off=j*.06;fpCylinder(out,P([.105,-.16+off,.035]),P([.13,-.14+off,.12]),.025,.020,fpRGB('#d4b298'),6);}
}
function fpSmoke(out,frame){if(!frame.holding){fpHand(out,[frame.x,frame.y,frame.z]);return;}const p=frame.p,white=fpRGB('#e9e1ce');fpHand(out,[frame.x+.02,frame.y-.04,frame.z+.075]);
 // Filter stays at the mouth-side point A; the burning ember is ONLY on distal point B.
 const a=[frame.x-.055,frame.y+.14,frame.z+.032],b=[frame.x-.20,frame.y+.24,frame.z+.21];
 const delta=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],filterEnd=a.map((v,i)=>v+delta[i]*.22),emberStart=a.map((v,i)=>v+delta[i]*.91);
 fpCylinder(out,a,filterEnd,.014,.014,fpRGB('#caa37b'),8);fpCylinder(out,filterEnd,emberStart,.014,.013,white,8);
 fpCylinder(out,emberStart,b,.015,.014,p>.48&&p<.61?fpRGB('#f7b76a'):fpRGB('#8d6552'),8);
 if(p>.48&&p<.61)fpCylinder(out,b,[b[0]-.018,b[1]+.012,b[2]+.025],.018,.012,fpRGB('#f7b76a'),7);
}
function fpSashimi(out,frame){const p=frame.p,palm=[frame.x+.04,frame.y-.05,frame.z+.04];fpHand(out,palm);if(!frame.holding)return;
 // Two true cylindrical chopsticks, separate in space; the fish is pinched at their tips.
 const src=[frame.x+.005,frame.y+.08,frame.z+.025];const delta=[-.29,.23,.11],pinch=frame.p>.26&&frame.p<.75?.020:.039;
 const warm=fpRGB('#a98e59'),bright=fpRGB('#d9b37c');for(let i=0;i<2;i++){
 const a=[src[0]+(i?pinch:-pinch),src[1]+(i?-.014:.015),src[2]+(i?.017:-.017)],b=[src[0]+delta[0]+(i?.017:-.017),src[1]+delta[1]+(i?-.012:.015),src[2]+delta[2]];fpCylinder(out,a,b,.015,.006,i?warm:bright,6);}
 if(p>=.365&&p<.635){let x=frame.x-.30,y=frame.y+.305,z=frame.z+.13;const salmon=fpRGB('#e1a09a'),belly=fpRGB('#f5c9ba'),dark=fpRGB('#b77c78');fpPoly(out,[[x-.060,y-.027,z],[x+.038,y-.024,z],[x+.050,y+.026,z+.012],[x-.047,y+.030,z+.012]],salmon);fpPoly(out,[[x-.052,y+.023,z],[x+.050,y+.026,z+.012],[x+.045,y+.020,z+.045],[x-.053,y+.017,z+.035]],belly);fpPoly(out,[[x-.06,y-.027,z],[x-.047,y+.030,z+.012],[x-.053,y+.017,z+.035]],dark);}
}
function buildTablePropsVertices(){
 const T=TABLE3D,verts=[],yy=T.y+.035;
 const cyl=(a,b,ra,rb,c,n=8)=>fpCylinder(verts,a,b,ra,rb,hexToRgb(c),n);
 if(state.restProps.beer&&propOnTable('beer')){
  const x=T.x-T.width*.34,z=T.z+.02;
  cyl([x,yy,z],[x,yy+.29,z],.085,.077,'#315b4b');
  cyl([x,yy+.29,z],[x,yy+.37,z],.076,.038,'#46715c');
  cyl([x,yy+.37,z],[x,yy+.51,z],.036,.034,'#284e42');
  cyl([x,yy+.51,z],[x,yy+.535,z],.043,.043,'#c1a66b');
  cyl([x,yy+.10,z],[x,yy+.22,z],.080,.078,'#d4c69a');
 }
 if(state.restProps.smoke){
  const x=T.x-T.width*.06,z=T.z+.005;
  cyl([x,yy,z],[x,yy+.027,z],.147,.144,'#61716a',10);
  cyl([x,yy+.028,z],[x,yy+.031,z],.109,.112,'#263c3b',10);
  if(propOnTable('smoke')){
   cyl([x-.055,yy+.045,z-.065],[x+.095,yy+.046,z-.065],.013,.013,'#ddd5c1',6);
   cyl([x+.086,yy+.046,z-.065],[x+.103,yy+.047,z-.065],.014,.014,'#bd7f57',6);
  }
 }
 if(state.restProps.sashimi){
  const x=T.x+T.width*.27,z=T.z+.005;
  cyl([x,yy,z],[x,yy+.024,z],.198,.202,'#e4dac1',12);
  cyl([x,yy+.024,z],[x,yy+.028,z],.162,.161,'#5a7770',12);
  const count=Math.min(6,state.sashimiPieces);
  for(let i=0;i<count;i++){
   const off=(i-2.5)*.055;
   fpPoly(verts,[[x+off-.033,yy+.035,z-.046],[x+off+.019,yy+.039,z-.052],[x+off+.035,yy+.048,z+.041],[x+off-.025,yy+.043,z+.047]],hexToRgb(i%2?'#e7b0a3':'#d8998a'));
  }
  if(propOnTable('sashimi')){
   cyl([x-.14,yy+.05,z+.125],[x+.12,yy+.053,z+.065],.006,.006,'#c5a46e',6);
   cyl([x-.13,yy+.06,z+.149],[x+.13,yy+.063,z+.088],.006,.006,'#e1c18c',6);
  }
 }
 return verts;
}
function drawTableProps(L,t){if(fallbackActive)return;const verts=buildTablePropsVertices();if(!verts.length)return;
 gl.enable(gl.DEPTH_TEST);gl.useProgram(objectProgram);gl.uniformMatrix4fv(U.obj.vp,false,viewProj);gl.uniform1f(U.obj.time,t);gl.uniform3fv(U.obj.light,L.light);gl.uniform3fv(U.obj.lightColor,L.lightColor);gl.uniform3fv(U.obj.ambient,L.ambient);gl.uniform3fv(U.obj.fogColor,L.fog);gl.uniform1f(U.obj.fog,L.fogStrength);gl.uniform1f(U.obj.night,L.night);gl.uniform1f(U.obj.ink,state.quality==='pixel'?.58:.14);
 gl.bindBuffer(gl.ARRAY_BUFFER,tablePropsBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);bindGeometry(tablePropsBuffer);gl.drawArrays(gl.TRIANGLES,0,verts.length/9);
}
function drawFirstPerson3D(L,t){if(fallbackActive||!state.restAction||state.restActionTime<=0||state.menu)return;
 const f=fpModelFrame();if(!f)return;const verts=[];if(f.k==='beer')fpBottle(verts,f);else if(f.k==='smoke')fpSmoke(verts,f);else fpSashimi(verts,f);
 if(!verts.length)return;const projection=projectMatrix((portrait?74:62)*PI/180,aspect,.065,10);
 gl.enable(gl.DEPTH_TEST);gl.clear(gl.DEPTH_BUFFER_BIT);gl.depthMask(true);gl.useProgram(objectProgram);gl.uniformMatrix4fv(U.obj.vp,false,projection);gl.uniform1f(U.obj.time,t);gl.uniform3fv(U.obj.light,[.28,.7,.82]);gl.uniform3fv(U.obj.lightColor,[.95,.87,.74]);gl.uniform3fv(U.obj.ambient,[.62,.68,.66]);gl.uniform3fv(U.obj.fogColor,[0,0,0]);gl.uniform1f(U.obj.fog,0);gl.uniform1f(U.obj.night,L.night);gl.uniform1f(U.obj.ink,state.quality==='pixel'?.67:.28);
 gl.bindBuffer(gl.ARRAY_BUFFER,fpBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.DYNAMIC_DRAW);bindGeometry(fpBuffer);gl.drawArrays(gl.TRIANGLES,0,verts.length/9);
}
function drawWorld(t){if(fallbackActive){drawFallback(t);return}const L=lighting();gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.07,.13,.18,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.useProgram(skyProgram);gl.uniform3fv(U.sky.top,L.top);gl.uniform3fv(U.sky.low,L.low);gl.uniform3fv(U.sky.sun,L.sun);gl.uniform1f(U.sky.day,L.day);gl.uniform1f(U.sky.time,t);gl.uniform1f(U.sky.cloud,L.cloud);gl.uniform1f(U.sky.rain,L.rainShader);gl.uniform1f(U.sky.flash,state.flash);gl.uniform1f(U.sky.sunX,L.sunX);gl.uniform1f(U.sky.sunY,L.sunY);if(!isWebGL2){gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);}gl.drawArrays(gl.TRIANGLES,0,3);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 gl.useProgram(waterProgram);gl.uniformMatrix4fv(U.water.vp,false,viewProj);gl.uniform1f(U.water.time,t);gl.uniform1f(U.water.wave,L.wave);gl.uniform3fv(U.water.color,L.water);gl.uniform3fv(U.water.fogColor,L.fog);gl.uniform3fv(U.water.sun,L.sun);gl.uniform1f(U.water.fog,L.fogStrength);gl.uniform1f(U.water.sunX,L.sunX);gl.uniform1f(U.water.day,L.day);gl.uniform1f(U.water.weather,L.rainShader);bindGeometry(waterBuffer);gl.drawArrays(gl.TRIANGLES,0,waterVertexCount);
 gl.useProgram(objectProgram);gl.uniform1f(U.obj.ink,state.quality==='pixel'?.53:.12);gl.uniformMatrix4fv(U.obj.vp,false,viewProj);gl.uniform1f(U.obj.time,t);gl.uniform3fv(U.obj.light,L.light);gl.uniform3fv(U.obj.lightColor,L.lightColor);gl.uniform3fv(U.obj.ambient,L.ambient);gl.uniform3fv(U.obj.fogColor,L.fog);gl.uniform1f(U.obj.fog,L.fogStrength);gl.uniform1f(U.obj.night,L.night);bindGeometry(sceneBuffer);gl.drawArrays(gl.TRIANGLES,0,sceneVertexCount);renderLowPolyFish(L,t);drawTableProps(L,t);drawFirstPerson3D(L,t);
 // weather and mist tint on world while keeping the water visible
 const wash=state.weather==='fog'?'rgba(224,230,222,.095)':state.weather==='storm'?'rgba(65,89,103,.09)':L.gold>.4?'rgba(255,181,107,.045)':'rgba(30,65,78,.035)';if(wash!==lastWash){$('colorWash').style.background=wash;lastWash=wash;}}
function resize(){const wasPortrait=portrait;vw=$('gameRoot').clientWidth;vh=$('gameRoot').clientHeight;aspect=vw/vh;portrait=aspect<.95;layoutWorldProps();if(wasPortrait!==portrait&&sceneBuffer)buildWorld();const scale=state.quality==='smooth'?(portrait?Math.min(1.4,720/vw):Math.min(1.1,1000/vw)):(portrait?Math.min(.70,380/vw):Math.min(.55,500/vw));canvas.width=Math.max(280,Math.round(vw*scale));canvas.height=Math.max(1,Math.round(canvas.width*vh/vw));const fxScale=state.quality==='smooth'?.75:Math.min(.62,560/vw);fx.width=Math.max(220,Math.round(vw*fxScale));fx.height=Math.max(1,Math.round(fx.width*vh/vw));const fbScale=state.quality==='smooth'?.7:.46;fallbackCanvas.width=Math.max(256,Math.round(vw*fbScale));fallbackCanvas.height=Math.max(1,Math.round(fallbackCanvas.width*vh/vw));fx.style.width=canvas.style.width='100%';fx.style.height=canvas.style.height='100%';canvas.style.imageRendering=fx.style.imageRendering=fallbackCanvas.style.imageRendering=state.quality==='smooth'?'auto':'pixelated';updateCamera();}

// If a device loses its graphics context, retain gameplay with a stylized across-the-river fallback.
function drawFallback(t){const p=fallpen,w=fallbackCanvas.width,h=fallbackCanvas.height,L=lighting(),skyY=h*.45;function color(arr){return rgbToHex(arr)}
 p.clearRect(0,0,w,h);let sky=p.createLinearGradient(0,0,0,skyY);sky.addColorStop(0,color(L.top));sky.addColorStop(1,color(L.low));p.fillStyle=sky;p.fillRect(0,0,w,skyY);
 // Distant hills run horizontally behind the OPPOSITE BANK, never side banks.
 for(let layer=0;layer<3;layer++){p.fillStyle=layer===0?'#627b7b':layer===1?'#536b68':'#4a6356';p.globalAlpha=.44+layer*.13;p.beginPath();p.moveTo(0,skyY+14);for(let x=0;x<=w+10;x+=7){const height=(20+layer*12)*(.48+.52*Math.abs(Math.sin(x*.022+layer*3.4)));p.lineTo(x,skyY-height+(layer*9));}p.lineTo(w,skyY+60);p.lineTo(0,skyY+60);p.closePath();p.fill();}p.globalAlpha=1;
 // A single horizontal opposite shore, with varied trees.
 const oppositeY=skyY+6;for(let i=0;i<55;i++){let x=i/54*w,seed=H(i*17.2),ht=(8+seed*23)*(portrait?1.12:1);p.fillStyle=i%3===0?'#50694e':'#66805d';p.fillRect(x-1,oppositeY-ht*.42,2,ht*.49);p.beginPath();p.moveTo(x-ht*.42,oppositeY-ht*.27);p.lineTo(x,oppositeY-ht*1.32);p.lineTo(x+ht*.46,oppositeY-ht*.27);p.closePath();p.fill();}
 p.fillStyle='#657b55';p.fillRect(0,oppositeY,w,h*.075);p.fillStyle='#a4a389';p.fillRect(0,oppositeY+h*.075,w,3);
 if(state.spot==='river'){const hx=w*.27,hy=oppositeY-18,size=portrait?20:28;p.fillStyle='#786c53';p.fillRect(hx,hy,size,size*.9);p.fillStyle='#564d47';p.beginPath();p.moveTo(hx-3,hy);p.lineTo(hx+size*.5,hy-size*.5);p.lineTo(hx+size+3,hy);p.fill();p.fillStyle='#f1c685';p.fillRect(hx+5,hy+9,5,5);}
 let water=p.createLinearGradient(0,oppositeY+h*.075,0,h);water.addColorStop(0,color(mixColor(L.water,L.low,.34)));water.addColorStop(.6,color(L.water));water.addColorStop(1,color(colorMul(L.water,.64)));p.fillStyle=water;p.fillRect(0,oppositeY+h*.075,w,h);
 // Narrow layered glints and long horizontal waves; no circular polka-dot texture.
 for(let i=0;i<130;i++){const yy=oppositeY+h*.075+H(i*11.42)*(h-oppositeY-h*.075),x=H(i*19)*w,flow=t*(state.spot==='sea'?6:3);const width=(5+H(i*23)*70)*(yy/h);p.globalAlpha=(.055+H(i*7)*.1)*(L.day*.7+.5);p.fillStyle='#e1e6d2';p.fillRect((x+flow*(i%2?1:-1)+w*3)%w,yy,width,.6+yy/h*1.7);}p.globalAlpha=1;
 const foregroundY=h*.88;p.fillStyle=state.spot==='sea'?'#63695f':'#5f7558';p.beginPath();p.moveTo(0,h);p.lineTo(0,foregroundY);for(let i=0;i<=32;i++){const x=i/32*w;p.lineTo(x,foregroundY+Math.sin(i*.77)*3);}p.lineTo(w,h);p.fill();
 for(let i=0;i<35;i++){const x=H(i*23)*w,y=foregroundY+H(i*13)*h*.1,ht=5+H(i*31)*26;p.strokeStyle=i%2?'#a8af70':'#6f8b60';p.lineWidth=1;p.beginPath();p.moveTo(x,y+ht);p.lineTo(x+Math.sin(t+i)*2,y);p.stroke();}
 if(state.weather==='fog'){p.fillStyle='rgba(216,226,215,.27)';p.fillRect(0,skyY*.8,w,h*.5);}if(state.weather==='storm'){p.fillStyle='rgba(15,32,45,.23)';p.fillRect(0,0,w,h);}
quantizeCanvas2D(p,w,h);}

// 2D-into-3D hybrid layer: depth-sorted WebGL world + crisp PS1-style foreground sprites and effects.
const OUTLINE_COL='rgba(10,17,19,.78)';
function fxLine(a,b,color,width=1){const outlined=state.quality==='pixel'||width>=2.4;pen.lineCap='round';pen.lineJoin='round';if(outlined){pen.strokeStyle=OUTLINE_COL;pen.lineWidth=width+2.2;pen.beginPath();pen.moveTo(a[0],a[1]);pen.lineTo(b[0],b[1]);pen.stroke();}pen.strokeStyle=color;pen.lineWidth=width;pen.beginPath();pen.moveTo(a[0],a[1]);pen.lineTo(b[0],b[1]);pen.stroke()}
function fxCircle(x,y,r,col,alpha=1){pen.globalAlpha=alpha;pen.fillStyle=col;pen.beginPath();pen.arc(x,y,r,0,TAU);pen.fill();if(state.quality==='pixel'||r>6){pen.strokeStyle=OUTLINE_COL;pen.lineWidth=Math.max(1,Math.min(3,r*.18));pen.stroke();}pen.globalAlpha=1}
function fxPoly(points,col){pen.fillStyle=col;pen.beginPath();pen.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))pen.lineTo(p[0],p[1]);pen.closePath();pen.fill();if(state.quality==='pixel'){pen.strokeStyle=OUTLINE_COL;pen.lineWidth=1.35;pen.stroke();}}
function drawFishSprite(x,y,size,fish,wobble=0){if(!fish)return;const kind=fishClass(fish.name),grade=fish.grade||0;
 const coat=grade===0?fish.tint:grade===1?'#c8dbeb':grade===2?'#e7c76b':grade===3?'#b4edf2':'#7ee8eb';
 const fin=grade===0?'#617a6d':grade===1?'#7891a1':grade===2?'#ae843d':grade===3?'#79aabc':'#438eab';
 const belly=grade===0?'#e3e6d0':grade===1?'#f0f6ff':grade===2?'#fff3b6':grade===3?'#ecffff':'#ecffff';
 const tall=kind==='deep'?1.42:kind==='flat'?.5:kind==='ribbon'?.19:kind==='needle'?.38:kind==='eel'?.43:kind==='salmon'?.96:kind==='slender'?.63:kind==='cat'?.82:1;
 const wide=kind==='ribbon'?1.88:kind==='needle'?1.77:kind==='eel'?1.6:kind==='slender'?1.30:kind==='salmon'?1.18:kind==='deep'?.91:kind==='flat'?1.28:1;
 pen.save();pen.translate(x,y);pen.rotate(Math.sin(state.sceneSeconds*3.1+wobble)*.10);pen.scale(size*wide,size*tall);
 let tail=Math.sin(state.sceneSeconds*(8+state.runIntensity*7)+wobble)*(4+state.runIntensity*3); const finFlap=Math.sin(state.sceneSeconds*13+wobble)*4;
 fxPoly([[-45,-4],[-29,-13],[-6,-20],[20,-16],[38,-7],[43,2],[28,15],[0,18],[-30,13],[-45,3]],coat);
 fxPoly([[31,-6],[50,-21+tail],[54,0],[50,20+tail],[32,9]],fin);
 fxPoly([[-12,-17],[1,kind==='spiny'?-35:-27],[14,-14]],fin);
 if(kind==='spiny'){for(let k=0;k<5;k++){let xx=-16+k*8;fxPoly([[xx,-17],[xx+4,-29-(k%2)*7],[xx+8,-17]],fin);}}
 if(kind==='eel'){fxPoly([[-21,-10],[17,-16],[34,-4]],fin);}if(kind==='ribbon'){fxPoly([[-29,-5],[-9,-14],[36,-5]],fin);}if(kind==='needle'){fxPoly([[5,-9],[16,-20],[25,-7]],fin);}
 if(kind==='flat'){fxPoly([[-38,-4],[-8,-24],[28,-8],[35,13],[-4,24],[-38,5]],coat);}
 fxPoly([[-12,11],[12,23+finFlap],[20,10]],fin);
 fxPoly([[-39,-2],[-18,-12],[16,-10],[30,-2],[-6,2]],belly);
 fxPoly([[-36,2],[-8,4],[24,3],[13,14],[-11,15]],fin);
 if(['bass','spiny','eel','slender','salmon','needle'].includes(kind)){for(let i=0;i<4;i++){let sx=-10+i*11;fxPoly([[sx,-9],[sx+3,-8],[sx+1,9],[sx-3,6]],'#526b62');}}
 if(kind==='cat'){fxLine([-42,0],[-60,-10],fin,1.5);fxLine([-42,4],[-60,15],fin,1.4);}
 if(kind==='deep'){fxPoly([[-14,-20],[5,-32],[25,-14]],fin);}
 fxCircle(-31,-6,3,'#15242a');fxCircle(-32,-7,1.05,'#fffdf1');fxLine([-42,7],[-33,9],'#34474a',1.2);
 if(grade){const shine=GRADES[grade].color;fxCircle(12,-14,2.7,shine,.83);fxCircle(35,-23,2.3,shine,.74);fxCircle(-42,20,1.8,shine,.6);}
 pen.restore();}

function waterBob(){
 const t=state.sceneSeconds;
 const swell=state.spot==='sea'?.09*Math.sin(t*1.3+state.baitX*.3)+.035*Math.sin(t*2.1):state.spot==='river'?.024*Math.sin(t*.7+state.baitZ*.2):.012*Math.sin(t*.34);
 return screenPoint([state.baitX,.13+swell,state.baitZ]);
}
function splash(x,y,count=20,accent='#e0f8ed'){count=Math.min(count,55);if(state.particles.length>150)state.particles.splice(0,state.particles.length-150);for(let i=0;i<count;i++)state.particles.push({x,y,vx:R(-110,110),vy:R(-160,-20),life:R(.4,1.1),max:1.1,size:R(1.3,4),color:i%3===0?accent:'#c8ebec'});for(let i=0;i<3;i++){if(state.ripples.length>=75)state.ripples.shift();state.ripples.push({x,y,r:5+i*6,life:1-i*.18})}}
function eventMsg(title,prefix='A MOMENT IN THE WATER',seconds=1.8){$('eventTitle').textContent=title;$('eventPrefix').textContent=prefix;$('eventBanner').classList.add('show');state.eventLeft=seconds;}
function restProgress(){return state.restAction&&state.restActionTime>0?clamp(1-state.restActionTime/state.restDuration,0,1):1;}
function propOnTable(k){if(state.restAction!==k||state.restActionTime<=0)return true;const p=restProgress(),m=REST_MOTION[k];return !m||p<m.pickup||p>=m.putdown;}
function drawShoreMoments(){
 // The WebGL world draws the actual 3D table and items. Only fallback needs perspective-projected 2D geometry.
 if(!fallbackActive)return;
 const T=TABLE3D,t=state.sceneSeconds;
 function worldPoly(points,col,stroke='#1b2927'){
  const arr=points.map(screenPoint);pen.fillStyle=col;pen.strokeStyle=stroke;pen.lineWidth=1.6;pen.beginPath();pen.moveTo(arr[0][0],arr[0][1]);for(let i=1;i<arr.length;i++)pen.lineTo(arr[i][0],arr[i][1]);pen.closePath();pen.fill();pen.stroke();
 }
 function worldLine(a,b,col,w=3){const x=screenPoint(a),y=screenPoint(b);fxLine(x,y,col,w);}
 const xl=T.x-T.width*.5,xr=T.x+T.width*.5,zf=T.z+T.depth*.5,zb=T.z-T.depth*.5,y=T.y;
 // Projection is recalculated from the real camera every frame: no screen-attached table.
 for(const xx of [T.x-T.width*.40,T.x+T.width*.40])for(const zz of [zf-.04,zb+.04]){
  worldLine([xx,.30,zz],[xx,y-.08,zz],'#554434',5);
 }
 worldPoly([[xl,y-.14,zf],[xr,y-.14,zf],[xr,y, zf],[xl,y,zf]],'#5e4937');
 worldPoly([[xl,y,zb],[xr,y,zb],[xr,y,zf],[xl,y,zf]],'#9c825e');
 for(let i=1;i<6;i++)worldLine([xl+(xr-xl)*i/6,y+.01,zb],[xl+(xr-xl)*i/6,y+.01,zf],'#65533e',1);
 if(state.restProps.beer&&propOnTable('beer')){
  const xx=T.x-T.width*.34,zz=T.z+.02;
  worldPoly([[xx-.08,y,zz],[xx+.08,y,zz],[xx+.067,y+.31,zz],[xx-.067,y+.31,zz]],'#37624f');
  worldPoly([[xx-.060,y+.3,zz],[xx+.061,y+.3,zz],[xx+.035,y+.51,zz],[xx-.035,y+.51,zz]],'#345746');
  worldPoly([[xx-.065,y+.12,zz],[xx+.065,y+.12,zz],[xx+.065,y+.22,zz],[xx-.065,y+.22,zz]],'#d1c09c');
 }
 if(state.restProps.smoke){
  const xx=T.x-T.width*.06,zz=T.z;
  worldPoly([[xx-.15,y+.015,zz-.075],[xx+.15,y+.015,zz-.075],[xx+.15,y+.015,zz+.075],[xx-.15,y+.015,zz+.075]],'#607873');
  if(propOnTable('smoke'))worldLine([xx-.11,y+.04,zz],[xx+.09,y+.042,zz],'#ece2cf',2);
  for(let i=0;i<3;i++){const p=screenPoint([xx+.11+Math.sin(t+i)*.02,y+.08+i*.10,zz]);fxCircle(p[0],p[1],3+i,'#d8e0d5',.11);}
 }
 if(state.restProps.sashimi){
  const xx=T.x+T.width*.27,zz=T.z;
  const base=Array.from({length:10},(_,i)=>[xx+Math.cos(i/10*TAU)*.20,y+.025,zz+Math.sin(i/10*TAU)*.14]);worldPoly(base,'#e4dcc7');
  const inner=Array.from({length:10},(_,i)=>[xx+Math.cos(i/10*TAU)*.17,y+.03,zz+Math.sin(i/10*TAU)*.11]);worldPoly(inner,'#668177');
  for(let i=0;i<Math.min(6,state.sashimiPieces);i++){const xx2=xx+(i-2.5)*.053;
   worldPoly([[xx2-.028,y+.04,zz-.025],[xx2+.018,y+.042,zz-.032],[xx2+.029,y+.042,zz+.025],[xx2-.021,y+.04,zz+.030]],i%2?'#d9998b':'#ecada0');}
  if(propOnTable('sashimi'))worldLine([xx-.14,y+.05,zz+.1],[xx+.13,y+.052,zz+.06],'#d6b782',2);
 }
 // Render a first-person arm reaching the projected table position, using the exact pose as WebGL.
 if(state.restActionTime<=0||!state.restAction)return;
 const f=fpModelFrame();if(!f)return;
 const projectView=(v)=>{let depth=Math.max(.18,-v[2]),F=1/Math.tan((portrait?74:62)*PI/360);return [vw*.5+v[0]*F*vh*.5/depth, vh*.5-v[1]*F*vh*.5/depth];};
 const tip=projectView([f.x,f.y,f.z]),shoulder=projectView(fpShoulder());
 const scale=clamp((portrait?1.23:1.65)/Math.max(.45,-f.z),.50,portrait?1.28:1.65),p=f.p;
 pen.save();pen.lineCap='round';pen.lineJoin='round';
 const armStart=[shoulder[0]+28,shoulder[1]+vh*.16],wrist=[tip[0]+12,tip[1]+8];
 const elbow=[lerp(armStart[0],wrist[0],.48)+14*scale,lerp(armStart[1],wrist[1],.53)+18*scale];
 fxLine(armStart,elbow,'#27363a',24*scale);fxLine(armStart,elbow,'#53695e',18*scale);
 fxLine(elbow,wrist,'#27363a',18*scale);fxLine(elbow,wrist,'#7e8270',12*scale);
 fxPoly([[tip[0]-13*scale,tip[1]+9*scale],[tip[0]-9*scale,tip[1]-10*scale],[tip[0]+5*scale,tip[1]-13*scale],[tip[0]+17*scale,tip[1]+9*scale]],'#d3af8c');
 if(f.holding){
  pen.save();pen.translate(tip[0],tip[1]);pen.rotate(-f.tilt*.32);pen.scale(scale,scale);
  if(f.k==='beer'){
   fxPoly([[-15,17],[15,17],[12,-37],[5,-56],[5,-72],[-5,-72],[-5,-56],[-12,-37]],'#30664e');
   fxPoly([[-12,-29],[12,-29],[12,-6],[-12,-6]],'#ddccae');fxPoly([[-5,-68],[0,-72],[3,-43],[-2,-45]],'#88ab88');
  }else if(f.k==='smoke'){
   fxLine([-2,-15],[21,-45],'#f4e7ce',3);fxLine([-2,-15],[3,-22],'#c9a57e',4);fxCircle(21,-45,2.3,p>.48&&p<.62?'#edaa65':'#785848');
  }else{
   fxLine([-9,-14],[25,-54],'#ddbf88',2);fxLine([-4,-11],[30,-51],'#c8a46d',2);
   if(p>=.365&&p<.635)fxPoly([[24,-51],[33,-58],[45,-50],[33,-43]],'#e6a299');
  }
  pen.restore();
 }
 pen.restore();
 // Smoke is emitted from the lip area only after the inhale is completed.
 if(f.k==='smoke'&&p>.60&&p<.83){const t=(p-.6)/.23;const mouth=[vw*.52,vh*.39];for(let i=0;i<9;i++){
  const q=(t+i*.11)%1,xx=mouth[0]+q*vw*.14+Math.sin(state.sceneSeconds*1.7+i)*7,yy=mouth[1]-q*vh*.21-i*2;
  pen.save();pen.globalAlpha=(1-q)*(.12+.07*Math.sin(t*12));pen.strokeStyle='#ecf0e4';pen.lineWidth=3.7+q*6;pen.beginPath();pen.arc(xx,yy,9+q*10,1.35,4.3);pen.stroke();pen.restore();
 }}
}
// First-person held-rod casting. When placed on the rest, the rod uses fixed 3D positions projected into screen space.
// Sequence: wind back (charging) -> fast release -> tip overshoot -> elastic recovery.
const castRig={points:[],phase:'',lastTip:null,lastBob:null};
const ease01=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
function poseMix(a,b,k){return a.map((v,i)=>lerp(v,b[i],k))}
function rodKeyframe(p){
 const ready=portrait?[.895,1.09,.545,.60]:[.865,1.08,.635,.65];
 const back=portrait?[.91,1.045,.82,.28]:[.895,1.045,.79,.29];
 const strength=ease01(clamp((state.power||0)*1.35,0,1));
 if(state.rodRested) return portrait?[.83,.78,.47,.40]:[.75,.88,.51,.49];
 if(state.phase==='charging')return poseMix(ready,back,ease01(clamp(state.power*1.35,0,1)));
 if(state.phase!=='flying')return ready;
 const keys=[
  [0,back],[.075,portrait?[.88,1.01,.81,.42]:[.87,1.015,.80,.40]],
  [.155,portrait?[.865,.99,.59,.43]:[.85,.99,.56,.40]],
  [.27,portrait?[.825,.97,.275,.21]:[.818,.964,.255,.17]],
  [.355,portrait?[.832,.985,.225,.18]:[.827,.987,.218,.165]],
  [.47,portrait?[.853,1.02,.375,.32]:[.845,1.02,.36,.30]],
  [.70,portrait?[.87,1.06,.54,.54]:[.855,1.06,.572,.565]],
  [1,ready]
 ];
 for(let i=0;i<keys.length-1;i++)if(p<=keys[i+1][0]){
  const k=ease01((p-keys[i][0])/(keys[i+1][0]-keys[i][0]));
  return poseMix(ready,poseMix(keys[i][1],keys[i+1][1],k),strength);
 }
 return ready;
}
function restedRodWorldPoints(){
 const x=ROD_STAND.x,z=ROD_STAND.z,g=ROD_STAND.ground;
 // Grip rests on the V-shaped stand; the tip extends out over the water.
 return {handle:[x+.25,g+.47,z+.65],ctrl:[x+.07,g+.92,z-1.65],tip:[x-.34,g+.91,z-6.10]};
}
function getRestedRodPose(){
 const q=restedRodWorldPoints();
 return {handle:screenPoint(q.handle),ctrl:screenPoint(q.ctrl),tip:screenPoint(q.tip),bend:0};
}
function drawRestStand2D(){
 // Additional grip cradle is projected from a fixed 3D coordinate, not attached to the viewport.
 const a=ROD_STAND,p0=[a.x,a.ground,a.z],top=[a.x,a.ground+.59,a.z];
 const L=w=>screenPoint(w);
 fxLine(L([a.x-.22,a.ground+.015,a.z+.20]),L(top),'#4c4c3d',2.2);
 fxLine(L([a.x+.22,a.ground+.015,a.z+.20]),L(top),'#726e51',2.2);
 fxLine(L(p0),L(top),'#aea17e',3.3);
 const cup=L(top);fxLine([cup[0]-6,cup[1]-5],[cup[0],cup[1]+1],'#cbb78f',2.4);fxLine([cup[0],cup[1]+1],[cup[0]+6,cup[1]-5],'#cbb78f',2.4);
}
function getRodPose(p=state.flight){
 if(state.rodRested)return getRestedRodPose();
 const v=rodKeyframe(p),tip=[v[2]*vw,v[3]*vh],handle=[v[0]*vw,v[1]*vh];
 const idle=state.rodRested?0:Math.sin(state.sceneSeconds*1.15)*1.6;
 tip[1]+=idle;
 const isFight=state.phase==='fight';
 const hook=Math.exp(-Math.max(0,state.strikeAge)*4.2),snap=hook*Math.sin(clamp(state.strikeAge/.28,0,1)*PI);
 const quiver=hook*Math.sin(state.strikeAge*137)*clamp(15*state.rodQuiver,0,15);
 const reelPulse=state.reelBlend*(Math.sin(state.sceneSeconds*18)*5.3+Math.sin(state.sceneSeconds*32)*1.9)+(state.phase==='retrieving'?Math.sin(state.sceneSeconds*27)*4:0);
 const slackFall=state.slackBlend*(8+Math.sin(state.sceneSeconds*2.5)*3.3);
 if(isFight){tip[0]-=vw*.095*snap + 3.5*state.reelBlend;tip[1]-=vh*.16*snap;tip[0]+=quiver*.53;tip[1]+=quiver*.45+reelPulse+slackFall;}
 const flex=rodSkin().flex;
 // The line must always load the blank while a fish is on; low UI tension is not a slack-looking rod.
 const tensionBend=isFight?(30+57*clamp(state.tension*.65+state.runIntensity*.48,.19,1)+(state.reeling?13:0))*flex*(portrait?.86:1):state.phase==='retrieving'?18*flex:0;
 const powerBend=state.phase==='charging'?-state.power*9:0;
 const releaseBend=state.phase==='flying'?Math.sin(clamp((p-.12)/.52,0,1)*PI)*17:0;
 tip[0]-=tensionBend*.62;
 tip[1]+=tensionBend*.49+powerBend+releaseBend+reelPulse;
 const bendQuiver=isFight?Math.sin(state.sceneSeconds*(11+state.runIntensity*8))*(1.7+state.runIntensity*3.8):0;
 tip[1]+=bendQuiver;
 const ctrl=[lerp(handle[0],tip[0],.53)+releaseBend*.48-tensionBend*.21,lerp(handle[1],tip[1],.53)+((state.phase==='flying')?-releaseBend*.78:-tensionBend*(.67+.13*state.runIntensity))-snap*vh*.035+bendQuiver*.55];
 return {tip,handle,ctrl,bend:tensionBend+releaseBend};
}
function rodPoint(pose,t){const a=1-t;return[a*a*pose.handle[0]+2*a*t*pose.ctrl[0]+t*t*pose.tip[0],a*a*pose.handle[1]+2*a*t*pose.ctrl[1]+t*t*pose.tip[1]]}
function drawRodStroke(pose,alpha=1,ghost=false){pen.save();pen.globalAlpha=alpha;pen.lineCap='round';pen.lineJoin='round';
 const trace=()=>{pen.beginPath();pen.moveTo(...pose.handle);pen.quadraticCurveTo(...pose.ctrl,...pose.tip)};
 const inStand=state.rodRested,skin=rodSkin(),r=inStand?.57:1;
 pen.strokeStyle=ghost?skin.highlight:'rgba(7,15,18,.96)';pen.lineWidth=(ghost?5.5:10)*r;trace();pen.stroke();
 pen.strokeStyle=ghost?skin.tip:skin.shaft;pen.lineWidth=(ghost?2.3:5.8)*r;trace();pen.stroke();
 if(!ghost){
  pen.strokeStyle=skin.highlight;pen.lineWidth=(inventory.rod==='bamboo'?2.2:1.65)*r;trace();pen.stroke();
  // The grip, segmented cane windings, carbon accents and luminous moon fittings remain rod-specific.
  for(let t=.05;t<.29;t+=.036){const q=rodPoint(pose,t),q2=rodPoint(pose,Math.min(1,t+.014));fxLine(q,q2,skin.grip,Math.max(1.3,3.8*r));}
  const guideT=inventory.rod==='bamboo'?[.28,.46,.64,.80,.91]:inventory.rod==='carbon'?[.29,.42,.56,.7,.82,.92]:[.25,.40,.56,.72,.87,.95];
  for(const t of guideT){const q=rodPoint(pose,t),q2=rodPoint(pose,Math.min(1,t+.01)),dx=q2[0]-q[0],dy=q2[1]-q[1],len=Math.hypot(dx,dy)||1;
   const nx=-dy/len,ny=dx/len,width=((inStand?1.6:3.1)*(1-t)+.9)*(inventory.rod==='carbon'?.78:1);
   fxLine([q[0]-nx*width,q[1]-ny*width],[q[0]+nx*width,q[1]+ny*width],skin.guide,Math.max(1.1,1.8*r));}
  if(inventory.rod==='bamboo'){for(const t of [.34,.52,.7,.86]){const q=rodPoint(pose,t);fxCircle(q[0],q[1],Math.max(1.1,2.5*r),'#cba76b',.86)}}
  if(inventory.rod==='graphite'){const q=rodPoint(pose,.34);fxCircle(q[0],q[1],2.4*r,'#68a7a3')}
  if(inventory.rod==='carbon'){for(const t of [.35,.38,.41]){const q=rodPoint(pose,t);fxCircle(q[0],q[1],Math.max(1.1,1.9*r),'#d4dedf')}}
  if(inventory.rod==='moon'){const q=rodPoint(pose,.89);fxCircle(q[0],q[1],Math.max(1.2,2.9*r),'#b7f0da',.9)}
 }
 pen.restore();}
function drawCastHands(pose){if(state.rodRested||state.restActionTime>0)return;
 const [hx,hy]=pose.handle;const [rx,ry]=rodPoint(pose,.24);
 const w=portrait?26:34,breath=Math.sin(state.sceneSeconds*1.9)*1.3;
 // Back arm rises from below right; wrist is attached to the moving grip.
 fxPoly([[vw+8,vh+70],[vw*.85,vh+80],[hx-18,hy+24],[hx-13,hy-14],[hx+14,hy-24],[hx+w,hy+12]],'#394f4d');
 fxPoly([[hx-18,hy+24],[hx-17,hy-8],[hx-1,hy-19],[hx+13,hy-14],[hx+16,hy+10],[hx+5,hy+28]],'#d1ae8d');
 fxPoly([[hx-5,hy-17],[hx+10,hy-15],[hx+16,hy-4],[hx+4,hy+3]],'#e1b89b');
 // Left supporting hand catches the moving reel during charging and on the follow-through.
 if(['charging','flying','fight','retrieving'].includes(state.phase)){
 const tx=rx+4-state.slackBlend*12,ty=ry+8+breath +state.reelBlend*Math.sin(state.reelRotation)*12+state.slackBlend*27,baseX=vw*(portrait?.66:.79),baseY=vh+35;
 fxPoly([[baseX-50,baseY],[baseX+50,baseY],[tx+14,ty+23],[tx-17,ty+24]],'#405454');
 fxPoly([[tx-18,ty+19],[tx-13,ty-8],[tx-1,ty-15],[tx+15,ty-7],[tx+19,ty+10],[tx+3,ty+27]],'#cba788');
 fxLine([tx-12,ty+1],[tx+4,ty+2],'rgba(101,74,60,.66)',1.5);
 }
}
function resetCastLine(){castRig.points=[];castRig.phase='';castRig.lastTip=null;castRig.lastBob=null;}
function simulateLine(start,end,dt,phase){const count=23;
 if(phase==='fight'||phase==='retrieving'){
  const bow=phase==='fight'?(Math.sin(state.sceneSeconds*17)*(.2+state.runIntensity*.95)):.4;
  const points=Array.from({length:count},(_,i)=>{
   const t=i/(count-1),micro=Math.sin(t*PI)*bow;
   return {x:lerp(start[0],end[0],t)+Math.sin(t*11+state.sceneSeconds*6)*micro*.3,y:lerp(start[1],end[1],t)+micro};
  });
  castRig.points=points;castRig.phase=phase;castRig.lastTip=[...start];castRig.lastBob=[...end];
  return points;
 }
 if(!castRig.points.length||castRig.phase!==phase||Math.hypot((castRig.lastTip?.[0]||start[0])-start[0],(castRig.lastTip?.[1]||start[1])-start[1])>vw*.22){
  castRig.points=Array.from({length:count},(_,i)=>{const t=i/(count-1),x=lerp(start[0],end[0],t),y=lerp(start[1],end[1],t)+Math.sin(PI*t)*8;return{x,y,oldX:x,oldY:y}});castRig.phase=phase;
 }
 const pts=castRig.points,n=pts.length,dist=Math.hypot(end[0]-start[0],end[1]-start[1]);
 const slack=phase==='fight'?(1+clamp((state.lineMeters-state.distance)/Math.max(1,state.distance),.006,.34)+state.slackBlend*.025):phase==='retrieving'?1.014:phase==='flying'?1.07:phase==='landed'?1.13:1.08;
 const segment=Math.max(1,dist*slack/(n-1));const wind=Math.sin(state.sceneSeconds*.93)*3+(phase==='fight'?Math.sin(state.sceneSeconds*35)*state.runIntensity*state.rodQuiver*4:0);
 const step=clamp(dt*60,0,2);
 for(let i=1;i<n-1;i++){
  const v=pts[i],vx=clamp((v.x-v.oldX)*.91,-22,22),vy=clamp((v.y-v.oldY)*.91,-22,22);
  v.oldX=v.x;v.oldY=v.y;
  v.x+=vx+wind*.003*step*step;
  v.y+=vy+(.32+(phase==='waiting'?.13:0))*step*step;
 }
 for(let k=0;k<10;k++){
  pts[0].x=start[0];pts[0].y=start[1];pts[n-1].x=end[0];pts[n-1].y=end[1];
  for(let i=0;i<n-1;i++){
   const a=pts[i],b=pts[i+1],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.0001;
   const error=(d-segment)/d,cx=dx*error*.5,cy=dy*error*.5;
   if(i!==0){a.x+=cx;a.y+=cy;}if(i+1!==n-1){b.x-=cx;b.y-=cy;}
  }
 }
 castRig.lastTip=[...start];castRig.lastBob=[...end];return pts;
}
function drawCastLine(pose,dt){const phase=state.phase;if(!['flying','waiting','bite','fight','landed','retrieving'].includes(phase)){resetCastLine();return;}
 let end=waterBob();const p=clamp(state.flight,0,1);
 if(phase==='flying'){
  const fire=clamp((p-.10)/.9,0,1),lead=getRodPose(.12).tip;
  const ease=1-Math.pow(1-fire,2.25);
  const launch=[lead[0],lead[1]],landing=waterBob();
  const gravityArc=Math.sin(fire*PI)*vh*(portrait?.20:.28);
  const lateralWind=Math.sin(state.sceneSeconds*.6)*Math.sin(fire*PI)*vw*.012;
  end=[lerp(launch[0],landing[0],ease)+lateralWind,lerp(launch[1],landing[1],ease)-gravityArc];
 }
 const hookWorld=(phase==='fight'||phase==='landed')?fishHookPoint():null;
 const mouth=hookWorld?screenPoint(hookWorld):null;
 if(phase==='landed'&&mouth)end=mouth;

 let pts=simulateLine(pose.tip,end,dt,phase);
 // Re-thread the working line through every guide ring; no independent screen-space string.
 const guides=[.22,.40,.59,.75,.87,.95].map(t=>rodPoint(pose,t));
 pen.save();pen.lineCap='round';pen.lineJoin='round';pen.strokeStyle=phase==='fight'?'rgba(255,236,186,.96)':phase==='retrieving'?'rgba(238,246,211,.9)':'rgba(239,247,227,.69)';pen.lineWidth=phase==='fight'?2:phase==='retrieving'?1.6:1.05;
 pen.beginPath();pen.moveTo(...rodPoint(pose,.23));for(const guide of guides)pen.lineTo(...guide);
 pen.lineTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)pen.lineTo(pts[i].x,pts[i].y);pen.stroke();
 if(phase==='fight'&&mouth){
  // The fine leader exits the surface float and terminates at the FISH'S MOUTH.
  fxLine(end,mouth,'rgba(230,244,222,.80)',1.25);
  fxCircle(mouth[0],mouth[1],1.8,'#e7d49b');
  // Tight anchored ripples where line enters the water.
  const shimmer=.17+.13*Math.sin(state.sceneSeconds*10);
  pen.save();pen.globalAlpha=.45;pen.strokeStyle='#dfebd2';pen.lineWidth=1.2;
  pen.beginPath();pen.ellipse(end[0],end[1]+3,5+shimmer*8,1.9+shimmer*3,0,0,TAU);pen.stroke();pen.restore();
 }
 if(phase==='landed'&&mouth){
  // Hook and lure sit at the top lip; float rides ABOVE, never through the body.
  const dx=pose.tip[0]-mouth[0],dy=pose.tip[1]-mouth[1],length=Math.hypot(dx,dy)||1;
  const bx=mouth[0]+dx/length*Math.min(34,length*.21),by=mouth[1]+dy/length*Math.min(34,length*.21);
  fxCircle(bx,by,4.6,'#c46e52');fxCircle(bx,by-2,2.0,'#f8e4b0');
  fxLine([mouth[0]-1,mouth[1]],[mouth[0]+4,mouth[1]+5],'#d3d3ba',1.25);
 }
 if(phase==='flying'){
  const start=Math.max(1,pts.length-7);
  for(let i=start;i<pts.length;i++){const q=pts[i];fxCircle(q.x,q.y,.9,'#f8edc5',clamp((i-start)/(pts.length-start)*.6,0,.6));}
  fxCircle(end[0],end[1],3.4,'#e7a266',.9);
 }
 if(['waiting','bite','fight','retrieving'].includes(phase)){
  const dip=phase==='bite'?Math.sin(state.sceneSeconds*15)*4:state.nibbleUntil>state.gameSeconds?Math.sin(state.sceneSeconds*28)*3.1:Math.sin(state.sceneSeconds*(state.spot==='sea'?4.6:2.4))*(state.spot==='sea'?3.0:1.7);
  const x=end[0],y=end[1]+dip;
  fxCircle(x,y,phase==='bite'?5.7:4.2,'#253b40');
  fxCircle(x,y-3.1,phase==='bite'?3.5:2.8,phase==='bite'?'#fff2ab':'#db8c6d');
  fxLine([x,y-5],[x,y-11],'#f3e9d9',1.6);
  if(phase==='fight'&&fallbackActive)drawFishSprite(x+Math.sin(state.sceneSeconds*8)*18,y+Math.cos(state.sceneSeconds*8)*5,.38,state.fish,2);
 }
 if(phase==='landed'&&state.landedFish&&fallbackActive&&mouth){
  const size=portrait?.47:.64;
  pen.save();pen.translate(mouth[0],mouth[1]);pen.rotate(PI/2+Math.sin(state.sceneSeconds*11)*.13);
  drawFishSprite(39*size,0,size,state.landedFish,.5);pen.restore();
 }
 pen.restore();
}
function drawRod(dt){const pose=getRodPose();
 if(state.rodRested){if(fallbackActive)drawRestStand2D();drawRodStroke(pose);drawCastLine(pose,dt);return;}
 // Speed ghosting makes the forward WHIP readable even at 30 fps / pixel resolution.
 if(state.phase==='flying'&&state.flight>.15&&state.flight<.56){for(const offset of [.13,.075]){
  const gp=getRodPose(Math.max(0,state.flight-offset));drawRodStroke(gp,.12+offset*.35,true);
 }}
 drawCastHands(pose);
 drawRodStroke(pose);
 const reel=rodPoint(pose,.235),skin=rodSkin(),reelRadius=inventory.rod==='moon'?12.5:inventory.rod==='carbon'?9.4:inventory.rod==='bamboo'?9.8:11;
 fxCircle(reel[0],reel[1],reelRadius,'#151f24');fxCircle(reel[0],reel[1],reelRadius-2.6,skin.reel);fxCircle(reel[0],reel[1],3.4,skin.grip);
 if(inventory.rod==='carbon'){for(let i=0;i<3;i++){const a=i*TAU/3;fxCircle(reel[0]+Math.cos(a)*5,reel[1]+Math.sin(a)*5,1.3,'#b1bdc1');}}
 if(inventory.rod==='moon')fxCircle(reel[0],reel[1],reelRadius+1.4,'#9fdcc9',.16);
 const spin=state.reelRotation;
 const dx=Math.cos(spin)*10,dy=Math.sin(spin)*10;
 fxLine([reel[0],reel[1]],[reel[0]+dx,reel[1]+dy],skin.spool,2.6);
 fxCircle(reel[0]+dx,reel[1]+dy,3,skin.highlight);
 drawCastLine(pose,dt);
}
function drawRipples(){for(const rip of state.ripples){pen.save();pen.globalAlpha=rip.life*.47;pen.strokeStyle='#e2f9f1';pen.lineWidth=Math.max(1,rip.life*2);pen.beginPath();pen.ellipse(rip.x,rip.y,rip.r*1.9,rip.r*.4,-.06,0,TAU);pen.stroke();pen.restore();}}
function drawRestContact(){
 if(state.restContactUntil<=state.gameSeconds||!state.restContactKind)return;
 const point=screenPoint(restAnchor(state.restContactKind));
 if(!Number.isFinite(point[0])||!Number.isFinite(point[1]))return;
 const life=clamp((state.restContactUntil-state.gameSeconds)/.36,0,1);
 pen.save();pen.globalAlpha=life*.32;pen.strokeStyle='#f2e0b3';pen.lineWidth=1.6;
 pen.beginPath();pen.ellipse(point[0],point[1]+4,(1-life)*10+3,(1-life)*3+1,0,0,TAU);pen.stroke();
 pen.restore();
}
function drawWetSurfaces(){if(!['rain','storm'].includes(state.weather))return;
 const w=state.weather==='storm'?1:.6,t=state.sceneSeconds,table=TABLE3D;
 pen.save();pen.globalAlpha=.10*w;pen.fillStyle='#dfe4c9';
 // Specular beads on table top, anchored to world-space corners.
 for(let i=0;i<12;i++){
  const x=table.x+(H(i*39.1)-.5)*table.width*.78,z=table.z+(H(i*22.7)-.5)*table.depth*.70;
  const q=screenPoint([x,table.y+.045,z]);
  if(q[0]>0&&q[0]<vw&&q[1]>0&&q[1]<vh)pen.fillRect(q[0],q[1],1+(i%3),.8);
 }
 pen.restore();
}
function drawRain(){const count=state.weather==='storm'?Math.floor(Math.min(180,vw*vh/3000)):state.weather==='rain'?Math.floor(Math.min(110,vw*vh/4700)):0;const t=state.sceneSeconds;for(let i=0;i<count;i++){let x=(H(i*13.4)*vw+(t*(state.weather==='storm'?145:65)))%vw,y=(H(i*2.72)*vh+(t*(state.weather==='storm'?530:360)))%vh;pen.strokeStyle=state.weather==='storm'?'rgba(210,233,247,.36)':'rgba(208,237,243,.27)';pen.lineWidth=1;pen.beginPath();pen.moveTo(x,y);pen.lineTo(x-2,y+11);pen.stroke();}}
function drawParticles(dt){for(let i=state.particles.length-1;i>=0;i--){let p=state.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=340*dt;p.life-=dt;if(p.life<=0){state.particles.splice(i,1);continue;}fxCircle(p.x,p.y,p.size,p.color,clamp(p.life/p.max,0,1))}for(let i=state.ripples.length-1;i>=0;i--){const q=state.ripples[i];q.r+=40*dt;q.life-=dt*.67;if(q.life<=0)state.ripples.splice(i,1)}}
// Rare wildlife events rather than a constant repeating flock: suitable for hours of fishing.
// Timers are in *play* seconds, so pausing or background throttling never causes a burst of birds.
const wildlife={river:null,sea:null,nextRiver:0,nextSea:0,region:null,drawn:0};
function resetWildlifeSchedule(){wildlife.region=state.spot;wildlife.river=null;wildlife.sea=null;wildlife.nextRiver=state.gameSeconds+R(100,260);wildlife.nextSea=state.gameSeconds+R(130,320);}
function wildlifeStep(){
 if(wildlife.region!==state.spot)resetWildlifeSchedule();
 if(!state.started||state.menu)return;
 const t=state.gameSeconds,storm=state.weather==='storm',night=state.time<5.5||state.time>19.5;
 if(state.spot==='river'&&!wildlife.river&&t>=wildlife.nextRiver){
  wildlife.nextRiver=t+R(390,790);if(!storm)wildlife.river={born:t,duration:R(48,72),z:R(-1.0,2.5),dir:1};
 }
 if(state.spot==='sea'&&!wildlife.sea&&t>=wildlife.nextSea){
  wildlife.nextSea=t+R(390,790);if(!storm&&!night)wildlife.sea={born:t,duration:R(32,48),dir:Math.random()<.5?-1:1,kind:Math.random()<.72?'gulls':'migrants'};
 }
 if(wildlife.river&&t-wildlife.river.born>wildlife.river.duration)wildlife.river=null;
 if(wildlife.sea&&t-wildlife.sea.born>wildlife.sea.duration)wildlife.sea=null;
}
function drawMallard(cx,cy,size,phase,drake){
 if(!Number.isFinite(cx+cy)||cx < -size*3||cx>vw+size*3||cy < -size*3||cy>vh+size*3)return;
 const w=size,h=size*.57;
 pen.save();pen.translate(cx,cy);pen.lineCap='round';pen.lineJoin='round';
 // Small aft wake and subtle bobbing make the three ducks appear to ride the current.
 pen.strokeStyle='#b4c3a8';pen.lineWidth=Math.max(.8,size*.065);pen.globalAlpha=.32;
 for(let i=0;i<2;i++){const a=size*(.65+i*.42);pen.beginPath();pen.ellipse(-a,h*.45,size*(.42+i*.16),h*(.15+i*.07),0,-.5,.75);pen.stroke()}
 pen.globalAlpha=1;
 pen.fillStyle=drake?'#755944':'#736751';pen.beginPath();pen.ellipse(0,0,w*.65,h*.63,-.07,0,Math.PI*2);pen.fill();
 pen.fillStyle=drake?'#637d69':'#8d7c5b';pen.beginPath();pen.ellipse(-w*.08,-h*.18,w*.43,h*.34,-.30,0,Math.PI*2);pen.fill();
 pen.fillStyle=drake?'#2f6552':'#8f7356';pen.beginPath();pen.ellipse(w*.51,-h*.50,w*.23,h*.40,.15,0,Math.PI*2);pen.fill();
 pen.fillStyle=drake?'#d7c49b':'#b5ab85';pen.fillRect(w*.36,-h*.36,w*.12,h*.09);
 pen.fillStyle='#cdb372';pen.beginPath();pen.moveTo(w*.69,-h*.56);pen.lineTo(w*.97,-h*.47);pen.lineTo(w*.69,-h*.38);pen.fill();
 pen.fillStyle='#26332e';pen.beginPath();pen.arc(w*.57,-h*.63,Math.max(.8,size*.035),0,Math.PI*2);pen.fill();
 pen.fillStyle='#3a4c42';pen.beginPath();pen.moveTo(-w*.54,-h*.09);pen.lineTo(-w*.84,-h*.40);pen.lineTo(-w*.64,h*.03);pen.fill();
 pen.restore();
}
function drawRareWildlife(){
 const event=wildlife.river,t=state.gameSeconds;
 if(state.spot==='river'&&event){const u=clamp((t-event.born)/event.duration,0,1),x=-9+u*18;
  for(let i=0;i<3;i++){
   const lag=[0,-.72,-1.45][i],offset=[0,.28,-.31][i];
   const wx=x+lag,wy=.10+Math.sin(t*1.8+i*1.3)*.024,wz=event.z+offset;
   const a=screenPoint([wx,wy,wz]),b=screenPoint([wx+.6,wy,wz]);
   const scale=clamp(Math.abs(b[0]-a[0])*.78,5.5,22);
   drawMallard(a[0],a[1],scale,t+i,i===0);
  }
 }
 const flock=wildlife.sea;
 if(state.spot==='sea'&&flock){const u=clamp((t-flock.born)/flock.duration,0,1),count=flock.kind==='gulls'?3:5;
  for(let i=0;i<count;i++){
   const behind=i*.055,travel=(u-behind)/(1-behind),dir=flock.dir;
   if(travel<0||travel>1)continue;
   const x=dir>0?vw*(-.08+travel*1.17):vw*(1.08-travel*1.17);
   const y=vh*(.19+.09*Math.sin(i*.8)+.018*Math.sin(t*.55+i));
   const wing=clamp(vw*.018,6,18)*(i%2?.83:1.05),flap=Math.sin(t*3.1+i*1.3)*(flock.kind==='gulls'?.3:.62);
   pen.save();pen.translate(x,y);pen.scale(dir,1);pen.strokeStyle='#e8e4d3';pen.lineWidth=clamp(wing*.17,1.2,2.4);pen.lineCap='round';pen.lineJoin='round';
   pen.beginPath();pen.moveTo(-wing,-wing*(.30+flap*.45));pen.quadraticCurveTo(-wing*.45,wing*.07,0,0);pen.quadraticCurveTo(wing*.43,wing*.03,wing,-wing*(.30+flap*.45));pen.stroke();
   pen.strokeStyle='#354c51';pen.lineWidth=Math.max(.7,wing*.06);pen.beginPath();pen.moveTo(-wing*.45,wing*.11);pen.lineTo(wing*.45,wing*.11);pen.stroke();pen.restore();
  }
 }
}
function drawFlyingLife(){const t=state.sceneSeconds;
 // Keep only a few nearly invisible night insects; daylight birds come from rare flock events.
 if(state.weather==='storm'||state.weather==='rain'||(state.time>=5.5&&state.time<=19.5))return;
 for(let i=0;i<7;i++){const x=vw*(.15+H(i*31)*.7)+Math.sin(t*.4+i)*10,y=vh*(.35+H(i*7)*.28)+Math.sin(t*.8+i*3)*6;
 fxCircle(x,y,1.2,'#dcf1bb',.10+.11*Math.sin(t*2+i*6));}
}
function drawAtmosphericGlints(){
 const t=state.sceneSeconds,day=state.time>=6&&state.time<19.5,golden=Math.max(0,1-Math.abs(state.time-18.0)/2.2),dawn=Math.max(0,1-Math.abs(state.time-6.3)/1.7);const glow=Math.max(golden,dawn)* (state.weather==='clear'?1:state.weather==='cloud'?.43:.2);
 if(glow>.05){pen.save();const x=vw*(.40+.04*Math.sin(t*.015)),y=vh*.29,r=vw*(portrait?.30:.18);const grad=pen.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,`rgba(255,211,137,${glow*.11})`);grad.addColorStop(1,'rgba(255,211,137,0)');pen.fillStyle=grad;pen.fillRect(x-r,y-r,r*2,r*2);pen.restore();}
 if(state.rodRested&&state.restProps.beer&&propOnTable('beer')&&day){const px=portrait?vw*.14:vw*.42,py=vh*(portrait?.72:.79);fxCircle(px,py,2.3,'#ffedae',.22+.15*Math.sin(t*1.4));}
 const count=state.weather==='storm'||state.weather==='rain'?0:state.weather==='fog'?10:7;for(let i=0;i<count;i++){
 const x=vw*(.12+H(i*7)*.75)+Math.sin(t*.18+i*3)*8,y=vh*(.53+H(i*11)*.19)+Math.sin(t*.31+i)*5;
 fxCircle(x,y,1+(i%3)*.5,day?'#f7e5bb':'#c8e1b2',day?glow*(.045+H(i)*.1):(.12+.07*Math.sin(t+i)));}
}
function drawBreathEffects(){if(!state.restAction||state.restActionTime<=0||state.menu)return;
 const progress=1-state.restActionTime/state.restDuration,t=state.sceneSeconds;
 if(state.restAction==='smoke'){
  const inhale=fpSmooth((progress-.40)/.12)*(1-fpSmooth((progress-.61)/.05));
  const exhale=fpSmooth((progress-.68)/.12)*(1-fpSmooth((progress-.94)/.09));
  if(exhale>.015){pen.save();for(let i=0;i<11;i++){const u=(i/11+((t*.11)%1))%1,px=vw*(.46+Math.sin(t*1.2+i*2)*.025+u*.08),py=vh*(.42-u*.16+Math.sin(t+i)*.008);pen.globalAlpha=exhale*(.10+.15*(1-u));pen.fillStyle='#e7e9dc';pen.beginPath();pen.ellipse(px,py,7+u*25,3.5+u*14,.13,0,TAU);pen.fill();}pen.restore();}
  // The glowing ember is at the cigarette's distal tip (not the filter).
  if(inhale>.02)fxCircle(vw*.57,vh*.40,2.4,'#ffb974',.10+inhale*.16);
 }
 if(state.restAction==='beer'){
  const sip=fpSmooth((progress-.48)/.10)*(1-fpSmooth((progress-.72)/.06));
  if(sip>.02){for(let i=0;i<3;i++){const px=vw*(.51+Math.sin(t*12+i*2)*.006),py=vh*(.53+i*.014);fxCircle(px,py,1.6+i*.4,'#fff2c1',sip*(.13-i*.022));}}
 }
}
function drawPixelPass(){if(state.quality!=='pixel')return;pen.save();for(let y=0;y<vh;y+=4){pen.fillStyle=(Math.floor(y/4)%2===0)?'rgba(9,17,18,.07)':'rgba(255,240,205,.018)';pen.fillRect(0,y,vw,2);}for(let x=0;x<vw;x+=5){pen.fillStyle='rgba(4,8,9,.03)';pen.fillRect(x,0,1,vh);}for(let i=0;i<45;i++){const x=(H(i*91.7+state.sceneSeconds*.2)*vw)|0,y=(H(i*47.3+state.sceneSeconds*.3)*vh)|0;pen.fillStyle=(i%3===0)?'rgba(255,255,255,.028)':'rgba(5,9,10,.028)';pen.fillRect(x,y,3,3);}pen.restore()}
// One fish-surface impulse generates a synchronized burst of spray, ring wake, foam and audio.
function fishSurfaceImpulse(strength=0.5){
 const [x,y]=waterBob();if(!Number.isFinite(x)||!Number.isFinite(y))return;
 const force=clamp(strength,.1,1.35),near=1-clamp(state.distance/40,0,1);
 const size=clamp(.6+near*.8,.65,1.35);
 splash(x,y,Math.floor((5+force*14)*size),force>.75?'#f7f1d7':'#d6eaf0');
 emitFoam(Math.round(6+force*13),force);
 for(let i=0;i<2;i++)state.ripples.push({x:x+R(-5,5),y:y+R(-2.5,2.5),r:2+i*5+force*3,life:.78+i*.14});
 state.particles=state.particles.slice(-235);
 playWaterSplash(force,x);
 state.splashSoundCount++;
}
function emitFoam(amount=3,force=0){const pos=waterBob();if(!Number.isFinite(pos[0])||!Number.isFinite(pos[1]))return;for(let i=0;i<amount;i++){if(state.foam.length>165)state.foam.shift();state.foam.push({x:pos[0]+(Math.random()-.5)*(12+force*22),y:pos[1]+(Math.random()-.5)*(6+force*10),vx:(Math.random()-.5)*17,vy:-(Math.random()*7+2),life:.35+Math.random()*.65,max:1,r:1+Math.random()*2.8});}}
function drawFoam(dt){for(let i=state.foam.length-1;i>=0;i--){const b=state.foam[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(b.life<=0){state.foam.splice(i,1);continue;}const a=.27+.5*b.life/b.max;pen.save();pen.globalAlpha=a;pen.strokeStyle='#f4f0d9';pen.lineWidth=1.5;pen.beginPath();pen.ellipse(b.x,b.y,b.r*1.4,b.r*.67,0,0,TAU);pen.stroke();pen.restore();}}
let effectFrameCount=0;
function drawEffects(dt){effectFrameCount++;pen.setTransform(1,0,0,1,0,0);pen.clearRect(0,0,fx.width,fx.height);const sx=fx.width/vw,sy=fx.height/vh;pen.scale(sx,sy);pen.save();if(state.shake>0)pen.translate(R(-state.shake,state.shake),R(-state.shake,state.shake));drawRipples();drawFoam(dt);drawRareWildlife();drawFlyingLife();drawAtmosphericGlints();drawShoreMoments();drawRod(dt);drawBreathEffects();drawRestContact();drawWetSurfaces();drawRain();drawParticles(dt);pen.restore();if(state.flash>0){pen.globalAlpha=state.flash*.2;pen.fillStyle='#fff5de';pen.fillRect(0,0,vw,vh);pen.globalAlpha=1}if(state.perfFrameCost<42||effectFrameCount%2===0)quantizeCanvas2D(pen,fx.width,fx.height)}
function setTimeLabel(){let h=Math.floor(state.time)%24,m=Math.floor((state.time%1)*60);let val=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;$('timeChip').textContent=val;$('menuTime').textContent=val;$('timeSlider').value=state.time}
function refreshHUD(){const s=state,p=s.phase;forecastUI();$('waitClock').hidden=p!=='waiting';if(p==='waiting')$('waitClock').textContent='대기 '+elapsedLabel(s.waiting);$('gameRoot').classList.toggle('waiting',p==='waiting');$('gameRoot').classList.toggle('retrieving',p==='retrieving');$('gameRoot').classList.toggle('canRetrieve',p==='waiting'||p==='bite');$('gameRoot').classList.toggle('resting',!!s.rodRested);$('gameRoot').classList.toggle('restPerforming',!!s.restAction&&s.restActionTime>0);$('gameRoot').classList.toggle('fighting',p==='fight');$('gameRoot').classList.toggle('landed',p==='landed');$('gameRoot').classList.toggle('biting',p==='bite');$('weatherIcon').textContent=WEATHER[s.weather].icon;$('weatherChip').textContent=WEATHER[s.weather].ko;$('spotSub').textContent=DATA[s.spot].eng;$('conditionLine').textContent=DATA[s.spot].desc;const activeFight=p==='fight';$('fightHud').hidden=!activeFight;$('liftButton').disabled=!activeFight||!!state.menu;const btn=$('actionButton');btn.disabled=!!state.menu||p==='retrieving';const labels={retrieving:['↶','회수 중','REELING'],idle:['↗','던지기','HOLD'],charging:['✦','던지는 중','RELEASE'],flying:['↗','캐스팅 중','···'],waiting:['⌛','기다리는 중','WAIT'],bite:['!','챔질!','TAP'],fight:['↻','릴링','HOLD'],landed:['✦','잡았다!','RESULT'],lost:['↗','다시 던지기','HOLD']};const a=labels[p];$('actionIcon').textContent=a[0];$('actionLabel').textContent=a[1];$('actionSub').textContent=a[2];$('actionButton').style.opacity=(p==='flying'||p==='waiting'||p==='landed')?.65:1;
const status={retrieving:['RETRIEVING / LINE IN','조용히 줄을 감는 중입니다.','찌가 가까워지면 다시 캐스팅할 수 있어요.'],idle:['FIELD NOTE / READY','물가에 낚싯대를 드리워볼까요.','입질이 오기까지 오래 걸릴 수도 있어요.'],charging:['CASTING / CHARGE','서서히 힘을 모으는 중','손을 떼면 미끼가 날아갑니다.'],flying:['CASTING / IN AIR','미끼가 물을 향해 날아갑니다.','잔잔한 수면 위에 던져 보세요.'],waiting:['WAITING / TIME','가끔은 기다림이 더 좋습니다.','시간·날씨·조황에 따라 입질이 달라집니다.'],bite:['BITE / STRIKE NOW','찌가 흔들립니다!','지금 챔질 버튼을 눌러주세요.'],fight:['FIGHT / TENSION','줄이 팽팽해집니다.','릴 감기엔 짧고 강한 진동, 줄 풀기엔 느슨한 복원. 장력을 관리하세요.'],landed:['LANDED / THE MOMENT','물고기가 낚싯줄에 매달려 있습니다.','보관 또는 방생을 선택해야 합니다.'],lost:['ESCAPED / TRY AGAIN','물고기가 빠져나갔습니다.','다시 조용히 낚싯대를 드리워보세요.']}[p];$('statusEyebrow').textContent=p==='waiting'?`WAITING / ${String(Math.floor(s.waiting/60)).padStart(2,'0')}:${String(Math.floor(s.waiting%60)).padStart(2,'0')}`:status[0];$('statusTitle').textContent=status[1];$('statusDescription').textContent=status[2];$('castPower').classList.toggle('show',p==='charging');$('powerPercent').textContent=Math.round(s.power*100)+'%';$('chargeFill').style.width=(s.power*100)+'%';if(activeFight&&s.fish){$('fishFightName').textContent=s.fish.name;$('fishRunState').textContent=s.fishMood;$('distanceLabel').textContent=s.distance.toFixed(1)+' m';$('energyFill').style.width=(s.energy*100)+'%';$('energyPct').textContent=Math.round(s.energy*100)+'%';$('tensionFill').style.width=(s.tension*100)+'%';$('tensionPct').textContent=Math.round(s.tension*100)+'%';$('tensionFill').style.background=s.tension>.8?'linear-gradient(90deg,#edb46f,#e46255)':s.tension>.62?'linear-gradient(90deg,#d6ae68,#f4c170)':'linear-gradient(90deg,#7e9b86,#dec88e)';}
 $('bagCount').textContent=inventory.fish.length; $('rodStandButton').classList.toggle('active',!!state.rodRested);$('rodStandButton').setAttribute('aria-pressed',String(!!state.rodRested));$('rodStandButton').querySelector('span').textContent=state.rodRested?'대 들기':'거치대';updateRestButtons();$('soundLabel').textContent=state.soundOn?'AMBIENCE ON':'AMBIENCE OFF';$('soundIcon').textContent=state.soundOn?'♫':'♪';}
let inventorySort='new',boardFilter='all';
function drawInventory(){const items=inventory.fish.slice().map(ensureFishID);if(inventorySort==='rare')items.sort((a,b)=>b.score-a.score);if(inventorySort==='value')items.sort((a,b)=>b.price-a.price);$('inventoryCount').textContent=items.length;$('inventoryMoney').textContent=money(inventory.money);
 $('inventoryList').innerHTML=items.length?items.slice(0,100).map(f=>`<div class="inventoryCard"><div><strong style="color:${GRADES[f.grade].color}">${f.grade?GRADES[f.grade].label+' ':''}${escapeHTML(f.name)}</strong><small>${f.length} cm · ${f.weight.toFixed(2)} kg · ${DATA[f.spot]?.ko||'강'} · 희귀도 ${f.score.toLocaleString()} pts</small></div><button class="sellBtn" data-sell="${escapeHTML(f.id)}">판매 ${money(f.price)}</button></div>`).join(''):'<div class="inventoryEmpty">아직 보관한 물고기가 없습니다.</div>'; $('sellAllButton').disabled=!items.length;}
function sellFish(id){const idx=inventory.fish.findIndex(x=>x.id===id);if(idx<0)return;const f=inventory.fish.splice(idx,1)[0];inventory.money+=f.price;const rec=inventory.records.find(x=>x.id===id);if(rec)rec.status='sold';save();drawInventory();renderShop();eventMsg('판매 완료','MARKET / '+money(f.price),1.3);refreshHUD();}
function sellAllFish(){if(!inventory.fish.length)return;const total=inventory.fish.reduce((s,f)=>s+f.price,0);for(const f of inventory.fish){const rec=inventory.records.find(x=>x.id===f.id);if(rec)rec.status='sold';}inventory.fish=[];inventory.money+=total;save();drawInventory();renderShop();refreshHUD();eventMsg('일괄 판매 완료','MARKET / '+money(total),1.6);}
function renderShop(){if(!$('shopMoney'))return;$('shopMoney').textContent=money(inventory.money);$('rodShopList').innerHTML=Object.entries(RODS).map(([key,rod])=>{const owned=inventory.rods.includes(key),equipped=inventory.rod===key;return `<div class="storeCard ${owned?'owned':''}"><span class="rodShopPreview rodShopPreview-${key}" aria-hidden="true"><i></i><b></b></span><div><strong>${rod.name}</strong><p>${rod.desc}</p><small>${owned?'보유 중':money(rod.price)}</small></div><button data-buy-rod="${key}" ${equipped?'disabled':''}>${equipped?'장착 중':owned?'장착':'구매'}</button></div>`}).join('');$('baitShopList').innerHTML=Object.entries(BAITS).map(([key,b])=>{const available=key==='worm'||(inventory.baitStock[key]||0)>0;return `<div class="storeCard ${state.bait===key?'owned':''}"><div><strong>${b.name}</strong><p>${b.desc}</p><small>재고 ${baitInventoryLabel(key)} · ${key==='worm'?'무료':money(b.price)}</small></div><button data-buy-bait="${key}" ${key==='worm'&&state.bait==='worm'?'disabled':''}>${key==='worm'?'선택':available&&state.bait!==key?'선택':key!=='worm'?'구매 ×3':'선택'}</button></div>`}).join('');}
function buyRod(key){const rod=RODS[key];if(!rod)return;if(!inventory.rods.includes(key)){if(inventory.money<rod.price){eventMsg('돈이 부족합니다','NEED '+money(rod.price),1.4);return;}inventory.money-=rod.price;inventory.rods.push(key);sfx('catch');}inventory.rod=key;save();renderShop();refreshHUD();eventMsg(rod.name,'EQUIPPED',1.3);}
function buyBait(key){const bait=BAITS[key];if(!bait)return;if(key==='worm'||(inventory.baitStock[key]||0)>0&&state.bait!==key){state.bait=key;applyBaitValue();persistSettings();renderShop();eventMsg(bait.name+' 선택','TACKLE',1.1);return;}if(inventory.money<bait.price){eventMsg('돈이 부족합니다','NEED '+money(bait.price),1.4);return;}inventory.money-=bait.price;inventory.baitStock[key]=(inventory.baitStock[key]||0)+bait.count;state.bait=key;applyBaitValue();save();persistSettings();renderShop();eventMsg(bait.name+' ×'+bait.count,'PURCHASED',1.3);}
function renderLeaderboard(){const rows=inventory.records.filter(f=>boardFilter==='all'||f.spot===boardFilter).sort((a,b)=>fishScore(b)-fishScore(a));$('leaderboardList').innerHTML=rows.length?rows.slice(0,60).map((f,i)=>{const score=fishScore(f),species=SPECIES_RARITY[f.name]||2,grade=GRADES[f.grade]||GRADES[0],status=f.status==='sold'?'판매':f.status==='released'?'방생':'보관';return `<article class="rankRow"><div class="rankNumber">${String(i+1).padStart(2,'0')}</div><div class="rankMeta"><strong style="color:${grade.color}">${grade.label} ${escapeHTML(f.name)}</strong><p>${f.length}cm · ${Number(f.weight).toFixed(2)}kg · ${DATA[f.spot]?.ko||'?'} · 어종 희귀도 ${species}/5</p><small>${status} · ${f.when?new Date(f.when).toLocaleDateString('ko-KR'):'이전 기록'}</small></div><div class="rankScore">${score.toLocaleString()}<small>PTS</small></div></article>`}).join(''):'<div class="inventoryEmpty">아직 기록이 없습니다. 첫 물고기를 만나보세요.</div>';}

function openMenu(type='pause'){persistSettings();state.menu=type;state.reeling=state.lifting=false;$('overlay').classList.add('open');$('overlay').setAttribute('aria-hidden','false');$('panelHeading').textContent=({inventory:'KEEPER LOG',shop:'TACKLE SHOP',leaderboard:'TROPHY BOARD',pause:'PAUSED'})[type]||'PAUSED';$('pauseContent').hidden=type!=='pause';$('inventoryContent').hidden=type!=='inventory';$('shopContent').hidden=type!=='shop';$('leaderboardContent').hidden=type!=='leaderboard';if(type==='inventory')drawInventory();if(type==='shop')renderShop();if(type==='leaderboard')renderLeaderboard();refreshHUD()}
function closeMenu(){state.menu=null;$('overlay').classList.remove('open');$('overlay').setAttribute('aria-hidden','true');refreshHUD()}
function setSpot(spot){state.spot=spot;ambientBridge('location',{spot});persistSettings();state.phase='idle';state.rodRested=false;state.restAction='';state.fish=null;state.landingAge=0;state.landingRevealed=false;state.landedFish=null;state.reeling=state.lifting=false;state.dayLuck=Math.random();state.baitX=0;state.baitZ=-16;state.waiting=0;state.biteHazard=0;state.ripples=[];state.particles=[];buildWorld();document.querySelectorAll('.placeTile').forEach(b=>b.classList.toggle('active',b.dataset.place===spot));refreshHUD();updateAudio();}
function selectFish(){const pool=DATA[state.spot].fish;let weights=pool.map((f,i)=>{let w=f[1];if(state.activeBait==='lure'&&(i===0||i===3))w*=1.7;if(state.spot==='sea'&&state.activeBait==='shrimp'&&i===1)w*=1.85;if(state.activeBait==='glow'&&i===0)w*=1.5;
 const dusk=state.time>=16.5&&state.time<19.7,dawn=state.time>=5&&state.time<8.5,night=state.time>=20||state.time<5.3;
 if(['메기','가물치','우럭'].includes(f[0]))w*=night?1.8:1;
 if(['쏘가리','농어','배스'].includes(f[0]))w*=(dawn||dusk)?1.55:1;
 if(['붕어','잉어','피라미'].includes(f[0]))w*=state.weather==='cloud'?.95:state.weather==='rain'?1.25:1;
 if(['참돔','고등어'].includes(f[0]))w*=state.weather==='storm'?.62:state.weather==='clear'?1.2:1;
 return w});let n=Math.random()*weights.reduce((a,b)=>a+b,0),idx=0;for(let i=0;i<weights.length;i++){n-=weights[i];if(n<=0){idx=i;break;}}const f=pool[idx],rng=Math.pow(Math.random(),1.31),weight=f[2]+(f[3]-f[2])*rng,len=Math.round(f[6]+(f[7]-f[6])*rng),q=Math.max(0,Math.random()-(BAITS[state.activeBait]?.rarity||0));let grade=q<.001?4:q<.008?3:q<.035?2:q<.13?1:0;return{name:f[0],spot:state.spot,weight,length:len,grade,price:Math.round((f[4]*Math.pow(weight,1.1)*GRADES[grade].factor)/10)*10,tint:f[5]};}
// Real-time bite window: 10 minutes minimum, usually within 90 minutes, two-hour safety limit.
// Weibull cumulative hazard preserves weather/time/bait/luck adjustments as time passes.
const BITE_MODES={festival:[5,20],arcade:[10,60],relaxed:[20,180],reality:null};
const BITE_MIN_SECONDS=10*60;
const BITE_MAX_SECONDS=2*60*60;
const BITE_WEIBULL_SCALE=40*60;
const BITE_WEIBULL_SHAPE=1.5;
function startBiteWait(){
 state.waiting=0;state.biteHazard=0;
 state.biteThreshold=-Math.log(Math.max(1e-12,Math.random()));
 state.quickBiteAt=0; // removed the old 6-75 second surprise bite
 const range=BITE_MODES[state.biteMode];state.biteTarget=range?range[0]+Math.random()*(range[1]-range[0]):0;
 state.nibbleClock=0;state.nibbleNext=R(state.biteMode==='reality'?60:25,state.biteMode==='reality'?115:60);state.nibbleUntil=0;state.waitWallClock=performance.now();
}
function biteRate(){
 const dawn=(state.time>=5.5&&state.time<=8.5),dusk=(state.time>=16.4&&state.time<=19.5);
 const timeFactor=(dawn||dusk)?1.8:(state.time>=22||state.time<4)?.70:1;
 const weatherFactor=1/(WEATHER[state.weather].bit||1);
 const baitFactor=1/(BAITS[state.activeBait]?.bite||1);
 const luckFactor=state.dayLuck>.83?1.75:state.dayLuck>.62?1.20:state.dayLuck<.29?.52:1;
 const spotFactor=state.spot==='sea'?1.13:state.spot==='lake'?.88:1;
 // Normalize modifiers. The clock below applies this to the age-dependent hazard.
 return Math.max(.18,Math.min(3.8,timeFactor*weatherFactor*baitFactor*luckFactor*spotFactor));
}
function advanceBiteClock(realElapsed){
 const seconds=Math.max(0,Math.min(realElapsed,172800));
 const previous=state.waiting;
 state.waiting+=seconds;
 if(state.test)return state.waiting>=5; // explicit developer fast-bite toggle only
 if(BITE_MODES[state.biteMode])return state.waiting>=state.biteTarget;
 if(state.waiting>=BITE_MAX_SECONDS)return true; // cannot run past 2h
 if(state.waiting<=BITE_MIN_SECONDS)return false;
 // Integrate an age-dependent hazard exactly over this interval to handle sleeping tabs.
 const from=Math.max(0,previous-BITE_MIN_SECONDS)/BITE_WEIBULL_SCALE;
 const to=(state.waiting-BITE_MIN_SECONDS)/BITE_WEIBULL_SCALE;
 const hazardStep=(Math.pow(to,BITE_WEIBULL_SHAPE)-Math.pow(from,BITE_WEIBULL_SHAPE))*biteRate();
 state.biteHazard+=hazardStep;
 return state.biteHazard>=state.biteThreshold;
}
function elapsedLabel(seconds){let h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),sec=Math.floor(seconds%60);return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}

function doStartCharge(){if(state.menu||!['idle','lost'].includes(state.phase))return;state.rodRested=false;state.restAction='';state.phase='charging';state.waiting=0;state.biteHazard=0;state.castStart=performance.now();state.power=0;resetCastLine();eventMsg('던질 준비','CASTING',.75);sfx('castStart');refreshHUD()}
function doCast(){if(state.phase!=='charging')return;state.power=clamp((performance.now()-state.castStart)/1400,.18,1);state.activeBait=state.bait; if(state.bait!=='worm'){if(!(inventory.baitStock[state.bait]>0)){state.bait='worm';applyBaitValue();}else{inventory.baitStock[state.bait]--;if(inventory.baitStock[state.bait]<=0){state.bait='worm';applyBaitValue();}save();}}state.phase='flying';state.flight=0;state.castWhoosh=false;resetCastLine();state.baitX=R(-5,5);state.baitZ=-10-state.power*17*equippedRod().cast;state.shake=2;sfx('cast');refreshHUD()}
function retrieveLine(){
 if(!state.started||state.menu||!['waiting','bite'].includes(state.phase))return false;
 state.retrieveFromX=state.baitX;state.retrieveFromZ=state.baitZ;
 state.retrieveAge=0;state.retrieveDuration=3.0;
 state.rodRested=false;state.restAction='';state.restActionTime=0;
 state.reeling=false;state.lifting=false;state.phase='retrieving';
 state.biteWindow=0;state.shake=1.1;
 eventMsg('줄을 감아 회수합니다','RETRIEVING',1.15);ambientBridge('retrieve',{spot:state.spot});
 sfx('reel');refreshHUD();return true;
}
function doBiteStrike(){if(state.phase!=='bite')return;state.rodRested=false;state.restAction='';state.fish=selectFish();state.phase='fight';state.strikeAge=0;state.hookJolt=1;state.rodQuiver=1;state.reelBlend=0;state.slackBlend=0;resetCastLine();state.distance=clamp(10+state.fish.weight*1.7+state.power*6,11,26);state.lineMeters=state.distance+2.4;state.foam=[];state.energy=1;state.tension=.23;state.runTimer=0;state.runIntensity=0;state.fishBehavior='hover';state.behaviorClock=0;state.behaviorLength=R(1.2,2.7);state.fishSide=0;state.fightFeedback=0;state.splashClock=.16;state.snapCount=0;state.escapeCount=0;state.shake=6;state.flash=.14;eventMsg('걸렸다!','FISH ON',2.2);sfx('hit');if(navigator.vibrate&&$('haptics').checked)navigator.vibrate([75,45,110]);const [x,y]=waterBob();splash(x,y,35);emitFoam(24,.9);playWaterSplash(.85,x);refreshHUD()}
function lost(why){state.rodRested=false;state.phase='lost';state.fish=null;state.reeling=state.lifting=false;state.shake=6;sfx('lost');if(navigator.vibrate&&$('haptics').checked)navigator.vibrate([40,60,40]);eventMsg(why==='snap'?'줄이 끊어졌다!':'물고기가 도망갔다',why==='snap'?'LINE SNAP':'ESCAPED',2.1);refreshHUD()}

// Record celebration is visual/sound-only. Only keep/release writes the catch to local journal.
function isSpeciesRecord(f){
 const prior=inventory.journal?.[`${f.spot}:${f.name}`];
 if(!prior||!Number(prior.catches))return true;
 return f.weight>Number(prior.bestWeight||0)+.0001||f.length>Number(prior.bestLength||0);
}
function playRecordFanfare(first=false){
 if(!audioCtx||!state.soundOn)return;
 const now=audioCtx.currentTime;
 for(const [i,frequency] of (first?[493.88,622.25,739.99,987.77]:[523.25,659.25,783.99,1046.5]).entries()){
  const o=audioCtx.createOscillator(),g=audioCtx.createGain(),start=now+i*.095;
  o.type='triangle';o.frequency.setValueAtTime(frequency,start);
  o.connect(g).connect(audioMaster);g.gain.setValueAtTime(.0001,start);
  g.gain.exponentialRampToValueAtTime(.044,start+.014);
  g.gain.exponentialRampToValueAtTime(.0001,start+.42);
  o.start(start);o.stop(start+.46);
 }
}
function celebrateRecord(f){
 const box=$('recordCelebration');if(!box)return;
 const first=!Number(inventory.journal?.[`${f.spot}:${f.name}`]?.catches||0);
 box.classList.toggle('first',first);
 box.querySelector('.recordWords strong').textContent=first?'FIRST CATCH!':'NEW RECORD!!';
 box.querySelector('.recordWords small').textContent=first?'NEW SPECIES · FIELD JOURNAL':'PERSONAL BEST · FIELD JOURNAL';
 $('recordDetail').textContent=`${f.name} · ${f.weight.toFixed(2)} kg / ${f.length} cm`;
 const starfield=$('recordStarfield');
 starfield.innerHTML=Array.from({length:18},(_,i)=>{
  const angle=i*137.5*Math.PI/180,radius=90+(i%5)*13;
  const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius*.57;
  return `<i style="--i:${i};--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px"></i>`;
 }).join('');
 box.classList.remove('active');void box.offsetWidth;box.classList.add('active');
 state.recordCelebrationUntil=state.gameSeconds+3.05;
 state.shake=Math.max(state.shake,7);state.flash=Math.max(state.flash,.53);
 playRecordFanfare(first);
 if(navigator.vibrate&&$('haptics').checked)navigator.vibrate([65,40,90,40,120]);
}
function landFish(){state.rodRested=false;state.phase='landed';state.landingAge=0;state.landingRevealed=false;state.landedFish=ensureFishID(state.fish);state.fish=null;state.reeling=state.lifting=false;const f=state.landedFish,g=GRADES[f.grade];$('caughtGrade').textContent=g.en+' / FRESH CATCH';$('caughtGrade').style.color=g.color;$('caughtName').textContent=(f.grade?g.label+' ':'')+f.name;$('caughtName').style.color=g.color;$('caughtStats').textContent=`${f.length} cm  ·  ${f.weight.toFixed(2)} kg`;$('caughtPrice').textContent='매각 예상가 '+money(f.price);$('caughtScore').textContent='종합 희귀도 '+f.score.toLocaleString()+' pts · 어종 '+(SPECIES_RARITY[f.name]||2)+'/5';$('landingSheet').hidden=true;state.shake=f.grade>=3?12:5;state.flash=f.grade>=3?.75:.22;ambientBridge('catch',{species:f.name,grade:f.grade,weight:f.weight});sfx('catch');if(navigator.vibrate&&$('haptics').checked)navigator.vibrate([80,60,130]);splash(vw*.6,vh*.41,35,g.color);refreshHUD()}
function keep(){if(!state.landedFish||!state.landingRevealed)return;recordCatch(state.landedFish,'kept');inventory.fish.unshift(state.landedFish);inventory.fish=inventory.fish.slice(0,200);state.landedFish=null;state.phase='idle';$('landingSheet').hidden=true;save();refreshHUD();eventMsg('보관 완료','KEEPER LOG',1.4)}
function release(){if(!state.landedFish||!state.landingRevealed)return;recordCatch(state.landedFish,'released');state.landedFish=null;state.phase='idle';$('landingSheet').hidden=true;refreshHUD();eventMsg('다시 물속으로','RELEASED',1.4)}
function cancelCast(){resetCastLine();if(state.phase==='landed')release();else{state.phase='idle';state.fish=null;state.landedFish=null;state.reeling=state.lifting=false;$('landingSheet').hidden=true;refreshHUD()}}
function actionDown(){
 if(state.menu||!state.started)return;
 if(['idle','lost'].includes(state.phase))doStartCharge();
 else if(state.phase==='bite'){
  // Keep reeling on the SAME press that hooked the fish. Mobile must not require a tap, then a separate hold.
  doBiteStrike();
  if(state.phase==='fight'){state.reeling=true;sfx('reel');}
 }
 else if(state.phase==='fight'){state.reeling=true;sfx('reel');}
}
function actionUp(){if(state.phase==='charging')doCast();if(state.phase==='fight')state.reeling=false;}
function setButtonHold(el,down,up){
 let held=false,pointer=null;
 const release=e=>{
  if(!held)return;
  if(e&&pointer!==null&&e.pointerId!==pointer)return;
  held=false;pointer=null;el.classList.remove('held');up();
 };
 el.addEventListener('pointerdown',e=>{
  if(el.disabled||held||e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  held=true;pointer=e.pointerId;
  try{el.setPointerCapture(e.pointerId)}catch{}
  el.classList.add('held');down();
 });
 el.addEventListener('pointerup',release);
 el.addEventListener('pointercancel',()=>release(null));
 el.addEventListener('lostpointercapture',()=>release(null));
 window.addEventListener('blur',()=>release(null));
}
setButtonHold($('actionButton'),actionDown,actionUp);setButtonHold($('liftButton'),()=>{state.lifting=true},()=>{state.lifting=false});
// Android long-press context menus interrupt pointer capture in fullscreen.
// Allow the explicit save-code textarea and form fields to keep native copy/paste.
const editableGameTarget=t=>!!t?.closest?.('input,textarea,select,[contenteditable="true"]');
for(const eventName of ['contextmenu','selectstart','dragstart']){
 $('gameRoot').addEventListener(eventName,e=>{if(!editableGameTarget(e.target))e.preventDefault();});
}
function updateRestButtons(){if(!$('restBar'))return;const eligible=state.rodRested&&!state.menu&&(state.phase==='idle'||state.phase==='waiting');$('restBar').hidden=!eligible;const map={beer:'drinkButton',smoke:'smokeButton',sashimi:'sashimiButton'};for(const [k,id] of Object.entries(map))$(id).disabled=!eligible||!state.restProps[k]||state.restCooldown>0;}
function toggleRodRest(){if(!state.started||state.menu)return;if(!['idle','waiting','bite'].includes(state.phase)){eventMsg('지금은 거치할 수 없어요','ROD STAND',1.2);return;}state.rodRested=!state.rodRested;state.restAction='';state.restActionTime=0;$('restCaption').textContent=state.rodRested?'낚싯대를 거치대에 올렸다. 바람이 느리게 분다.':'다시 낚싯대를 손에 쥐었다.';$('restCaption').classList.add('show');state.restCaptionTime=2;updateRestButtons();refreshHUD();}
const REST_LINES={beer:['햇빛에 반짝이는 유리병, 조용한 한 모금.','조용한 파도, 유리병 끝의 한 모금.'],smoke:['한 줄기 연기가 강 너머로 흐른다.','느린 바람 속으로 작은 연기가 사라진다.'],sashimi:['차가운 회 한 점. 다시 물결을 바라본다.','젓가락을 내려놓고, 가만히 찌를 본다.']};
function doRestAction(k){if(!state.rodRested||state.menu||!state.restProps[k]||state.restCooldown>0||!['idle','waiting'].includes(state.phase))return;
 const durations={beer:7.15,smoke:7.35,sashimi:6.35};if(k==='sashimi'&&state.sashimiPieces===0){state.sashimiPieces=6;eventMsg('회 접시를 새로 채웠다','TABLE',1.0);}state.sashimiTaking=false;state.restReturned=false;state.restBeat=0;state.restAction=k;state.restDuration=durations[k];state.restActionTime=durations[k];state.restTime=0;state.restCooldown=durations[k]+.65;
 $('restCaption').textContent=REST_LINES[k][Math.random()<.5?0:1];$('restCaption').classList.add('show');state.restCaptionTime=durations[k]*.90;
 ambientBridge('rest',{action:k});updateRestButtons();}
$('retrieveButton').onclick=retrieveLine;$('rodStandButton').onclick=toggleRodRest;$('drinkButton').onclick=()=>doRestAction('beer');$('smokeButton').onclick=()=>doRestAction('smoke');$('sashimiButton').onclick=()=>doRestAction('sashimi');
$('shopButton').onclick=()=>openMenu('shop');$('boardButton').onclick=()=>openMenu('leaderboard');$('pauseShopButton').onclick=()=>openMenu('shop');$('pauseBoardButton').onclick=()=>openMenu('leaderboard');
$('shopBackButton').onclick=closeMenu;$('boardBackButton').onclick=closeMenu;$('shopInventoryButton').onclick=()=>openMenu('inventory');$('sellAllButton').onclick=sellAllFish;
$('inventoryList').addEventListener('click',e=>{const b=e.target.closest('[data-sell]');if(b)sellFish(b.dataset.sell)});
$('rodShopList').addEventListener('click',e=>{const b=e.target.closest('[data-buy-rod]');if(b)buyRod(b.dataset.buyRod)});
$('baitShopList').addEventListener('click',e=>{const b=e.target.closest('[data-buy-bait]');if(b)buyBait(b.dataset.buyBait)});
document.querySelectorAll('[data-board-spot]').forEach(b=>b.onclick=()=>{boardFilter=b.dataset.boardSpot;document.querySelectorAll('[data-board-spot]').forEach(c=>c.classList.toggle('active',c===b));renderLeaderboard()});
for(const [k,id] of [['beer','beerVisible'],['smoke','smokeVisible'],['sashimi','sashimiVisible']])$(id).onchange=e=>{state.restProps[k]=e.target.checked;persistSettings();updateRestButtons()};
let keyDown=false,liftDown=false;document.addEventListener('keydown',e=>{const tag=document.activeElement?.tagName;if(['INPUT','SELECT','TEXTAREA'].includes(tag))return;if(e.code==='Escape'){e.preventDefault();if(state.menu)closeMenu();else if(state.started)openMenu('pause');return}if(e.code==='Space'&&!e.repeat){e.preventDefault();keyDown=true;actionDown();}if(e.code==='KeyE'&&!e.repeat){e.preventDefault();liftDown=true;if(state.phase==='fight')state.lifting=true;}if(e.code==='KeyF'&&!e.repeat){e.preventDefault();$('fullscreenMenu').click();return}if(e.code==='KeyI'&&!e.repeat){e.preventDefault();if(!state.menu)openMenu('inventory');}if(e.code==='KeyQ'&&!e.repeat){e.preventDefault();retrieveLine();}if(e.code==='KeyR'&&!e.repeat){e.preventDefault();toggleRodRest();}if(e.code==='KeyB'&&!e.repeat){e.preventDefault();openMenu('shop');}if(e.code==='KeyL'&&!e.repeat){e.preventDefault();openMenu('leaderboard');}});
document.addEventListener('keyup',e=>{if(e.code==='Space'&&keyDown){e.preventDefault();keyDown=false;actionUp();}if(e.code==='KeyE'&&liftDown){e.preventDefault();liftDown=false;state.lifting=false;}});
document.querySelectorAll('[data-sort]').forEach(b=>b.onclick=()=>{inventorySort=b.dataset.sort;document.querySelectorAll('[data-sort]').forEach(c=>c.classList.toggle('active',c===b));drawInventory()});$('pauseBtn').onclick=()=>openMenu('pause');$('inventoryBtn').onclick=()=>openMenu('inventory');$('closeMenu').onclick=closeMenu;$('resumeButton').onclick=closeMenu;$('backGame').onclick=closeMenu;$('resetCastMenu').onclick=()=>{cancelCast();closeMenu()};$('keepButton').onclick=keep;$('releaseButton').onclick=release;
$('weatherSelect').onchange=e=>{setWeather(e.target.value);persistSettings()};$('baitSelect').onchange=e=>{state.bait=e.target.value;if(state.bait!=='worm'&&!(inventory.baitStock[state.bait]>0)){state.bait='worm';eventMsg('미끼 재고가 없습니다','TACKLE SHOP',1.5);}applyBaitValue();persistSettings()};$('timeSlider').oninput=e=>{state.time=Number(e.target.value);setTimeLabel();buildWorld();persistSettings()};$('autoTime').onchange=e=>{state.autoTime=e.target.checked;persistSettings()};$('autoWeather').onchange=e=>{state.weatherAuto=e.target.checked;persistSettings()};$('biteMode').onchange=e=>{const mode=e.target.value;if(!Object.hasOwn(BITE_MODES,mode))return;state.biteMode=mode;if(state.phase==='waiting'){const r=BITE_MODES[mode];state.biteTarget=r?state.waiting+r[0]+Math.random()*(r[1]-r[0]):0;state.biteHazard=0;state.biteThreshold=-Math.log(Math.max(1e-12,Math.random()));}persistSettings();};$('haptics').onchange=persistSettings;$('renderQuality').onchange=e=>{state.quality=e.target.value;resize();persistSettings()};$('shortWait').onchange=e=>state.test=e.target.checked;$('soundVolume').oninput=()=>{updateAudio();persistSettings()};
$('ambientFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(customAudioURL)URL.revokeObjectURL(customAudioURL);customAudioURL=URL.createObjectURL(f);if(!customAudio){customAudio=new Audio();customAudio.loop=true;}customAudio.src=customAudioURL;setSound(true);};
$('fullscreenMenu').onclick=()=>{if(!document.fullscreenElement){$('gameRoot').requestFullscreen?.().catch(()=>{});}else document.exitFullscreen?.().catch(()=>{});};
document.querySelectorAll('.placeTile').forEach(b=>b.onclick=()=>setSpot(b.dataset.place));
$('startButton').onclick=()=>{ambientBridge('start',{spot:state.spot,weather:state.weather});state.started=true;$('startOverlay').classList.add('hidden');setSound(true);refreshHUD();};$('muteButton').onclick=()=>setSound(!state.soundOn);
// Ambient synth: layered filtered water, surf, wind, rain, insects and intermittent birds.
// All assets are generated locally; when embedded into the real Lullaby Scene player,
// the host can disable native ambience via the ambient-control message bridge.
let hostAmbient=false,birdClock=7,lastAmbientPulse=0;
function makeNoise(ctx,length=3){const b=ctx.createBuffer(1,ctx.sampleRate*length,ctx.sampleRate),d=b.getChannelData(0);let accum=0;for(let i=0;i<d.length;i++){accum=accum*.985+(Math.random()*2-1)*.015;d[i]=Math.max(-1,Math.min(1,accum*.95+(Math.random()*2-1)*.25));}return b;}
function startAmbientLayer(type,cutoff,q=1){const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=makeNoise(audioCtx);source.loop=true;filter.type=type;filter.frequency.value=cutoff;filter.Q.value=q;gain.gain.value=0;source.connect(filter).connect(gain).connect(audioMaster);source.start();natureSources.push({source,filter,gain});return gain;}
function initAudio(){if(audioCtx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audioCtx=new AC();audioMaster=audioCtx.createGain();audioMaster.gain.value=.6;audioMaster.connect(audioCtx.destination);
 audioNoiseGain=startAmbientLayer('lowpass',470,.6);waterSound=startAmbientLayer('bandpass',640,.45);windSound=startAmbientLayer('lowpass',230,.4);rainSound=startAmbientLayer('highpass',1250,.4);cricketsSound=startAmbientLayer('bandpass',3100,4);
 // low frequency swell — musical ambience stays off by default, no synthesizer drone
 audioOscGain=audioCtx.createGain();audioOscGain.gain.value=0;audioOscGain.connect(audioMaster);audioOsc=audioCtx.createOscillator();audioOsc.type='sine';audioOsc.frequency.value=60;audioOsc.connect(audioOscGain);audioOsc.start(); }
function updateAudio(){if(!audioCtx)return;const now=audioCtx.currentTime,v=Number($('soundVolume').value),gain=state.soundOn&&!customAudioURL&&!hostAmbient?v:0;
 if(customAudio){customAudio.volume=v;if(state.soundOn&&customAudioURL&&customAudio.paused)customAudio.play().catch(()=>{});if(!state.soundOn&&!customAudio.paused)customAudio.pause();}
 const sea=state.spot==='sea'?1:0,lake=state.spot==='lake'?1:0,wet=state.weather==='rain'||state.weather==='storm';const storm=state.weather==='storm';const night=state.time<5.8||state.time>19.6;
 const tide=(Math.sin(state.sceneSeconds*(sea?.72:.47))+.9)*.5;
 audioNoiseGain.gain.setTargetAtTime(gain*(sea?.16:lake?.055:.125)*(sea?.45+.55*tide:1),now,.5);
 waterSound.gain.setTargetAtTime(gain*(sea?.19:lake?.026:.082)*(.77+.23*Math.sin(state.sceneSeconds*.82)),now,.5);
 windSound.gain.setTargetAtTime(gain*(storm?.26:state.weather==='cloud'?.075:state.weather==='fog'?.025:.035),now,.55);
 rainSound.gain.setTargetAtTime(gain*(storm?.10:wet?.058:0),now,.4);
 cricketsSound.gain.setTargetAtTime(gain*(night&&!wet&&!sea?.018:0),now,1.5);
 audioOscGain.gain.setTargetAtTime(gain*(sea?.006:.002),now,.4);
 audioOsc.frequency.setTargetAtTime(sea?53:lake?64:75,now,.5);
}
function ambientOneShot(freq=850,duration=.12,amp=.012,wave='sine',endFreq=freq*.77){if(!audioCtx||!state.soundOn||hostAmbient)return;
 const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=wave;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),now+duration);o.connect(g).connect(audioMaster);g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(amp,now+.02);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.start(now);o.stop(now+duration+.03);
}
function updateAmbientEvents(dt){if(!state.started||!state.soundOn||state.menu)return;birdClock-=dt;thunderTimer-=dt;
 if(birdClock<0){const night=state.time>20||state.time<5.5;const damp=state.weather==='storm'||state.weather==='rain';if(!damp){if(night)ambientOneShot(2200+Math.random()*400,.13,.003,'sine',1700);else if(state.spot!=='sea'){
   ambientOneShot(850+Math.random()*500,.18,.009,'sine',Math.random()*200+1100);
   ambientOneShot(1020+Math.random()*400,.16,.006,'sine',780);
 }else{ambientOneShot(630+Math.random()*100,.27,.008,'sine',370);}}
 birdClock=R(night?4:6,night?11:18);}
 if(state.weather==='storm'&&thunderTimer<0){ambientOneShot(68,.95,.052,'sawtooth',36);thunderTimer=R(20,45);}
}
function setSound(on){state.soundOn=on;ambientBridge('audio',{on,spot:state.spot});if(on){initAudio();audioCtx?.resume?.();}updateAudio();refreshHUD()}
window.addEventListener('message',e=>{if(!e.data||e.data.source!=='lullaby-scene')return; if(e.data.type==='ambient-control'){hostAmbient=!!e.data.enabled;updateAudio();}});

let cachedSplashBuffer=null;
function playWaterSplash(strength=.5,screenX=vw/2){
 if(!state.soundOn||!audioCtx||audioCtx.state!=='running')return;
 const now=audioCtx.currentTime,force=clamp(strength,.1,1.3);
 if(!cachedSplashBuffer||cachedSplashBuffer.sampleRate!==audioCtx.sampleRate){
  const duration=.34,buf=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*duration),audioCtx.sampleRate);
  const channel=buf.getChannelData(0);let last=0;
  for(let i=0;i<channel.length;i++){const x=Math.random()*2-1;last=last*.45+x*.55;channel[i]=last;}
  cachedSplashBuffer=buf;
 }
 const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),high=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
 source.buffer=cachedSplashBuffer;filter.type='lowpass';filter.frequency.value=clamp(950+force*1600,600,3400);high.type='highpass';high.frequency.value=210;
 source.connect(high).connect(filter).connect(gain);
 const pan=typeof audioCtx.createStereoPanner==='function'?audioCtx.createStereoPanner():null;
 if(pan){pan.pan.value=clamp((screenX/vw-.5)*.85,-.72,.72);gain.connect(pan).connect(audioMaster)}else gain.connect(audioMaster);
 const v=(.027+force*.047);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(v,now+.014);
 gain.gain.exponentialRampToValueAtTime(.0001,now+.20+force*.065);source.start(now);source.stop(now+.31);
 const bubble=audioCtx.createOscillator(),water=audioCtx.createGain();bubble.type='sine';const freq=190+Math.random()*125;
 bubble.frequency.setValueAtTime(freq,now);bubble.frequency.exponentialRampToValueAtTime(freq*.52,now+.11);
 bubble.connect(water).connect(audioMaster);water.gain.setValueAtTime(.0001,now);
 water.gain.linearRampToValueAtTime(.011+force*.012,now+.009);water.gain.exponentialRampToValueAtTime(.0001,now+.15);
 bubble.start(now);bubble.stop(now+.18);
}
function sfx(type){if(!state.soundOn||!audioCtx)return;let t=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.connect(gain).connect(audioMaster);let freq=type==='hit'?440:type==='catch'?360:type==='lost'?190:type==='reel'?150:270;osc.type=type==='hit'?'square':type==='lost'?'sawtooth':'triangle';osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(type==='catch'?680:freq*.55,t+.19);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(type==='reel'?.024:.055,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.28);osc.start(t);osc.stop(t+.31)}
const FISH_FIGHT_STYLE={
 dive:/메기|가물치|광어|도다리|동자개|미꾸라지|가자미|대구/,
 leap:/송어|산천어|은어|농어|고등어|삼치|학꽁치/,
 zigzag:/쏘가리|배스|꺽지|볼락|우럭|강준치/,
 heavy:/잉어|향어|참돔|감성돔|벵에돔|가물치/
};
function fishStyle(name){for(const [k,regex] of Object.entries(FISH_FIGHT_STYLE))if(regex.test(name))return k;return 'steady'}
function chooseFishBehavior(name){const kind=fishStyle(name),r=Math.random();
 if(kind==='dive')return r<.54?'dive':r<.80?'burst':'hold';
 if(kind==='leap')return r<.38?'surface':r<.72?'burst':'hold';
 if(kind==='zigzag')return r<.57?'zigzag':r<.84?'burst':'rest';
 if(kind==='heavy')return r<.48?'hold':r<.70?'dive':r<.90?'burst':'rest';
 return r<.25?'burst':r<.47?'dive':r<.73?'hold':'rest';
}
function playDragSfx(power=1){if(!audioCtx||!state.soundOn)return;
 const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain(),f=audioCtx.createBiquadFilter();
 o.type='sawtooth';o.frequency.setValueAtTime(105+power*33,now);o.frequency.exponentialRampToValueAtTime(48+power*19,now+.13);
 f.type='bandpass';f.frequency.value=420;f.Q.value=.8;o.connect(f).connect(g).connect(audioMaster);
 g.gain.setValueAtTime(.001,now);g.gain.linearRampToValueAtTime(.012*power,now+.025);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.start(now);o.stop(now+.16);
}
function fightUpdate(dt){const f=state.fish;if(!f)return;
 state.runTimer+=dt*(.62+Math.min(f.weight,6)*.06);state.behaviorClock+=dt;const heavy=clamp(f.weight/7,0,1),rain=state.weather==='storm'?.11:state.weather==='rain'?.04:0;
 if(state.behaviorClock>state.behaviorLength){state.behaviorClock=0;state.fishBehavior=chooseFishBehavior(f.name);state.behaviorLength=R(state.fishBehavior==='burst'?.9:2,state.fishBehavior==='burst'?2.2:4.5);state.fishSide=Math.sign(R(-1,1))*(.8+R(0,1.8));if(state.fishBehavior==='burst')sfx('surge');}
 let pulse=.48+.3*Math.sin(state.runTimer*3.0)+.2*Math.sin(state.runTimer*5.2);let surge=(state.fishBehavior==='burst'?.78:state.fishBehavior==='surface'?.65:state.fishBehavior==='zigzag'?.48:state.fishBehavior==='dive'?.44:state.fishBehavior==='hold'?.17:.03)*(pulse+.3)+rain;
 surge=clamp(surge,0,1);state.runIntensity=surge;
 state.fishLeap=Math.max(0,state.fishLeap-dt*1.6);
 if(state.fishBehavior==='surface'&&state.fishLeap<.05&&Math.random()<dt*.8){state.fishLeap=1;fishSurfaceImpulse(.9)}
 const reel=state.reeling,lift=state.lifting;
 // Both distance and stress are real simulated values, not purely decorative bars.
 let distSpeed=.12+surge*(1.15+heavy*.5);
 if(reel)distSpeed-=(1.7+(1-surge)*.62+(lift?.35:0)-heavy*.22)*equippedRod().reel;
 if(lift&&!reel)distSpeed-=.32;
 state.distance=clamp(state.distance+distSpeed*dt*1.75,0,47);
 const wanted=state.distance+(state.reeling?.55:1.14)+surge*.36;
 state.lineMeters+=clamp(wanted-state.lineMeters,-(1.7+equippedRod().reel*2)*dt,(2.2+surge*2)*dt);
 state.lineMeters=Math.max(state.distance+.2,state.lineMeters);
 // Drag yields line against hard runs instead of displaying impossible static tension.
 const slip=surge>.53&&state.tension>.55?(surge-.40)*(state.tension-.37):0;
 state.dragSpin=lerp(state.dragSpin,slip,Math.min(1,dt*12));
 if(state.dragSpin>.035){state.lineMeters+=state.dragSpin*dt*2.1;state.dragClock-=dt;
  if(state.dragClock<=0){playDragSfx(clamp(state.dragSpin*3,.3,1));state.dragClock=R(.15,.30);}}
 else state.dragClock=0;
 const strain=(reel?.29+surge*.58+heavy*.06:-.49+surge*.30)+(lift?.26:0);
 state.tension=clamp(state.tension+strain*dt*(strain>0?equippedRod().stress:1),.02,1.08);
 if(reel)state.energy=clamp(state.energy-(.047+.024*(1-surge)+(lift?.018:0)+Math.max(0,-distSpeed)*.011)*dt,0,1);
 else state.energy=clamp(state.energy+(state.fishBehavior==='rest'?.003:.007)*dt,0,1);
 state.snapCount=state.tension>.92?state.snapCount+dt*(state.tension>1?1.8:1):Math.max(0,state.snapCount-dt*1.25);
 state.escapeCount=state.distance>36?state.escapeCount+dt:Math.max(0,state.escapeCount-dt*1.05);
state.fishMood=state.fishBehavior==='surface'?'수면에서 도약!':state.fishBehavior==='zigzag'?'좌우로 질주!':surge>.60?'강하게 돌진!':state.fishBehavior==='dive'?'깊이 잠수 중':state.distance>32?'도망갈 기세':reel?'서서히 끌려오는 중':state.fishBehavior==='rest'?'힘을 비축하는 중':'줄을 버티는 중';
 const near=clamp(state.distance/27,0,1);
 state.baitX=(Math.sin(state.runTimer*(state.fishBehavior==='zigzag'?4.1:1.5))*3.6+Math.sin(state.runTimer*3.7)*1.0+state.fishSide*(surge*.9))*(.24+near*.76);
 state.baitZ=3.3-clamp(state.distance,0,39)*.91;
 // Pulling fish produce a chain of coherent splashes, not a soundless random foam sprinkle.
 state.splashClock=Math.max(0,state.splashClock-dt);
 const activeSurface=state.reeling||surge>.33||state.distance<5;
 if(activeSurface&&state.splashClock<=0){
  const effort=clamp(.26+(state.reeling?.33:0)+surge*.50+(state.distance<8?.16:0),.18,1.24);
  fishSurfaceImpulse(effort);
  state.splashClock=state.reeling?R(.21,.38):surge>.56?R(.30,.56):R(.6,1.15);
  if(effort>.97&&navigator.vibrate&&$('haptics').checked)navigator.vibrate(18);
 }
 if(!activeSurface&&Math.random()<dt*2.5)emitFoam(1,.1);
 if(state.tension>.82&&state.fightFeedback<=0){state.fightFeedback=1.3;showReelToast('장력이 높아요! 잠깐 놓아주세요');if(navigator.vibrate&&$('haptics').checked)navigator.vibrate([35,35,35]);}
 state.fightFeedback=Math.max(0,state.fightFeedback-dt);
 if(state.snapCount>1.55)return lost('snap');if(state.escapeCount>2.7)return lost('escaped');
 if(state.distance<=2.8&&state.energy<=.31)return landFish();
 if(state.reeling&&Math.random()<dt*10)sfx('reel');
}
function showReelToast(txt){$('reelToast').textContent=txt;$('reelToast').classList.add('show');setTimeout(()=>{$('reelToast').classList.remove('show')},1150);}

function tick(dt,realDt=dt){wildlifeStep();if(!state.menu&&state.started){state.gameSeconds+=dt;state.weatherClock+=dt;if(state.weatherAuto&&state.weatherClock>900){state.weatherClock=0;setWeather(randomWeather());persistSettings();}state.weatherBlend=Math.min(1,state.weatherBlend+dt/8);if(state.autoTime){let old=Math.floor(state.time*2);let oldTime=state.time;state.time=(state.time+dt/900)%24;if(oldTime>state.time){state.dayLuck=Math.random();eventMsg('새로운 하루','NEW FISHING DAY',1.2);}if(state.gameSeconds%2<dt)setTimeLabel();if(old!==Math.floor(state.time*2)&&realGL&&!document.hidden)buildWorld()}
 state.reelBlend+=((state.phase==='fight'&&state.reeling?1:0)-state.reelBlend)*Math.min(1,dt*10);
 state.slackBlend+=((state.phase==='fight'&&!state.reeling?1:0)-state.slackBlend)*Math.min(1,dt*5);
 state.rodQuiver+=((state.phase==='fight'?clamp(state.runIntensity*.76+state.tension*.35,.12,1):0)-state.rodQuiver)*Math.min(1,dt*4.8);
 state.strikeAge=Math.min(99,state.strikeAge+dt);
state.reelRotation+=dt*(state.phase==='fight'?(state.reeling?23*equippedRod().reel:1.1)-state.dragSpin*31:.45);
 const phase=state.phase;if(phase==='charging')state.power=clamp((performance.now()-state.castStart)/1400,0,1);
 if(phase==='landed'){
  state.landingAge+=dt;
  if(state.landingAge<.6&&Math.random()<dt*10)fishSurfaceImpulse(.6);
  if(state.landingAge>=2.25&&!state.landingRevealed){
   state.landingRevealed=true;$('landingSheet').hidden=false;
   const landed=state.landedFish;
   if(landed&&isSpeciesRecord(landed))celebrateRecord(landed);
   if(landed)eventMsg(landed.grade>2?'놀라운 어획!':'잡았다!','FRESH CATCH',1.3);
  }
 }
 if(phase==='retrieving'){
  state.retrieveAge+=dt;
  const u=clamp(state.retrieveAge/state.retrieveDuration,0,1),sm=u*u*(3-2*u);
  state.baitX=lerp(state.retrieveFromX,0.15,sm);
  state.baitZ=lerp(state.retrieveFromZ,6.0,sm);
  state.lineMeters=Math.max(0,Math.hypot(state.baitX,state.baitZ-10));
  state.reelRotation+=dt*23*equippedRod().reel;
  if(Math.random()<dt*6&&u<.95){const [wx,wy]=waterBob();state.ripples.push({x:wx,y:wy,r:2+u*4,life:.50});}
  if(u>=1){state.phase='idle';state.retrieveAge=0;state.waiting=0;state.biteTarget=0;state.biteHazard=0;state.rodQuiver=0;resetCastLine();eventMsg('회수 완료 · 다시 던질 수 있어요','READY TO CAST',1.8);ambientBridge('retrieve-complete',{spot:state.spot});}
 }
 else if(phase==='flying'){state.flight+=dt/1.08;if(state.flight>=1){state.phase='waiting';startBiteWait();const [x,y]=waterBob();splash(x,y,14);sfx('cast');}}
 else if(phase==='waiting'){
 // Current pulls downriver while sea bobbers rise and fall on individual swells.
 state.baitX=clamp(state.baitX+dt*(state.spot==='river'?.014:state.spot==='sea'?.004:.001)+Math.sin(state.gameSeconds*(state.spot==='sea'?.35:.12)+state.power)*dt*(state.spot==='river'?.018:.007),-5.4,5.4);
 state.nibbleClock+=dt;
 if(state.nibbleClock>state.nibbleNext&&state.waiting>12){
  state.nibbleClock=0;state.nibbleNext=R(state.biteMode==='reality'?60:27,state.biteMode==='reality'?115:65);state.nibbleUntil=state.gameSeconds+R(.45,.8);
  const [nx,ny]=waterBob();state.ripples.push({x:nx,y:ny,r:3,life:.42});
 }
if(Math.random()<Math.min(.16,realDt/190)){const [wx,wy]=waterBob();state.ripples.push({x:wx+R(-26,26),y:wy+R(-6,6),r:R(3,8),life:.65});}if(advanceBiteClock(realDt)){state.phase='bite';state.restAction='';state.restActionTime=0;state.biteWindow=5;state.shake=3;const [x,y]=waterBob();splash(x,y,18);eventMsg('입질!','THE BOBBER IS MOVING',2);sfx('hit')}}
 else if(phase==='bite'){state.biteWindow-=dt;if(state.biteWindow<=0){state.phase='waiting';startBiteWait();eventMsg('놓쳤다','MISSED THE BITE',1.2)}}
 else if(phase==='fight')fightUpdate(dt);
 state.restActionTime=Math.max(0,state.restActionTime-dt);state.restTime=state.restDuration-state.restActionTime;
 // Auditory beats match the physical action: pickup -> contact -> use -> return, not the button tap.
 if(state.restAction&&state.restActionTime>0){
  const p=restProgress(),k=state.restAction,beats=k==='beer'?[.245,.47,.53,.63,.875]:k==='smoke'?[.245,.49,.62,.73,.876]:[.205,.365,.53,.65,.885];
  while(state.restBeat<beats.length&&p>=beats[state.restBeat]){
   const n=state.restBeat++;
   if(n===0||n===4){ambientOneShot(k==='beer'?390:k==='smoke'?260:540,.035,.005,'triangle',115);}
   if(k==='beer'&&n===2){ambientOneShot(160,.16,.018,'sine',215);ambientBridge('sip',{action:k});}
   if(k==='beer'&&n===3){ambientOneShot(120,.12,.014,'sine',175);}
   if(k==='smoke'&&n===1){ambientOneShot(300,.10,.014,'sine',260);ambientBridge('inhale',{action:k});}
   if(k==='smoke'&&n===2){ambientOneShot(175,.11,.008,'sine',380);ambientBridge('exhale',{action:k});}
   if(k==='sashimi'&&n===1){ambientOneShot(590,.03,.012,'triangle',105);}
   if(k==='sashimi'&&n===3){ambientOneShot(180,.11,.005,'sine',140);ambientBridge('chew',{action:k});}
  }
 }
 if(state.restAction==='sashimi'&&!state.sashimiTaking&&restProgress()>.365){state.sashimiTaking=true;state.sashimiPieces=Math.max(0,state.sashimiPieces-1);ambientBridge('sashimi-pickup',{remaining:state.sashimiPieces});}
 if(state.restAction&&!state.restReturned&&restProgress()>=REST_MOTION[state.restAction].putdown){state.restReturned=true;state.restContactKind=state.restAction;state.restContactUntil=state.gameSeconds+.36;ambientBridge('prop-return',{action:state.restAction});}

 const fpPose=fpModelFrame(),pitch=fpPose?.head||0;
 state.bowAmount+=((fpPose?.bow||0)-state.bowAmount)*Math.min(1,dt*12);
 state.headPitch+= (pitch-state.headPitch)*Math.min(1,dt*12);
 state.headRoll+= ((state.restAction==='beer'&&fpPose?.p>.47&&fpPose?.p<.67?.018*Math.sin(fpPose.p*85):0)-state.headRoll)*Math.min(1,dt*7);
 state.restCooldown=Math.max(0,state.restCooldown-dt);state.restCaptionTime=Math.max(0,state.restCaptionTime-dt);if(state.restCaptionTime===0)$('restCaption').classList.remove('show');if(state.restActionTime===0)state.restAction='';if(state.recordCelebrationUntil&&state.gameSeconds>=state.recordCelebrationUntil){$('recordCelebration')?.classList.remove('active');state.recordCelebrationUntil=0;}state.eventLeft-=dt;if(state.eventLeft<=0)$('eventBanner').classList.remove('show');state.shake=Math.max(0,state.shake-dt*12);state.flash=Math.max(0,state.flash-dt*1.7);
 }else if(!state.started){state.sceneSeconds+=dt*.25;}
 updateAmbientEvents(dt);state.sceneSeconds+=dt; // landscape remains alive only while menu is closed? a slow ambient breeze is fine while paused
 if(['rain','storm'].includes(state.weather)&&!state.menu){
  state.surfaceRainClock-=dt;
  if(state.surfaceRainClock<=0){const [rx,ry]=waterBob();
   const wetCount=state.weather==='storm'?4:2;
   for(let i=0;i<wetCount;i++){
    if(state.ripples.length>=75)state.ripples.shift();
    state.ripples.push({x:rx+R(-vw*.44,vw*.44),y:ry+R(-vh*.10,vh*.13),r:R(1,4),life:R(.16,.29)});
   }
   state.surfaceRainClock=state.weather==='storm'?.09:.20;
  }
 }
 if(state.weather==='storm'&&Math.random()<dt*.025&&!state.menu)state.flash=1.5;
 hudClock+=dt;if(hudClock>.14){hudClock=0;refreshHUD();if(audioCtx)updateAudio();}}
function frame(now){const realDt=last?Math.max(0,(now-last)/1000):0;let dt=clamp(realDt,0,.05);last=now;
 state.perfFrameCost=lerp(state.perfFrameCost,Math.min(180,realDt*1000||16.6),.045);
 state.perfFps=Math.round(1000/Math.max(5,state.perfFrameCost));
 // Background tabs must not spend battery drawing 3 canvases at 60fps.
 if(document.hidden){requestAnimationFrame(frame);return}
 tick(dt,realDt);updateCamera();drawWorld(state.sceneSeconds);drawEffects(dt);requestAnimationFrame(frame)}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){state.hiddenAt=performance.now();state.reeling=false;state.lifting=false;}
 else{
  const away=state.hiddenAt?Math.max(0,(performance.now()-state.hiddenAt)/1000):0;
  // Credit real elapsed waiting without silently expiring the short strike window.
  if(away>0&&state.started&&state.phase==='waiting'&&advanceBiteClock(away)){
   state.phase='bite';state.biteWindow=10;state.nibbleUntil=0;eventMsg('복귀하자마자 입질!','BITE WAITED FOR YOU',2);
  }
  // Never expire a five-second bite while the screen was locked.
  if(state.phase==='bite')state.biteWindow=Math.max(state.biteWindow,9);
  if(state.phase==='waiting'&&state.waitWallClock)state.waitWallClock=performance.now();
  last=performance.now();state.hiddenAt=0;
 }
});
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,120));
loadSettings();applyBaitValue();for(const f of inventory.fish){ensureFishID(f);if(!inventory.records.some(r=>r.id===f.id))inventory.records.push({...f,status:'kept',when:new Date().toISOString()});}inventory.records=inventory.records.slice(0,300);save();state.weatherPrev=state.weather;resize();buildWorld();document.querySelectorAll('.placeTile').forEach(b=>b.classList.toggle('active',b.dataset.place===state.spot));setTimeLabel();refreshHUD();requestAnimationFrame(frame);
window.__stillwater={state,inventory,DATA,wildlife,debugStep(dt=.05){tick(dt,dt);updateCamera();},renderOnce(){updateCamera();drawWorld(state.sceneSeconds);drawEffects(0);},projectPoint:screenPoint,forceWildlife(kind='river'){const now=state.gameSeconds;if(kind==='river')wildlife.river={born:now-34,duration:60,z:1,dir:1};else wildlife.sea={born:now-8,duration:42,dir:1,kind:'gulls'};},storageKey,settingsKey,save,persistSettings,refreshHUD,closeMenu,biteRate,startBiteWait,advanceBiteClock,table:TABLE3D,fishScore,rodPose:getRodPose,rodKeyframe,castRig,buyRod,buyBait,sellFish,renderShop,renderLeaderboard,toggleRodRest,retrieveLine,doRestAction,chooseFish:selectFish,debugFrame(){return fpModelFrame()},debugTableProp(k){return propOnTable(k)},debugMotion(){return {bow:state.bowAmount,head:state.headPitch,pose:fpModelFrame()}},debugRestAim(){const f=fpModelFrame();return {table:screenPoint([TABLE3D.x,TABLE3D.y,TABLE3D.z]),prop:state.restAction?screenPoint(restAnchor(state.restAction)):null,tip:f?viewPoint(restAnchor(f.k)):null,viewport:[vw,vh],shoulder:fpShoulder()}},triggerBite(){if(state.started&&!state.menu){state.phase='bite';state.biteWindow=5;eventMsg('입질!')}},forceLand(){if(state.started&&!state.menu){if(!state.fish)state.fish=selectFish();landFish()}},debugSplash(power=.8){fishSurfaceImpulse(power);},debugRodSkin(){return {rod:inventory.rod,skin:rodSkin(),pose:getRodPose(),linePoints:castRig.points.length,guideCount:6}},debugHook(){const fish=state.phase==='landed'?state.landedFish:state.fish;return fish?{pose:fishLocation(),mouth:fishHookPoint(),screen:screenPoint(fishHookPoint()),phase:state.phase}:null},debugPerformance(){return{fps:state.perfFps,frameCost:state.perfFrameCost,particles:state.particles.length,ripples:state.ripples.length}},debugNewRecord(){const f=state.landedFish||selectFish();celebrateRecord(f);return isSpeciesRecord(f)},setWeather(w){if(WEATHER[w]){$('weatherSelect').value=w;state.weather=w;refreshHUD()}},setSpot};
})();

