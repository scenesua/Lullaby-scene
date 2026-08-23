(()=>{
  'use strict';
  if(!window.LullabyTrainJourney||typeof startScene!=='function')return;
  const configs={
    ferry_journey:{
      icon:'⛴',title:['Night Ferry Journey','야간 페리 여정'],description:['Cast off, cross dark open water through the night, and wake as the ferry reaches shore.','부두를 떠나 어두운 바다를 밤새 건넌 뒤 해안에 닿으며 깨어나는 여정입니다.'],
      durations:[128667,720000,720000,98065],phases:[['Casting off','부두를 떠나는 중'],['Leaving harbor','항구를 벗어나는 중'],['Night crossing','밤바다를 건너는 중'],['Harbor approach','항구에 접근하는 중'],['Reaching shore','해안에 닿는 중']],
      nodes:{departure:['/audio/scenes/ferry_journey/ferry_journey_departure_001.ogg',128.667],bed:['/audio/scenes/ferry_journey/ferry_journey_bed_001.ogg',221.686],arrival:['/audio/scenes/ferry_journey/ferry_journey_arrival_001.ogg',98.065]},roles:{departure:['departure'],bed:['bed'],arrival:['arrival']},gains:{departure:.54,bed:.52,arrival:.52},
      macros:[['Engine presence','엔진 존재감'],['Deck activity','갑판 활동감'],['Wave texture','파도 질감'],['Night depth','밤의 깊이']],detail:['Steady night crossing','고른 야간 항해']
    },
    spacecraft_journey:{
      icon:'🚀',title:['Spacecraft Drift','우주선 표류'],description:['Leave orbit, settle into a long deep-space drift, approach the destination, and dock quietly.','궤도를 떠나 깊은 우주를 오래 표류한 뒤 목적지에 접근해 조용히 도킹합니다.'],
      durations:[17824,600000,600000,17824],phases:[['Leaving orbit','궤도를 떠나는 중'],['Cabin settling','기내가 안정되는 중'],['Deep-space drift','깊은 우주를 표류하는 중'],['Destination approach','목적지에 접근하는 중'],['Quiet docking','조용히 도킹하는 중']],
      nodes:{transition:['/audio/scenes/spacecraft_journey/spacecraft_journey_transition_001.ogg',17.824],bed:['/audio/scenes/spacecraft_journey/spacecraft_journey_bed_001.ogg',160.007]},roles:{departure:['transition'],bed:['bed'],arrival:['transition']},gains:{transition:.50,bed:.48},
      macros:[['Drive presence','구동계 존재감'],['Cabin activity','기내 활동감'],['Hull texture','선체 질감'],['Night depth','밤의 깊이']],detail:['Stable sleep-safe drift','안정적인 수면용 표류']
    },
    submarine_journey:{
      icon:'◒',title:['Submarine Voyage','잠수함 항해'],description:['Dive below the surface, settle into a deep cruise with rare sonar, then rise into a quiet arrival.','수면 아래로 잠항해 드문 소나와 함께 심해를 순항한 뒤 조용히 부상합니다.'],
      durations:[47282,480000,480000,54232],phases:[['Diving','수면 아래로 잠항하는 중'],['Settling at depth','심도에 안정되는 중'],['Deep-water cruise','심해를 순항하는 중'],['Ascending','부상하는 중'],['Reaching surface','수면에 도달하는 중']],
      nodes:{departure:['/audio/scenes/submarine_journey/submarine_journey_departure_001.ogg',47.282],engine:['/audio/scenes/submarine_journey/submarine_journey_engine_bed_001.ogg',133.038],water:['/audio/scenes/submarine_journey/submarine_journey_water_bed_001.ogg',120.006],arrival:['/audio/scenes/submarine_journey/submarine_journey_arrival_001.ogg',54.232]},roles:{departure:['departure'],bed:['engine','water'],arrival:['arrival']},gains:{departure:.54,engine:.43,water:.24,arrival:.52},sonar:'/audio/scenes/submarine_journey/submarine_sonar_event_001.ogg',
      macros:[['Engine presence','엔진 존재감'],['Crew activity','승조원 활동감'],['Water pressure','수압 질감'],['Night depth','밤의 깊이']],detail:['Rare distant sonar','멀리서 들리는 드문 소나']
    }
  };
  const base={start:startScene,pause:pauseScene,stop:stopScene,phaseFor,updateUi:updateSceneUi,updateAudio:updateSceneAudio};
  const playButton=document.getElementById('scenePlay');if(playButton)playButton.removeEventListener('click',base.start);
  const media={};let audibleRole=null,lastElapsed=-1,sonarNode=null,sonarTimer=null,roleGeneration=0;
  const config=()=>configs[activeJourneyId]||null;
  const korean=()=>((window.LullabyI18n?.language||document.documentElement.lang||'en')==='ko');
  const local=value=>value[korean()?1:0];
  function boundaries(total,cfg){
    if(total<1200000)return{departure:total*.06,settle:total*.18,approach:total*.82,arrival:total*.94};
    return{departure:cfg.durations[0],settle:cfg.durations[1],approach:total-cfg.durations[2],arrival:total-cfg.durations[3]};
  }
  function phaseInfo(ms,total,cfg=config()){
    if(!cfg)return null;const b=boundaries(total,cfg);
    if(ms<b.departure)return[cfg.phases[0],false,'departure'];if(ms<b.settle)return[cfg.phases[1],false,'bed'];if(ms<b.approach)return[cfg.phases[2],false,'bed'];if(ms<b.arrival)return[cfg.phases[3],false,'bed'];if(ms<total)return[cfg.phases[4],false,'arrival'];return[['Arrived','도착'],false,null];
  }
  async function ensureNodes(){
    const cfg=config();if(!cfg)return;await ensureContext();media[cfg.title[0]]??={};const bucket=media[cfg.title[0]];
    for(const [key,[url]] of Object.entries(cfg.nodes))if(!bucket[key]){const node=makeMediaNode(url,{loop:key!=='departure'&&key!=='arrival'&&key!=='transition',preload:key==='departure'||key==='transition'?'auto':'none'});node.gain.gain.value=0;bucket[key]=node}
    if(cfg.sonar&&!sonarNode){sonarNode=makeMediaNode(cfg.sonar,{loop:false,preload:'none'});sonarNode.gain.gain.value=.04}
  }
  function activeNodes(){const cfg=config();return cfg?media[cfg.title[0]]||{}:{}}
  function pauseNodes(reset=false){for(const bucket of Object.values(media))for(const node of Object.values(bucket)){node.el.pause();node.gain.gain.value=0;if(reset)try{node.el.currentTime=0}catch{}}sonarNode?.el.pause()}
  function offset(key,role,ms,total,cfg){const b=boundaries(total,cfg),start=role==='arrival'?b.arrival:role==='bed'?b.departure:0;return Math.max(0,(ms-start)/1000)%cfg.nodes[key][1]}
  async function activateRole(role,ms,total){
    const cfg=config(),jumped=lastElapsed>=0&&Math.abs(ms-lastElapsed)>2500;if(!cfg||(role===audibleRole&&!jumped))return;
    const generation=++roleGeneration,previous=audibleRole,nodes=activeNodes();audibleRole=role;
    if(previous&&previous!==role)for(const key of cfg.roles[previous]){const old=nodes[key];old?.gain.gain.setTargetAtTime(0,ctx.currentTime,.08);setTimeout(()=>{if(!cfg.roles[audibleRole]?.includes(key))old?.el.pause()},320)}
    if(!role||!scenePlaying)return;
    for(const key of cfg.roles[role]){const node=nodes[key];node.el.preload='auto';try{node.el.currentTime=offset(key,role,ms,total,cfg)}catch{}await node.el.play();if(generation!==roleGeneration&&!cfg.roles[audibleRole]?.includes(key))node.el.pause()}
  }
  function updateAudio(ms){
    const cfg=config();if(!cfg||!ctx)return;const total=Math.max(60000,durationMinutes*60000),role=phaseInfo(ms,total,cfg)[2];void activateRole(role,ms,total).catch(console.error);
    const factor=(.88+.18*macro.engine)*(.96+.05*macro.activity)*(.96+.04*macro.turbulence)*(1-.08*macro.night);
    for(const [key,node] of Object.entries(activeNodes())){const on=role&&cfg.roles[role].includes(key),gain=on?cfg.gains[key]*(role==='bed'?factor:1):0;node.gain.gain.setTargetAtTime(gain,ctx.currentTime,.22)}
    if(sonarNode)sonarNode.gain.gain.setTargetAtTime(.08*(.65+.35*macro.activity)*(1-.08*macro.night),ctx.currentTime,.4);lastElapsed=ms;
  }
  function scheduleSonar(){clearTimeout(sonarTimer);const cfg=config();if(!cfg?.sonar||!scenePlaying)return;sonarTimer=setTimeout(async()=>{if(config()?.sonar&&scenePlaying){try{sonarNode.el.currentTime=0;await sonarNode.el.play()}catch{}scheduleSonar()}},180000+Math.random()*240000)}
  function updateUi(){
    const cfg=config(),elapsed=currentElapsed(),total=durationMinutes*60000,remaining=Math.max(0,total-elapsed),info=phaseInfo(elapsed,total,cfg),phase=local(info[0]);
    const values={phaseLabel:phase,elapsedLabel:fmt(elapsed,true),remainingLabel:fmt(remaining),seatbeltLabel:korean()?'운행 중':'In motion',eventLabel:local(cfg.detail)};
    for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}const progress=document.getElementById('journeyProgress');if(progress)progress.style.width=`${Math.min(100,elapsed/total*100)}%`;
    const track=document.querySelector('.journey-track');if(track){track.setAttribute('aria-valuenow',String(Math.round(elapsed/1000)));track.setAttribute('aria-valuetext',`${phase} · ${fmt(elapsed,true)}`)}
    updateAudio(elapsed);updateNowPlaying();if(elapsed>=total)stopScene(true);
  }
  async function start(){try{await ensureNodes();if(scenePlaying){pause();return}sceneStartedAt=performance.now();scenePlaying=true;lastElapsed=-1;updateAudio(currentElapsed());scheduleSonar();if(playButton)playButton.textContent=korean()?'Ⅱ 일시정지':'Ⅱ Pause';setStatus(`${local(config().title)} ${korean()?'재생 중':'playing'}`);clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi()}catch(error){console.error(error);scenePlaying=false;roleGeneration++;pauseNodes();audibleRole=null;setStatus(korean()?'여정 오디오를 시작하지 못했습니다.':'Could not start journey audio.') }}
  function pause(){if(!scenePlaying)return;pausedAt=currentElapsed();scenePlaying=false;roleGeneration++;pauseNodes();audibleRole=null;clearTimeout(sonarTimer);clearInterval(sceneTimer);if(playButton)playButton.textContent=korean()?'▶ 계속 재생':'▶ Resume';setStatus(korean()?'일시정지됨':'Paused');updateNowPlaying()}
  function stop(arrived=false){scenePlaying=false;pausedAt=0;clearTimeout(sonarTimer);clearInterval(sceneTimer);roleGeneration++;pauseNodes(true);audibleRole=null;lastElapsed=-1;if(playButton)playButton.textContent=korean()?'▶ 장면 시작':'▶ Start journey';const cfg=config(),values={phaseLabel:arrived?(korean()?'도착':'Arrived'):'Ready',elapsedLabel:'00:00',remainingLabel:fmt(durationMinutes*60000),seatbeltLabel:'—',eventLabel:cfg?local(cfg.detail):'None'};for(const[id,value]of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}const progress=document.getElementById('journeyProgress');if(progress)progress.style.width='0';setStatus(arrived?(korean()?'여정이 종료되었습니다.':'Journey complete.'):(korean()?'정지됨':'Stopped'));updateNowPlaying()}
  startScene=async function(){return config()?start():base.start()};pauseScene=function(){return config()?pause():base.pause()};stopScene=function(arrived=false){return config()?stop(arrived):base.stop(arrived)};phaseFor=function(ms,total){const info=phaseInfo(ms,total);return info?[local(info[0]),false]:base.phaseFor(ms,total)};updateSceneAudio=function(ms){return config()?updateAudio(ms):base.updateAudio(ms)};updateSceneUi=function(){return config()?updateUi():base.updateUi()};if(playButton)playButton.addEventListener('click',startScene);
  function step(direction){const cfg=config(),total=Math.max(60000,durationMinutes*60000),b=boundaries(total,cfg),steps=[0,b.departure,b.settle,b.approach,b.arrival,total-1],elapsed=currentElapsed();let index=steps.findIndex(value=>value>elapsed+500);if(direction<0){index=-1;for(let i=steps.length-1;i>=0;i--)if(steps[i]<elapsed-500){index=i;break}}if(index<0)index=direction<0?0:steps.length-1;window.LullabyJourneyRuntime?.seekToMs(steps[index])}
  document.addEventListener('click',event=>{if(!config()||(event.target?.id!=='journeyPrevPhase'&&event.target?.id!=='journeyNextPhase'))return;event.preventDefault();event.stopImmediatePropagation();step(event.target.id==='journeyPrevPhase'?-1:1)},true);
  function addSelectors(){const row=document.getElementById('journeySelector');if(!row)return;for(const [id,cfg] of Object.entries(configs)){const button=document.createElement('button');button.type='button';button.dataset.journey=id;button.innerHTML=`${cfg.icon} <span>${cfg.title[0].split(' ')[0]}</span>`;row.appendChild(button)}row.addEventListener('click',event=>{if(event.target.closest('[data-journey]'))render()})}
  function render(){const labels={ferry_journey:['Ferry','페리'],spacecraft_journey:['Spacecraft','우주선'],submarine_journey:['Submarine','잠수함']};for(const[id,value]of Object.entries(labels)){const span=document.querySelector(`[data-journey="${id}"] span`);if(span)span.textContent=local(value)}const cfg=config();if(!cfg)return;document.querySelectorAll('[data-journey]').forEach(button=>{button.classList.toggle('active',button.dataset.journey===activeJourneyId);button.setAttribute('aria-pressed',String(button.dataset.journey===activeJourneyId))});const title=document.querySelector('.aircraft-title-row h3'),desc=document.querySelector('.aircraft-title-row p'),icon=document.querySelector('.aircraft-icon');if(title)title.textContent=local(cfg.title);if(desc)desc.textContent=local(cfg.description);if(icon)icon.textContent=cfg.icon;document.querySelectorAll('[data-inspector-mode="journey"] h3').forEach(el=>el.textContent=local(cfg.title));const status=document.querySelectorAll('.journey-status small');if(status[0])status[0].textContent=korean()?'여정 단계':'Journey phase';if(status[3])status[3].textContent=korean()?'객실 상태':'Cabin state';document.querySelectorAll('.mobile-macros label span,.desktop-macros label span').forEach((el,index)=>el.textContent=local(cfg.macros[index%4]));const event=document.getElementById('eventLabel');if(event)event.textContent=local(cfg.detail);if(!scenePlaying&&pausedAt===0){if(playButton)playButton.textContent=korean()?'▶ 장면 시작':'▶ Start journey';document.getElementById('phaseLabel').textContent='Ready'}}
  addSelectors();render();document.addEventListener('lullaby-language-changed',()=>setTimeout(render));window.LullabyRemainingJourneys={configs,get active(){return activeJourneyId},get audibleRole(){return audibleRole},get activeNodes(){return activeNodes()}};
})();
