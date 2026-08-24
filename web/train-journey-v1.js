(()=>{
  'use strict';
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof startScene!=='function')return;

  const AIRCRAFT_ID='passenger_aircraft_cabin',TRAIN_ID='train_journey';
  const DEPARTURE_MS=35183,LEAVING_CITY_END_MS=480000,APPROACH_MS=480000,ARRIVAL_MS=32236;
  const TRAIN_FX=[
    {gain:1,cutoff:10500,gainSeconds:3,filterSeconds:5,roleFadeSeconds:6,visualMs:650,seekDelayMs:110},
    {gain:.98,cutoff:9000,gainSeconds:7,filterSeconds:10,roleFadeSeconds:12,visualMs:950,seekDelayMs:160},
    {gain:.9,cutoff:6800,gainSeconds:14,filterSeconds:20,roleFadeSeconds:14,visualMs:1450,seekDelayMs:230},
    {gain:.96,cutoff:8800,gainSeconds:9,filterSeconds:14,roleFadeSeconds:14,visualMs:1100,seekDelayMs:180},
    {gain:.94,cutoff:9800,gainSeconds:6,filterSeconds:9,roleFadeSeconds:10,visualMs:800,seekDelayMs:130}
  ];
  const SOURCES={
    departure:['/audio/scenes/train_journey/train_journey_departure_001.ogg',35.183],
    bed:['/audio/scenes/train_journey/train_journey_bed_001.ogg?v=2',234.671],
    arrival:['/audio/scenes/train_journey/train_journey_arrival_001.ogg',32.236]
  };
  const EVENT_SOURCE='/audio/scenes/train_journey/train_rail_event_001.ogg';
  const aircraft={start:startScene,pause:pauseScene,stop:stopScene,phaseFor,updateUi:updateSceneUi,updateAudio:updateSceneAudio};
  const playButton=document.getElementById('scenePlay');
  if(playButton)playButton.removeEventListener('click',aircraft.start);
  const trainNodes={departure:null,bed:null,arrival:null};
  let audibleRole=null,roleGeneration=0,eventNode=null,eventTimer=null,eventLabelUntil=0;

  const isTrain=()=>activeJourneyId===TRAIN_ID;
  const isEnglish=()=>(window.LullabyI18n?.language||document.documentElement.lang||'en')!=='ko';
  const copy=()=>isEnglish()?{
    aircraft:'Passenger Aircraft Cabin',train:'Overnight Train Journey',
    aircraftDesc:'Ground roll, takeoff, a long cruise, descent, and arrival on a night flight.',
    trainDesc:'Doors close, the train gathers speed, settles into a long night run, then slows into the destination.',
    phase:'Journey phase',seatbelt:'Cabin state',event:'ACTIVE JOURNEY DETAIL',none:'Steady rail rhythm',
    hint:'Set the full sleep duration and the departure, night run, and arrival unfold inside it.',sleepProtect:'The train journey avoids sudden random events while you sleep.',
    macros:['Rail rhythm','Carriage activity','Track texture','Night depth'],aircraftMacros:['Engine presence','Cabin activity','Turbulence','Night depth'],start:'▶ Start journey',
    playing:'Overnight Train Journey playing',error:'Could not start Train audio. Reload and try again.'
  }:{
    aircraft:'Passenger Aircraft Cabin',train:'야간 열차 여정',
    aircraftDesc:'야간 여객기의 지상 이동, 이륙, 긴 순항, 하강과 도착.',
    trainDesc:'문이 닫히고 속도를 올린 열차가 긴 야간 운행을 지나 목적지에 천천히 도착합니다.',
    phase:'여정 단계',seatbelt:'객실 상태',event:'현재 여정 디테일',none:'고른 레일 리듬',
    hint:'전체 수면 시간을 정하면 출발, 야간 운행, 도착이 그 안에서 자연스럽게 이어집니다.',sleepProtect:'수면 중 갑작스러운 랜덤 이벤트 없이 여정이 이어집니다.',
    macros:['레일 리듬','객실 활동감','선로 질감','밤의 깊이'],aircraftMacros:['엔진 존재감','기내 활동감','난기류','밤의 깊이'],start:'▶ 장면 시작',
    playing:'야간 열차 여정 재생 중',error:'열차 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
  };

  function trainBoundaries(total){
    if(total<1200000)return{departure:total*.06,leaving:total*.18,approach:total*.82,arrival:total*.94};
    return{departure:DEPARTURE_MS,leaving:LEAVING_CITY_END_MS,approach:total-APPROACH_MS,arrival:total-ARRIVAL_MS};
  }
  function trainPhaseFor(ms,total){
    const b=trainBoundaries(total);
    if(ms<b.departure)return['Departing',false];
    if(ms<b.leaving)return['Leaving city',false];
    if(ms<b.approach)return['Night run',false];
    if(ms<b.arrival)return['Approach',false];
    if(ms<total)return['Arriving',false];
    return['Arrived',false];
  }
  function roleFor(ms,total){
    if(ms>=total)return null;
    const b=trainBoundaries(total),departureFade=Math.min(TRAIN_FX[1].roleFadeSeconds*1000,b.departure);
    if(ms>=b.arrival-TRAIN_FX[4].roleFadeSeconds*1000)return'arrival';
    if(ms>=b.departure-departureFade)return'bed';
    return'departure';
  }
  function trainPhaseIndex(ms,total){const b=trainBoundaries(total);if(ms<b.departure)return 0;if(ms<b.leaving)return 1;if(ms<b.approach)return 2;if(ms<b.arrival)return 3;return ms<total?4:5}
  function trainStagePoints(total){const b=trainBoundaries(total);return[
    {label:['Departing','출발'],ms:0},{label:['Leaving city','도시 이탈'],ms:b.departure},{label:['Night run','야간 운행'],ms:b.leaving},{label:['Approach','접근'],ms:b.approach},{label:['Arriving','도착'],ms:b.arrival}
  ]}
  function trainTransitionProfile(ms,total){return TRAIN_FX[Math.min(4,trainPhaseIndex(ms,total))]}
  function offsetFor(role,ms,total){
    const b=trainBoundaries(total);
    const start=role==='departure'?0:role==='arrival'?b.arrival:b.departure;
    return Math.max(0,(ms-start)/1000)%SOURCES[role][1];
  }
  async function ensureTrainNodes(){
    await ensureContext();
    for(const [role,[url]] of Object.entries(SOURCES))if(!trainNodes[role]){
      const node=makeMediaNode(url,{loop:role==='bed',preload:'auto'});node.gain.gain.value=0;trainNodes[role]=node;
    }
    if(!eventNode){eventNode=makeMediaNode(EVENT_SOURCE,{loop:false,preload:'none'});eventNode.gain.gain.value=.1}
  }
  function pauseTrainEvent(){clearTimeout(eventTimer);eventTimer=null;eventLabelUntil=0;if(eventNode){eventNode.el.pause();try{eventNode.el.currentTime=0}catch{}}}
  function scheduleTrainEvent(delayMs=180000+Math.random()*240000){clearTimeout(eventTimer);if(!window.LullabyJourneyEvents?.enabled||!scenePlaying||!isTrain())return;eventTimer=setTimeout(async()=>{const phase=trainPhaseFor(currentElapsed(),Math.max(60000,durationMinutes*60000))[0];if(!['Leaving city','Night run','Approach'].includes(phase)){scheduleTrainEvent(90000);return}try{eventNode.el.currentTime=0;eventLabelUntil=performance.now()+1500;await eventNode.el.play()}catch(error){console.warn('train event unavailable',error)}scheduleTrainEvent()},delayMs)}
  function pauseTrainNodes(reset=false){pauseTrainEvent();for(const node of Object.values(trainNodes))if(node){node.el.pause();if(reset)try{node.el.currentTime=0}catch{}node.gain.gain.value=0}}
  async function activateTrainRole(role,ms,total,fadeSeconds){
    if(role===audibleRole)return;
    const generation=++roleGeneration,previous=audibleRole;audibleRole=role;
    if(previous&&previous!==role){const old=trainNodes[previous];old?.gain.gain.setTargetAtTime(0,ctx.currentTime,fadeSeconds/3);setTimeout(()=>{if(audibleRole!==previous)old?.el.pause()},fadeSeconds*1000)}
    if(!role||!scenePlaying)return;
    const node=trainNodes[role];
    node.el.preload='auto';
    try{node.el.currentTime=offsetFor(role,ms,total)}catch{}
    await node.el.play();
    if(generation!==roleGeneration&&audibleRole!==role)node.el.pause();
  }
  function updateTrainAudio(ms){
    if(!ctx)return;
    const total=Math.max(60000,durationMinutes*60000),role=roleFor(ms,total),phaseFx=trainTransitionProfile(ms,total),fadeSeconds=role==='bed'?TRAIN_FX[1].roleFadeSeconds:role==='arrival'?TRAIN_FX[4].roleFadeSeconds:phaseFx.roleFadeSeconds;
    const roleChanged=role!==audibleRole;void activateTrainRole(role,ms,total,fadeSeconds).catch(console.error);
    const rhythm=.46+.18*macro.engine,carriage=.96+.06*macro.activity,texture=.96+.05*macro.turbulence,night=1-.10*macro.night;
    const gain=(role==='bed'?rhythm*carriage*texture*night:role==='departure'?.58:role==='arrival'?.56:0)*phaseFx.gain;
    for(const [key,node] of Object.entries(trainNodes))if(node){node.gain.gain.setTargetAtTime(key===role?gain:0,ctx.currentTime,(roleChanged?fadeSeconds:phaseFx.gainSeconds)/3);node.filter.frequency.setTargetAtTime(phaseFx.cutoff,ctx.currentTime,phaseFx.filterSeconds/3)}
    if(eventNode)eventNode.gain.gain.setTargetAtTime(.1*(.7+.3*macro.activity)*(1-.12*macro.night),ctx.currentTime,.5);
  }
  function updateTrainUi(){
    const elapsed=currentElapsed(),total=durationMinutes*60000,remaining=Math.max(0,total-elapsed),[phase]=trainPhaseFor(elapsed,total);
    const eventLabel=!window.LullabyJourneyEvents?.enabled?(isEnglish()?'Off':'꺼짐'):performance.now()<eventLabelUntil?(isEnglish()?'Distant rail joint':'멀리서 전해지는 레일 이음'):copy().none;
    const values={phaseLabel:phase,elapsedLabel:fmt(elapsed,true),remainingLabel:fmt(remaining),seatbeltLabel:phase==='Arrived'?(isEnglish()?'Arrived':'도착'):(isEnglish()?'In motion':'운행 중'),eventLabel};
    for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}
    const progress=document.getElementById('journeyProgress');if(progress)progress.style.width=`${Math.min(100,elapsed/total*100)}%`;
    updateTrainAudio(elapsed);window.LullabyJourneyStageControl?.sync();updateNowPlaying();
    if(elapsed>=total)stopScene(true);
  }
  async function startTrain(){
    try{
      await ensureTrainNodes();if(scenePlaying){pauseTrain();return}
      sceneStartedAt=performance.now();scenePlaying=true;updateTrainAudio(currentElapsed());scheduleTrainEvent();
      if(playButton)playButton.textContent=isEnglish()?'Ⅱ Pause':'Ⅱ 일시정지';setStatus(copy().playing);
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(error){console.error(error);scenePlaying=false;roleGeneration++;pauseTrainNodes();audibleRole=null;setStatus(copy().error)}
  }
  function pauseTrain(){
    if(!scenePlaying)return;pausedAt=currentElapsed();scenePlaying=false;roleGeneration++;pauseTrainNodes();audibleRole=null;clearInterval(sceneTimer);
    if(playButton)playButton.textContent=isEnglish()?'▶ Resume':'▶ 계속 재생';setStatus(isEnglish()?'Paused':'일시정지됨');updateNowPlaying();
  }
  function stopTrain(arrived=false){
    scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);roleGeneration++;pauseTrainNodes(true);audibleRole=null;
    if(playButton)playButton.textContent=copy().start;
    const values={phaseLabel:arrived?'Arrived':'Ready',elapsedLabel:'00:00',remainingLabel:fmt(durationMinutes*60000),seatbeltLabel:'—',eventLabel:window.LullabyJourneyEvents?.enabled?copy().none:(isEnglish()?'Off':'꺼짐')};
    for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}
    const progress=document.getElementById('journeyProgress');if(progress)progress.style.width='0';
    setStatus(arrived?(isEnglish()?'Journey complete.':'여정이 종료되었습니다.'):(isEnglish()?'Stopped':'정지됨'));updateNowPlaying();
  }

  startScene=async function(){return isTrain()?startTrain():aircraft.start()};
  pauseScene=function(){return isTrain()?pauseTrain():aircraft.pause()};
  stopScene=function(arrived=false){return isTrain()?stopTrain(arrived):aircraft.stop(arrived)};
  phaseFor=function(ms,total){return isTrain()?trainPhaseFor(ms,total):aircraft.phaseFor(ms,total)};
  updateSceneAudio=function(ms){return isTrain()?updateTrainAudio(ms):aircraft.updateAudio(ms)};
  updateSceneUi=function(){return isTrain()?updateTrainUi():aircraft.updateUi()};
  if(playButton)playButton.addEventListener('click',startScene);

  function trainStep(direction){
    const total=Math.max(60000,durationMinutes*60000),b=trainBoundaries(total),steps=[0,b.departure,b.leaving,b.approach,b.arrival,total-1];
    const elapsed=currentElapsed();let index=steps.findIndex(value=>value>elapsed+500);if(direction<0){index=-1;for(let i=steps.length-1;i>=0;i--)if(steps[i]<elapsed-500){index=i;break}}
    if(index<0)index=direction<0?0:steps.length-1;
    return (window.LullabyJourneyRuntime?.transitionToMs||window.LullabyJourneyRuntime?.seekToMs)?.(steps[index]);
  }
  document.addEventListener('click',event=>{
    if(!isTrain()||(event.target?.id!=='journeyPrevPhase'&&event.target?.id!=='journeyNextPhase'))return;
    event.preventDefault();event.stopImmediatePropagation();trainStep(event.target.id==='journeyPrevPhase'?-1:1);
  },true);

  function injectSelector(){
    const card=document.querySelector('.aircraft-card');if(!card||document.getElementById('journeySelector'))return;
    const row=document.createElement('div');row.id='journeySelector';row.className='journey-selector';row.setAttribute('aria-label','Journey');
    row.innerHTML=`<button type="button" data-journey="${AIRCRAFT_ID}">✈ <span>Aircraft</span></button><button type="button" data-journey="${TRAIN_ID}">▰ <span>Train</span></button>`;
    card.insertAdjacentElement('beforebegin',row);
    row.addEventListener('click',event=>{const button=event.target.closest('[data-journey]');if(!button||scenePlaying)return;stopScene(false);activeJourneyId=button.dataset.journey;renderJourney();document.dispatchEvent(new CustomEvent('lullaby-journey-changed',{detail:{id:activeJourneyId}}))});
    const style=document.createElement('style');style.textContent='.journey-selector{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}.journey-selector button{border:1px solid var(--line,#343a4a);border-radius:999px;background:transparent;color:inherit;padding:9px 14px;cursor:pointer}.journey-selector button.active{border-color:#8aa8ff;background:rgba(92,126,220,.18)}';document.head.appendChild(style);
  }
  function renderJourney(){
    if(activeJourneyId!==AIRCRAFT_ID&&activeJourneyId!==TRAIN_ID)return;
    const text=copy(),train=isTrain();
    const selectorLabels={passenger_aircraft_cabin:isEnglish()?'Aircraft':'여객기',train_journey:isEnglish()?'Train':'기차'};
    for(const [id,label] of Object.entries(selectorLabels)){const span=document.querySelector(`[data-journey="${id}"] span`);if(span)span.textContent=label}
    document.querySelectorAll('[data-journey]').forEach(button=>{button.classList.toggle('active',button.dataset.journey===activeJourneyId);button.setAttribute('aria-pressed',String(button.dataset.journey===activeJourneyId))});
    const title=document.querySelector('.aircraft-title-row h3'),desc=document.querySelector('.aircraft-title-row p'),icon=document.querySelector('.aircraft-icon');
    if(title)title.textContent=train?text.train:text.aircraft;if(desc)desc.textContent=train?text.trainDesc:text.aircraftDesc;if(icon)icon.textContent=train?'▰':'✈';
    document.querySelectorAll('[data-inspector-mode="journey"] h3').forEach(el=>el.textContent=train?text.train:text.aircraft);
    const headingHint=document.querySelector('.mobile-scene-heading p'),inspectorHint=document.querySelector('[data-inspector-mode="journey"] .inspector-section:first-child .muted-copy'),sleepHint=document.querySelector('[data-inspector-mode="journey"] .inspector-section:nth-child(3) .muted-copy');
    for(const el of [headingHint,inspectorHint])if(el)el.textContent=train?text.hint:(isEnglish()?'Set the full sleep duration and the departure and arrival are placed inside it.':'전체 수면 시간을 정하면 출발부터 도착까지 그 안에 배치됩니다.');
    if(sleepHint)sleepHint.textContent=train?text.sleepProtect:(isEnglish()?'Events likely to disturb sleep are suppressed during the initial sleep-protection window.':'수면 방해 가능성이 높은 이벤트는 초기 수면 보호 구간에서 억제됩니다.');
    const statusLabels=document.querySelectorAll('.journey-status small');if(statusLabels[0])statusLabels[0].textContent=train?text.phase:(isEnglish()?'Flight phase':'비행 단계');if(statusLabels[3])statusLabels[3].textContent=train?text.seatbelt:(isEnglish()?'Seatbelt':'좌석벨트');
    const macroLabels=document.querySelectorAll('.mobile-macros label span,.desktop-macros label span');macroLabels.forEach((el,index)=>el.textContent=(train?text.macros:text.aircraftMacros)[index%4]);
    const eventHeading=document.querySelector('[data-inspector-mode="journey"] .inspector-section:nth-child(3) small');if(eventHeading)eventHeading.textContent=train?text.event:(isEnglish()?'ACTIVE RANDOM EVENT':'활성 랜덤 이벤트');
    if(!scenePlaying&&pausedAt===0){if(playButton)playButton.textContent=text.start;const event=document.getElementById('eventLabel');if(event)event.textContent=window.LullabyJourneyEvents?.enabled?(train?text.none:'None'):(isEnglish()?'Off':'꺼짐')}window.LullabyJourneyStageControl?.render();
  }
  injectSelector();
  document.addEventListener('lullaby-language-changed',()=>queueMicrotask(renderJourney));
  document.addEventListener('lullaby-journey-events-changed',event=>{if(!event.detail?.enabled)pauseTrainEvent();else if(scenePlaying&&isTrain())scheduleTrainEvent();if(isTrain()){if(scenePlaying)updateTrainUi();else{const label=document.getElementById('eventLabel');if(label)label.textContent=event.detail?.enabled?copy().none:(isEnglish()?'Off':'꺼짐')}}});
  window.LullabyTrainJourney={phaseFor:trainPhaseFor,boundaries:trainBoundaries,stagePoints:trainStagePoints,transitionProfile:trainTransitionProfile,sources:SOURCES,get active(){return isTrain()},get audibleRole(){return audibleRole}};renderJourney();
})();
