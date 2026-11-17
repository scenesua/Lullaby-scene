/* STILLWATER Field Journal & fully offline save-code exchange. */
(()=>{
'use strict';
const R=window.__stillwater,C=window.StillwaterContent;
if(!R||!C)return;
const inv=R.inventory,S=R.state,$=id=>document.getElementById(id);
const regionNames={river:'강',lake:'저수지',sea:'바다'},regionIcons={river:'≋',lake:'◈',sea:'♒'};
const regions=['river','lake','sea'];
const allSpecies=Object.fromEntries(regions.map(spot=>[spot,C.spots[spot].fish]));
const isSpecies=(spot,name)=>regions.includes(spot)&&allSpecies[spot].some(f=>f[0]===name);
const speciesInfo=(spot,name)=>allSpecies[spot].find(f=>f[0]===name);
const key=(spot,name)=>`${spot}:${name}`;
const cleanNumber=(n,lo=0,hi=1e12)=>Number.isFinite(+n)?Math.min(hi,Math.max(lo,+n)):lo;
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const emptyStats=()=>({caught:true,catches:0,bestWeight:0,bestLength:0});
function migrate(){
 if(inv.journal&&typeof inv.journal==='object'&&!Array.isArray(inv.journal))return;
 inv.journal={};const used=new Set();
 for(const f of inv.records||[]){
  if(!isSpecies(f.spot,f.name))continue;
  const id=String(f.id||'');if(id&&used.has(id))continue;if(id)used.add(id);
  const k=key(f.spot,f.name),v=inv.journal[k]||emptyStats();
  v.catches++;v.bestWeight=Math.max(v.bestWeight,cleanNumber(f.weight,0,500));v.bestLength=Math.max(v.bestLength,cleanNumber(f.length,0,500));inv.journal[k]=v;
 }
 R.save();
}
migrate();
function recordCatch(f){
 if(!f||!isSpecies(f.spot,f.name))return;
 const k=key(f.spot,f.name),v=inv.journal[k]||emptyStats();
 const firstEver=v.catches===0;
 v.caught=true;v.catches=(Number(v.catches)||0)+1;
 v.bestWeight=Math.max(Number(v.bestWeight)||0,cleanNumber(f.weight,0,500));
 v.bestLength=Math.max(Number(v.bestLength)||0,cleanNumber(f.length,0,500));
 inv.journal[k]=v;
 if(firstEver)lastDiscovered=k;
 // Tiny evergreen achievements: not a compulsive daily task schedule.
 if(f.name==='붕어'&&['rain','storm'].includes(S.weather))giveStamp('rain_crucian','비 오는 날의 첫 붕어');
 const species=speciesInfo(f.spot,f.name);
 if(species&&(relativeSize(f.weight,species[2],species[3])>=85||relativeSize(f.length,species[6],species[7])>=85))giveStamp('xxl','첫 XXL 개체');
 if(allSpecies[f.spot].every(x=>inv.journal[key(f.spot,x[0])]?.catches>0))giveStamp('complete_'+f.spot,`${regionNames[f.spot]} 물고기 18종 발견`);
 // Main game's recordCatch will save the inventory after this hook runs.
}
const tiers=['XS','S','M','L','XL','XXL'];
let lastDiscovered=null;
const HABITAT_RULES=[
 {re:/메기|동자개|가물치|미꾸라지|모래무지|광어|도다리|가자미|대구/,zone:'바닥층',time:'저녁~밤',hint:'미끼를 바닥 가까이에 두면 유리해요'},
 {re:/송어|산천어|은어|쏘가리|꺽지|농어|배스|볼락|우럭/,zone:'중층·장애물 부근',time:'새벽·해질녘',hint:'활성 시간대와 루어를 활용해 보세요'},
 {re:/고등어|전갱이|삼치|학꽁치|갈치|강준치/,zone:'표층~중층',time:'새벽·해질녘',hint:'빠르게 움직이는 미끼에 반응하기 쉬워요'},
 {re:/잉어|향어|붕어|떡붕어|누치|블루길|피라미/,zone:'얕은 물·중층',time:'아침·저녁',hint:'느린 움직임으로 기다려 보세요'}
];
function fishHabitat(name,spot){const rule=HABITAT_RULES.find(x=>x.re.test(name));return rule||{zone:spot==='sea'?'연안 수역':'수초·수변',time:'상황에 따라 변화',hint:'날씨와 활동 시간대를 살펴보세요'}}
function relativeSize(value,min,max){return Math.round(100*Math.max(0,Math.min(1,(value-min)/Math.max(.001,max-min))))}
function giveStamp(id,message){if(!Array.isArray(inv.badges))inv.badges=[];if(inv.badges.includes(id))return;
 inv.badges.push(id);R.save();const toast=$('achievementToast');if(!toast)return;
 toast.textContent='✦ 관찰 일지 · '+message;toast.classList.remove('active');void toast.offsetWidth;toast.classList.add('active');
 setTimeout(()=>toast.classList.remove('active'),2700);
}

function sizeTier(n,min,max){const ratio=max>min?Math.max(0,Math.min(1,(n-min)/(max-min))):0;return tiers[ratio<.10?0:ratio<.25?1:ratio<.45?2:ratio<.65?3:ratio<.85?4:5];}
// Hand-drawn 2D field-guide illustrations: fish are distinct silhouettes, not a single blob.
// 3D animation remains low-poly; this vector field illustration is used ONLY in the leather journal.
function illustrationKind(n){
 if(/광어|도다리|가자미/.test(n))return 'flat';
 if(n==='갈치')return 'ribbon';
 if(n==='학꽁치')return 'needle';
 if(/가물치|미꾸라지/.test(n))return 'eel';
 if(/메기|동자개|대구/.test(n))return 'cat';
 if(/산천어|송어|은어/.test(n))return 'trout';
 if(/참돔|감성돔|벵에돔|전어|붕어|떡붕어|참붕어|블루길|납자루/.test(n))return 'bream';
 if(/잉어|향어|누치|돌고기|모래무지|참마자/.test(n))return 'carp';
 if(/고등어|삼치|전갱이|강준치|피라미|빙어|쉬리|버들치|끄리/.test(n))return 'stream';
 if(/꺽지|쏘가리|우럭|볼락|쥐노래미/.test(n))return 'perch';
 return 'bass';
}
const fishShapes={
 carp:{body:'M12 33 Q18 18 43 18 Q73 16 99 30 Q83 49 53 47 Q23 49 12 33Z',tail:'M96 30 Q113 21 119 17 L116 34 L120 47 Q108 42 96 37Z',dorsal:'M34 20 L44 10 L49 5 L57 12 L76 15 L84 23Z',belly:'M48 46 Q59 60 71 49 L83 41',mouth:'M13 31 L7 35 L14 37',mark:'M31 28 Q52 18 76 28 M28 35 Q55 41 80 35'},
 bream:{body:'M12 29 Q31 3 59 4 Q84 6 97 29 Q84 56 56 55 Q29 52 12 29Z',tail:'M94 29 L119 14 L115 30 L119 49 L95 37Z',dorsal:'M29 16 L36 1 L43 10 L51 0 L58 8 L67 3 L82 17Z',belly:'M34 46 L50 60 L62 51 L79 46',mouth:'M13 28 L8 31 L14 34',mark:'M29 25 Q55 14 81 25 M23 36 Q55 45 82 35'},
 perch:{body:'M11 30 Q20 16 43 18 Q71 15 98 26 Q93 39 64 44 Q32 48 11 30Z',tail:'M95 27 L121 15 L116 29 L122 44 L97 36Z',dorsal:'M28 21 L32 8 L39 15 L45 3 L51 14 L58 7 L65 18 L76 15 L82 21Z',belly:'M40 41 L57 55 L68 42',mouth:'M10 29 L3 27 L7 34 L15 35',mark:'M40 21 L48 39 M55 20 L62 40 M71 21 L77 38'},
 trout:{body:'M9 30 Q29 18 64 19 Q85 18 104 29 Q85 42 54 42 Q24 42 9 30Z',tail:'M101 28 Q116 19 122 17 L116 30 L122 44 L101 34Z',dorsal:'M49 20 L55 9 L68 18 M81 36 L86 31 L89 39',belly:'M58 40 L68 48 L74 39',mouth:'M9 29 L4 28 L8 34',mark:'M27 25 L38 25 M48 23 L50 25 M65 22 L67 24 M76 26 L78 28 M54 32 L55 33 M69 35 L71 35'},
 bass:{body:'M11 27 Q28 15 62 18 Q88 16 100 28 Q90 41 59 45 Q30 42 11 27Z',tail:'M98 28 L120 16 L114 31 L120 46 L98 36Z',dorsal:'M37 20 L39 10 L46 16 L53 8 L61 17 L72 15 L85 23Z',belly:'M47 42 L67 51 L75 42',mouth:'M13 24 L3 24 L5 31 L14 35',mark:'M26 31 Q53 37 86 30'},
 stream:{body:'M9 29 Q38 22 70 23 Q90 22 103 30 Q86 38 57 37 Q31 38 9 29Z',tail:'M101 29 L123 15 L116 29 L123 45 L102 34Z',dorsal:'M51 23 L58 13 L68 22 M82 35 L88 42 L93 34',belly:'M42 36 L58 45 L64 37',mouth:'M10 28 L4 27 L9 32',mark:'M24 29 Q62 26 91 30'},
 cat:{body:'M8 30 Q13 18 33 18 Q55 22 81 24 Q98 25 105 31 Q80 44 44 45 Q15 44 8 30Z',tail:'M102 30 L122 17 L115 31 L122 42 L102 37Z',dorsal:'M40 20 L49 10 L54 23 M78 25 L86 21 L88 27',belly:'M38 43 L52 52 L64 44',mouth:'M12 28 L3 27 L12 36',mark:'M23 21 Q38 19 53 26',whisker:true},
 eel:{body:'M5 34 Q22 22 48 25 Q71 27 84 32 Q104 39 114 31 Q101 49 81 43 Q62 37 41 37 Q17 42 5 34Z',tail:'M112 31 L123 28 L117 37 L106 42Z',dorsal:'M23 27 Q55 20 87 29',belly:'M39 38 Q71 43 98 37',mouth:'M8 32 L3 34 L8 36',mark:'M26 33 Q60 30 89 35'},
 needle:{body:'M15 29 Q55 24 94 27 L111 31 L92 35 Q55 37 15 32Z',tail:'M110 31 L124 18 L119 32 L124 46 L110 34Z',dorsal:'M69 26 L75 17 L84 27',belly:'M65 35 L74 39 L83 34',mouth:'M15 29 L1 28 L14 31',mark:'M26 30 L93 30'},
 ribbon:{body:'M4 28 Q22 17 44 22 Q68 27 88 24 Q106 23 117 29 Q103 39 82 35 Q62 31 42 32 Q17 34 4 28Z',tail:'M116 28 L124 25 L119 34Z',dorsal:'M7 27 Q21 8 51 18 Q81 24 110 25',belly:'M24 32 Q55 34 94 33',mouth:'M4 27 L1 29 L4 31',mark:'M10 29 Q53 27 111 30'},
 flat:{body:'M14 31 Q31 12 60 11 Q84 14 103 30 Q91 48 61 51 Q31 50 14 31Z',tail:'M100 29 L121 21 L116 32 L121 42 L100 37Z',dorsal:'M21 24 Q55 3 94 23',belly:'M22 40 Q55 57 92 40',mouth:'M15 28 L6 30 L16 34',mark:'M27 29 Q54 18 80 30 M29 36 Q56 46 81 35'}
};
function fishPicture(name,tint,unseen=false){
 const type=illustrationKind(name),shape=fishShapes[type];
 const fill=unseen?'#201d1a':tint,ink=unseen?'#201d1a':'#394943',pale=unseen?'#201d1a':'#d5c7a2';
 const part=(d,color,stroke=ink)=>`<path d="${d}" fill="${color}" stroke="${stroke}" stroke-width="1" stroke-linejoin="round"/>`;
 const body=part(shape.body,fill),tail=part(shape.tail,fill),dorsal=part(shape.dorsal,fill),belly=part(shape.belly,fill);
 const mouth=part(shape.mouth,fill);
 // Unknown entries remain genuine featureless black silhouettes.
 let detail='';if(!unseen){
  detail=`<path d="${shape.mark}" fill="none" stroke="${ink}" stroke-width="1.1" opacity=".60" stroke-linecap="round"/>`;
  const eyeX=type==='ribbon'?13:type==='needle'?23:type==='flat'?35:24;
  const eyeY=type==='flat'?25:type==='bream'?25:27;
  detail+=`<circle cx="${eyeX}" cy="${eyeY}" r="2.4" fill="#202a27"/><circle cx="${eyeX-.65}" cy="${eyeY-.8}" r=".8" fill="#e6e2d5"/>`;
  if(shape.whisker)detail+=`<path d="M12 30 Q5 21 1 22 M12 32 Q5 42 1 40 M18 34 Q11 44 6 46" fill="none" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>`;
  if(type==='trout'||/쏘가리|볼락|쥐노래미|산천어/.test(name))for(let i=0;i<12;i++){let x=37+(i%6)*9,y=26+Math.floor(i/6)*9;detail+=`<circle cx="${x}" cy="${y}" r="${i%3===0?1.7:1.1}" fill="${ink}" opacity=".5"/>`;}
  if(/고등어|삼치|전갱이/.test(name))for(let i=0;i<5;i++){let x=39+i*10;detail+=`<path d="M${x} 24 l6 7 l-4 -4" fill="none" stroke="${ink}" stroke-width="1.2" opacity=".65"/>`;}
  if(type==='flat')detail+=`<circle cx="46" cy="25" r="2.2" fill="#202a27"/><path d="M33 37 Q57 44 80 32" fill="none" stroke="${ink}" opacity=".45"/>`;
  detail+=`<path d="M40 29 Q68 33 93 29" stroke="${pale}" stroke-width=".65" opacity=".55" fill="none"/>`;
 }
 return `<svg viewBox="0 0 126 62" role="img" aria-label="${unseen?'미발견 물고기':esc(name)}" xmlns="http://www.w3.org/2000/svg"><g>${tail}${dorsal}${belly}${body}${mouth}${detail}</g></svg>`;
}
let current='river',page=0,selection=0,lastFocus=null;
function statsFor(spot,name){const raw=inv.journal?.[key(spot,name)];return raw&&raw.catches>0?raw:null}
function render(){
 const fishes=allSpecies[current],start=page*9,shown=fishes.slice(start,start+9),sum=fishes.filter(f=>statsFor(current,f[0])).length;
 $('journalRegion').textContent=`${regionNames[current]} · ${sum}/18 발견`;
 $('journalPage').textContent=`${regionNames[current]} ${page+1}/2 · ${regions.indexOf(current)*2+page+1}/6`;
 $('journalPrev').disabled=current===regions[0]&&page===0;$('journalNext').disabled=current===regions[regions.length-1]&&page===1;
 document.querySelectorAll('[data-journal-region]').forEach(el=>{const active=el.dataset.journalRegion===current;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active))});
 $('journalSpecies').innerHTML=shown.map((fish,i)=>{
  const known=!!statsFor(current,fish[0]),active=selection===start+i;
  return `<button class="diaryFish ${known?'discovered':'mystery'} ${active?'picked':''}" type="button" data-journal-index="${start+i}" aria-pressed="${active}"><span class="diaryFishArt">${fishPicture(fish[0],fish[5],!known)}</span><span class="diaryFishName">${known?esc(fish[0]):'???'}</span><span class="diaryFishNumber">NO. ${String(start+i+1).padStart(2,'0')}</span></button>`
 }).join('');
 $('journalSpecies').querySelectorAll('[data-journal-index]').forEach(btn=>btn.addEventListener('click',()=>{selection=+btn.dataset.journalIndex;render()}));
 const fish=fishes[selection]||shown[0],info=fish&&statsFor(current,fish[0]),notebook=$('journalDetails');
 if(!fish){notebook.textContent='물고기 자료가 없습니다.';return}
 if(!info){notebook.innerHTML=`<div class="diaryBigFish unknown">${fishPicture(fish[0],fish[5],true)}</div><p class="diaryOverline">SPECIMEN UNKNOWN</p><h2>???</h2><p class="diaryLocked">아직 만나지 못한 물고기야.<br>낚싯대 끝에서 첫 인사를 기다리는 중.</p><div class="diaryUnknownMark">✧ 미발견 · 기록 없음</div>`;return}
 const wt=sizeTier(info.bestWeight,fish[2],fish[3]),lt=sizeTier(info.bestLength,fish[6],fish[7]);
 const wRatio=relativeSize(info.bestWeight,fish[2],fish[3]),lRatio=relativeSize(info.bestLength,fish[6],fish[7]);
 const habitat=fishHabitat(fish[0],current),newlyFound=lastDiscovered===key(current,fish[0]);
 const marks=(inv.badges||[]).filter(x=>x==='xxl'||x==='rain_crucian'||x==='complete_'+current).map(x=>({xxl:'✦ XXL 개체 발견',rain_crucian:'☂ 빗속의 붕어', ['complete_'+current]:'▣ 18종 발견'}[x]||x)).join(' · ');

 const [description,tmi]=C.notes[current][fish[0]];
 notebook.innerHTML=`<div class="diaryBigFish ${newlyFound?'inkReveal':''}">${fishPicture(fish[0],fish[5])}${newlyFound?'<span class="discoveryStamp">NEW DISCOVERY</span>':''}</div><p class="diaryOverline">SPECIMEN · ${String(selection+1).padStart(2,'0')}</p><h2>${esc(fish[0])}</h2><div class="diaryCount">누적 포획 <strong>${Math.floor(info.catches).toLocaleString('ko-KR')}회</strong></div><div class="diaryMeasures"><div><span>역대 최대 무게</span><strong>${info.bestWeight.toFixed(2)}<small>kg</small></strong><em>${wt}</em></div><div><span>역대 최대 길이</span><strong>${info.bestLength.toFixed(0)}<small>cm</small></strong><em>${lt}</em></div></div><div class="diarySizeCompare"><div class="compareLegend">내 최고 기록 <small>도감 범위 중간점 = 50%</small></div><div class="compareTrack"><span>무게</span><i><b style="width:${wRatio}%"></b><em></em></i><strong>${wRatio}%</strong></div><div class="compareTrack"><span>길이</span><i><b style="width:${lRatio}%"></b><em></em></i><strong>${lRatio}%</strong></div></div><div class="diaryHabitat"><strong>낚시 힌트 · ${esc(habitat.zone)}</strong><span>주요 활동: ${esc(habitat.time)}</span><p>${esc(habitat.hint)}</p></div>${marks?`<div class="diaryBadges">${esc(marks)}</div>`:''}<div class="diaryStory"><p class="diaryBio">${esc(description)}</p><p class="diaryTmi">${esc(tmi)}</p></div>`;
}
function jump(spot){if(!regions.includes(spot))return;current=spot;page=0;selection=0;render();$('journalBook').classList.remove('pageFlip');void $('journalBook').offsetWidth;$('journalBook').classList.add('pageFlip')}
function flip(step){const index=regions.indexOf(current)*2+page+step;if(index<0||index>=regions.length*2)return;current=regions[Math.floor(index/2)];page=index%2;selection=page*9;render();$('journalBook').classList.remove('pageFlip');void $('journalBook').offsetWidth;$('journalBook').classList.add('pageFlip')}
function open(){if(!$('journalOverlay').hidden)return;lastFocus=document.activeElement;R.closeMenu();S.menu='journal';S.reeling=S.lifting=false;$('journalOverlay').hidden=false;current=S.spot||'river';page=0;selection=0;render();$('journalClose').focus({preventScroll:true})}
function close(){if($('journalOverlay').hidden)return;$('journalOverlay').hidden=true;S.menu=null;R.refreshHUD();lastFocus?.focus?.({preventScroll:true})}
// All save-code work runs locally in the player's browser: no fetch, server or database.
const textToBytes=x=>new TextEncoder().encode(x);
function hash(bytes){let v=0x811c9dc5;for(const b of bytes){v^=b;v=Math.imul(v,0x01000193)}return (v>>>0).toString(16).padStart(8,'0')}
function b64url(bytes){let str='';for(let i=0;i<bytes.length;i+=16384)str+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(str){if(!/^[A-Za-z0-9_-]+$/.test(str)||str.length>1200000)throw Error('저장 코드가 너무 길거나 형식이 잘못됐어.');const raw=atob(str.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-str.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
async function packed(data){if(typeof CompressionStream!=='function')return {mode:'J',bytes:data};const cs=new CompressionStream('gzip');const encoded=await new Response(new Blob([data]).stream().pipeThrough(cs)).arrayBuffer();return{mode:'G',bytes:new Uint8Array(encoded)}}
async function unpack(mode,data){if(mode!=='G')return data;if(typeof DecompressionStream!=='function')throw Error('이 브라우저는 압축된 코드를 지원하지 않아. 최신 브라우저에서 다시 시도해줘.');const ds=new DecompressionStream('gzip');const bytes=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();if(bytes.byteLength>1000000)throw Error('저장 데이터가 허용 크기를 초과했어.');return new Uint8Array(bytes)}
function validateFish(f){if(!f||typeof f!=='object'||!isSpecies(f.spot,f.name))return null;const info=speciesInfo(f.spot,f.name),weight=cleanNumber(f.weight,0,500),length=cleanNumber(f.length,0,500);return{id:String(f.id||'').replace(/[^\w-]/g,'').slice(0,72)||'fish-'+crypto.randomUUID(),name:f.name,spot:f.spot,weight,length,grade:Math.round(cleanNumber(f.grade,0,4)),price:Math.round(cleanNumber(f.price,0,1e9)),tint:info[5],score:Math.round(cleanNumber(f.score,0,1e9)),status:['kept','released','sold'].includes(f.status)?f.status:'kept',when:typeof f.when==='string'?f.when.slice(0,35):''}}
function sanitizedInventory(raw){if(!raw||typeof raw!=='object')throw Error('세이브 데이터 형식이 잘못됐어.');const fish=Array.isArray(raw.fish)?raw.fish.slice(0,200).map(validateFish).filter(Boolean):[],records=Array.isArray(raw.records)?raw.records.slice(0,300).map(validateFish).filter(Boolean):[];const rods=Array.isArray(raw.rods)?raw.rods.filter(x=>['bamboo','graphite','carbon','moon'].includes(x)):['bamboo'];if(!rods.includes('bamboo'))rods.unshift('bamboo');const rod=rods.includes(raw.rod)?raw.rod:'bamboo';const baitStock={};for(const b of ['shrimp','lure','glow'])baitStock[b]=Math.floor(cleanNumber(raw.baitStock?.[b],0,1000000));const journal={};for(const spot of regions){for(const f of allSpecies[spot]){const k=key(spot,f[0]),x=raw.journal?.[k];if(!x||typeof x!=='object')continue;const catches=Math.floor(cleanNumber(x.catches,0,100000000));if(!catches)continue;journal[k]={caught:true,catches,bestWeight:cleanNumber(x.bestWeight,0,500),bestLength:cleanNumber(x.bestLength,0,500)}}}return{money:cleanNumber(raw.money,0,1e12),fish,records,rods,rod,baitStock,journal,badges:Array.isArray(raw.badges)?raw.badges.filter(x=>typeof x==='string'&&x.length<=40).slice(0,30):[]}}
function sanitizedSettings(v){const s=v&&typeof v==='object'?v:{},result={};if(regions.includes(s.spot))result.spot=s.spot;if(['clear','rain','cloud','fog','storm'].includes(s.weather))result.weather=s.weather;if(Number.isFinite(+s.time))result.time=cleanNumber(s.time,0,24);if(['worm','shrimp','glow','lure'].includes(s.bait))result.bait=s.bait;if(['festival','arcade','relaxed','reality'].includes(s.biteMode))result.biteMode=s.biteMode;for(const k of ['autoTime','weatherAuto'])if(typeof s[k]==='boolean')result[k]=s[k];if(['pixel','smooth'].includes(s.quality))result.quality=s.quality;if(Number.isFinite(+s.volume))result.volume=cleanNumber(s.volume,0,1);result.restProps={};for(const k of ['beer','smoke','sashimi'])result.restProps[k]=s.restProps?.[k]!==false;return result}
const say=x=>{const status=$('saveCodeStatus');status.textContent=x;status.setAttribute('role','status')};
async function exportCode(){try{
 R.save();R.persistSettings();const payload={format:'STILLWATER_SAVE',version:2,date:new Date().toISOString(),inventory:sanitizedInventory(inv),settings:sanitizedSettings(JSON.parse(localStorage.getItem(R.settingsKey)||'{}'))};
 const data=textToBytes(JSON.stringify(payload)),result=await packed(data),code=`SW2${result.mode}.${b64url(result.bytes)}.${hash(result.bytes)}`;
 $('saveCodeText').value=code;try{await navigator.clipboard.writeText(code);say(`세이브 코드 복사 완료 · ${code.length.toLocaleString()}자 · 서버 전송 없음`)}catch{$('saveCodeText').select();say('코드가 생성됐어. 복사 버튼이 제한된 브라우저라면 직접 전체 선택해 복사해줘.')}return code;
 }catch(e){say('코드를 만들지 못했어: '+e.message);return null}}
async function importCode(){try{
 const code=$('saveCodeText').value.trim().replace(/\s/g,''),parts=code.match(/^SW2([GJ])\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/);
 if(!parts)throw Error('SW2 세이브 코드가 아니야.');const bytes=unb64(parts[2]);if(hash(bytes)!==parts[3])throw Error('코드가 일부 손상됐거나 누락됐어.');const uncompressed=await unpack(parts[1],bytes);if(uncompressed.length>1000000)throw Error('허용 크기를 초과했어.');const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(uncompressed));
 if(payload.format!=='STILLWATER_SAVE'||payload.version!==2)throw Error('지원하지 않는 세이브 버전이야.');const safeInventory=sanitizedInventory(payload.inventory),safeSettings=sanitizedSettings(payload.settings);
 if(!confirm(`현재 이 브라우저의 세이브를 덮어쓰고 불러올까?\n보유 물고기 ${safeInventory.fish.length}마리 · 도감 기록 ${Object.keys(safeInventory.journal).length}종`)){say('불러오기를 취소했어. 현재 기록은 그대로야.');return false}
 localStorage.setItem(R.storageKey,JSON.stringify(safeInventory));localStorage.setItem(R.settingsKey,JSON.stringify(safeSettings));say('기기 안에 세이브를 복원했어. 새로고침 중…');window.location.reload();return true;
 }catch(e){say('불러오기 실패: '+e.message);return false}}
$('journalBtn')?.addEventListener('click',open);$('pauseJournalButton')?.addEventListener('click',open);
$('journalClose')?.addEventListener('click',close);$('journalOverlay')?.addEventListener('click',e=>{if(e.target===$('journalOverlay'))close()});
$('journalPrev')?.addEventListener('click',()=>flip(-1));$('journalNext')?.addEventListener('click',()=>flip(1));
document.querySelectorAll('[data-journal-region]').forEach(b=>b.addEventListener('click',()=>jump(b.dataset.journalRegion)));
document.addEventListener('keydown',e=>{if($('journalOverlay').hidden)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}else if(e.code==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();flip(-1)}else if(e.code==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();flip(1)}},true);
$('saveCodeExport')?.addEventListener('click',exportCode);$('saveCodeImport')?.addEventListener('click',importCode);
window.StillwaterExtras={recordCatch,open,close,render,exportCode,importCode,sizeTier,migrate};
})();
