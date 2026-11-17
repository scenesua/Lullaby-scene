
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
 v.caught=true;v.catches=(Number(v.catches)||0)+1;
 v.bestWeight=Math.max(Number(v.bestWeight)||0,cleanNumber(f.weight,0,500));
 v.bestLength=Math.max(Number(v.bestLength)||0,cleanNumber(f.length,0,500));
 inv.journal[k]=v;
 // Main game's recordCatch will save the inventory after this hook runs.
}
const tiers=['XS','S','M','L','XL','XXL'];
function sizeTier(n,min,max){const ratio=max>min?Math.max(0,Math.min(1,(n-min)/(max-min))):0;return tiers[ratio<.10?0:ratio<.25?1:ratio<.45?2:ratio<.65?3:ratio<.85?4:5];}
const kind=name=>/광어|도다리|가자미/.test(name)?'flat':/갈치|학꽁치|미꾸라지|가물치|메기|대구/.test(name)?'long':/붕어|잉어|도미|돔|블루길|떡붕어|향어/.test(name)?'round':'normal';
function fishPicture(name,tint,unseen=false){
 const shape=kind(name),body=shape==='flat'?`<ellipse cx="56" cy="30" rx="37" ry="15"/>`:shape==='long'?`<path d="M18 29 Q35 18 75 24 Q96 23 103 29 Q89 36 66 34 Q34 39 18 29Z"/>`:shape==='round'?`<path d="M17 29 Q31 3 63 8 Q91 11 96 30 Q83 52 53 50 Q28 46 17 29Z"/>`:`<path d="M17 29 Q32 12 64 15 Q85 17 101 29 Q80 44 55 43 Q32 42 17 29Z"/>`;
 const color=unseen?'#1e1a18':tint,accent=unseen?'#1e1a18':'#665946';
 return `<svg viewBox="0 0 126 62" role="img" aria-label="${unseen?'미발견 물고기':esc(name)}"><g fill="${color}" stroke="${accent}" stroke-width="1.2"><path d="M22 28 L2 8 L2 53 L22 32Z"/>${body}<path d="M37 18 L52 5 L66 18Z"/><path d="M45 39 L57 56 L67 39Z"/></g>${unseen?'':`<circle cx="92" cy="27" r="2.6" fill="#1a2422"/><path d="M68 20 Q75 29 66 40" fill="none" stroke="#645b49" stroke-width="1.5"/>`}</svg>`;
}
let current='river',page=0,selection=0,lastFocus=null;
function statsFor(spot,name){const raw=inv.journal?.[key(spot,name)];return raw&&raw.catches>0?raw:null}
function render(){
 const fishes=allSpecies[current],start=page*9,shown=fishes.slice(start,start+9),sum=fishes.filter(f=>statsFor(current,f[0])).length;
 $('journalRegion').textContent=`${regionNames[current]} · ${sum}/18 발견`;
 $('journalPage').textContent=`${page+1} / 2`;
 $('journalPrev').disabled=page===0;$('journalNext').disabled=page===1;
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
 const [description,tmi]=C.notes[current][fish[0]];
 notebook.innerHTML=`<div class="diaryBigFish">${fishPicture(fish[0],fish[5])}</div><p class="diaryOverline">SPECIMEN · ${String(selection+1).padStart(2,'0')}</p><h2>${esc(fish[0])}</h2><div class="diaryCount">누적 포획 <strong>${Math.floor(info.catches).toLocaleString('ko-KR')}회</strong></div><div class="diaryMeasures"><div><span>역대 최대 무게</span><strong>${info.bestWeight.toFixed(2)}<small>kg</small></strong><em>${wt}</em></div><div><span>역대 최대 길이</span><strong>${info.bestLength.toFixed(0)}<small>cm</small></strong><em>${lt}</em></div></div><div class="diaryStory"><p class="diaryBio">${esc(description)}</p><p class="diaryTmi">${esc(tmi)}</p></div>`;
}
function jump(spot){if(!regions.includes(spot))return;current=spot;page=0;selection=0;render();$('journalBook').classList.remove('pageFlip');void $('journalBook').offsetWidth;$('journalBook').classList.add('pageFlip')}
function flip(step){const next=page+step;if(next<0||next>1)return;page=next;selection=page*9;render();$('journalBook').classList.remove('pageFlip');void $('journalBook').offsetWidth;$('journalBook').classList.add('pageFlip')}
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
function sanitizedInventory(raw){if(!raw||typeof raw!=='object')throw Error('세이브 데이터 형식이 잘못됐어.');const fish=Array.isArray(raw.fish)?raw.fish.slice(0,200).map(validateFish).filter(Boolean):[],records=Array.isArray(raw.records)?raw.records.slice(0,300).map(validateFish).filter(Boolean):[];const rods=Array.isArray(raw.rods)?raw.rods.filter(x=>['bamboo','graphite','carbon','moon'].includes(x)):['bamboo'];if(!rods.includes('bamboo'))rods.unshift('bamboo');const rod=rods.includes(raw.rod)?raw.rod:'bamboo';const baitStock={};for(const b of ['shrimp','lure','glow'])baitStock[b]=Math.floor(cleanNumber(raw.baitStock?.[b],0,1000000));const journal={};for(const spot of regions){for(const f of allSpecies[spot]){const k=key(spot,f[0]),x=raw.journal?.[k];if(!x||typeof x!=='object')continue;const catches=Math.floor(cleanNumber(x.catches,0,100000000));if(!catches)continue;journal[k]={caught:true,catches,bestWeight:cleanNumber(x.bestWeight,0,500),bestLength:cleanNumber(x.bestLength,0,500)}}}return{money:cleanNumber(raw.money,0,1e12),fish,records,rods,rod,baitStock,journal}}
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

