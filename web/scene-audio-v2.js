(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof getAircraftUrl!=='function')return;
  const originalStartScene=startScene,playButton=document.getElementById('scenePlay'),english=()=>(window.LullabyI18n?.language||document.documentElement.lang)!=='ko';
  if(playButton&&originalStartScene)playButton.removeEventListener('click',originalStartScene);
  let taxiNode=null,aircraftEventNode=null,aircraftEventTimer=null,aircraftEventLabelUntil=0,audiblePhase='Ready',phaseTransitionTimer=null,phaseTransitionEndTimer=null;
  let journeyEventsEnabled=localStorage.getItem('lullaby-journey-random-events')!=='off';
  const baseActiveSceneEvent=activeSceneEvent;activeSceneEvent=function(ms){return journeyEventsEnabled?baseActiveSceneEvent(ms):null};
  const aircraftFx={
    'Taxi out':{gain:.50,cutoff:12500,gainSeconds:3,filterSeconds:5,visualMs:700,seekDelayMs:120},
    Takeoff:{gain:.61,cutoff:17000,gainSeconds:.9,filterSeconds:1.8,visualMs:460,seekDelayMs:80},
    Climb:{gain:.57,cutoff:15500,gainSeconds:4,filterSeconds:6,visualMs:850,seekDelayMs:140},
    Cruise:{gain:.53,cutoff:13200,gainSeconds:12,filterSeconds:18,visualMs:1350,seekDelayMs:220},
    Descent:{gain:.54,cutoff:14500,gainSeconds:8,filterSeconds:12,visualMs:1150,seekDelayMs:190},
    Approach:{gain:.56,cutoff:15800,gainSeconds:5,filterSeconds:8,visualMs:900,seekDelayMs:150},
    Touchdown:{gain:.58,cutoff:17200,gainSeconds:1,filterSeconds:2,visualMs:500,seekDelayMs:90},
    'Taxi in':{gain:.48,cutoff:12000,gainSeconds:4,filterSeconds:6,visualMs:800,seekDelayMs:130},
    Arrived:{gain:0,cutoff:9000,gainSeconds:10,filterSeconds:14,visualMs:1250,seekDelayMs:210}
  };

  const baseEnsureSceneNode=ensureSceneNode;
  ensureSceneNode=async function(){
    await baseEnsureSceneNode();
    sceneNode.el.loop=true;sceneNode.el.preload='auto';
    if(!sceneNode.whistleGuard){
      try{
        sceneNode.src.disconnect();
        const specs=[[685,5,-6],[1191,6,-10],[2383,8,-6],[3574,8,-10],[10544,7,-18]];
        const filters=specs.map(([f,q,g])=>{const n=ctx.createBiquadFilter();n.type='peaking';n.frequency.value=f;n.Q.value=q;n.gain.value=g;return n});
        let prev=sceneNode.src;for(const n of filters){prev.connect(n);prev=n}prev.connect(sceneNode.filter);
        sceneNode.whistleGuard={filters};
      }catch(error){console.warn('aircraft whistle guard unavailable',error)}
    }
    sceneNode.filter.Q.value=.15;sceneNode.filter.frequency.value=18500;return sceneNode;
  };

  async function ensureTaxiNode(){
    if(taxiNode)return taxiNode;
    if(typeof getAircraftTaxiUrl!=='function')throw new Error('Aircraft taxi source unavailable');
    await ensureContext();taxiNode=makeCrossfadeLoopNode(await getAircraftTaxiUrl(),{durationSeconds:window.LullabyAircraftTaxiSource?.durationSeconds||180,fadeSeconds:4});
    taxiNode.el.loop=true;taxiNode.el.preload='auto';taxiNode.filter.Q.value=.08;taxiNode.filter.frequency.value=20000;taxiNode.gain.gain.value=0;
    return taxiNode;
  }
  async function ensureAircraftEventNode(){if(aircraftEventNode)return aircraftEventNode;await ensureContext();aircraftEventNode=makeMediaNode('/audio/scenes/aircraft_cabin/aircraft_chime_event_001.ogg',{loop:false,preload:'none'});aircraftEventNode.gain.gain.value=.12;return aircraftEventNode}
  async function ensureJourneyNodes(){await Promise.all([ensureSceneNode(),ensureTaxiNode(),ensureAircraftEventNode()])}
  const isTaxiPhase=phase=>phase==='Taxi out'||phase==='Taxi in';
  function scheduleAircraftEvent(delayMs=1200000+Math.random()*1500000){
    clearTimeout(aircraftEventTimer);if(!journeyEventsEnabled||!scenePlaying||activeJourneyId!=='passenger_aircraft_cabin')return;
    aircraftEventTimer=setTimeout(async()=>{const phase=phaseFor(currentElapsed(),Math.max(60000,durationMinutes*60000))[0];if(!['Cruise','Descent','Approach'].includes(phase)){scheduleAircraftEvent(180000);return}try{await ensureAircraftEventNode();aircraftEventNode.el.currentTime=0;aircraftEventLabelUntil=performance.now()+3200;await aircraftEventNode.el.play()}catch(error){console.warn('aircraft event unavailable',error)}scheduleAircraftEvent()},delayMs);
  }
  function stopAircraftEvent(){clearTimeout(aircraftEventTimer);aircraftEventTimer=null;aircraftEventLabelUntil=0;if(aircraftEventNode){aircraftEventNode.el.pause();try{aircraftEventNode.el.currentTime=0}catch{}}}

  updateSceneAudio=function(ms){
    if(!sceneNode||!taxiNode||!ctx)return;
    const total=Math.max(60000,durationMinutes*60000),[phase]=phaseFor(ms,total),event=activeSceneEvent(ms);audiblePhase=phase;
    const fx=aircraftFx[phase]||aircraftFx.Cruise,direct=Math.max(0,fx.gain*(.88+macro.engine*.18)+(event?.type==='turbulence'?.008*macro.turbulence:0)+(event?.type==='cabin'?.006*macro.activity:0));
    const taxi=isTaxiPhase(phase);
    sceneNode.gain.gain.setTargetAtTime(taxi?0:direct,ctx.currentTime,fx.gainSeconds/3);
    taxiNode.gain.gain.setTargetAtTime(taxi?Math.max(0,fx.gain*(.90+macro.engine*.10)):0,ctx.currentTime,fx.gainSeconds/3);
    sceneNode.filter.frequency.setTargetAtTime(Math.max(6500,fx.cutoff-(macro.night*1800)-((1-macro.engine)*650)),ctx.currentTime,fx.filterSeconds/3);
    taxiNode.filter.frequency.setTargetAtTime(Math.max(9000,fx.cutoff-(macro.night*900)),ctx.currentTime,fx.filterSeconds/3);
  };

  pauseScene=function(){
    if(!scenePlaying)return;pausedAt=currentElapsed();scenePlaying=false;sceneNode?.el.pause();taxiNode?.el.pause();stopAircraftEvent();clearInterval(sceneTimer);
    if(playButton)playButton.textContent=english()?'▶ Resume':'▶ 계속 재생';
    setStatus(english()?'Paused':'일시정지됨');updateNowPlaying();
  };
  stopScene=function(arrived=false){
    cancelPhaseTransition();stopAircraftEvent();scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);
    for(const node of [sceneNode,taxiNode])if(node){node.el.pause();try{node.el.currentTime=0}catch{}node.gain.gain.value=0}
    audiblePhase=arrived?'Arrived':'Ready';
    if(playButton)playButton.textContent=english()?'▶ Start journey':'▶ 장면 시작';
    const ids={phaseLabel:arrived?'Arrived':'Ready',elapsedLabel:'00:00',remainingLabel:fmt(durationMinutes*60000),seatbeltLabel:'—',eventLabel:'None'};
    for(const [id,text] of Object.entries(ids)){const el=document.getElementById(id);if(el)el.textContent=text}
    const progress=document.getElementById('journeyProgress');if(progress)progress.style.width='0';syncJourneySeekAria();
    setStatus(arrived?(english()?'Journey complete.':'여정이 종료되었습니다.'):(english()?'Stopped':'정지됨'));updateNowPlaying();
  };
  startScene=async function(){
    try{
      await ensureJourneyNodes();if(scenePlaying){pauseScene();return}
      sceneStartedAt=performance.now();scenePlaying=true;for(const node of[sceneNode,taxiNode]){node.gain.gain.cancelScheduledValues(ctx.currentTime);node.gain.gain.value=0}await Promise.all([sceneNode.el.play(),taxiNode.el.play()]);updateSceneAudio(currentElapsed());
      scheduleAircraftEvent();
      if(playButton)playButton.textContent=english()?'Ⅱ Pause':'Ⅱ 일시정지';
      setStatus(english()?'Passenger Aircraft Cabin playing':'Passenger Aircraft Cabin 재생 중');
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(err){console.error(err);scenePlaying=false;sceneNode?.el.pause();taxiNode?.el.pause();setStatus(english()?'Could not start Aircraft audio. Reload and try again.':'Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}
  };
  if(playButton)playButton.addEventListener('click',startScene);

  function seekSceneToMs(value){
    const total=Math.max(60000,durationMinutes*60000),target=Math.max(0,Math.min(total-1,Math.round(Number(value)||0)));
    pausedAt=target;if(scenePlaying)sceneStartedAt=performance.now();updateSceneUi();return target;
  }
  function cancelPhaseTransition(){
    clearTimeout(phaseTransitionTimer);clearTimeout(phaseTransitionEndTimer);phaseTransitionTimer=null;phaseTransitionEndTimer=null;document.body.classList.remove('journey-phase-transition');document.body.style.removeProperty('--journey-phase-transition-ms');
  }
  function transitionProfileAt(value){
    const total=Math.max(60000,durationMinutes*60000);
    if(activeJourneyId==='train_journey'&&window.LullabyTrainJourney?.transitionProfile)return window.LullabyTrainJourney.transitionProfile(value,total);
    if(window.LullabyRemainingJourneys?.configs?.[activeJourneyId]&&window.LullabyRemainingJourneys.transitionProfile)return window.LullabyRemainingJourneys.transitionProfile(value,total);
    return aircraftFx[phaseFor(value,total)[0]]||aircraftFx.Cruise;
  }
  function transitionSceneToMs(value){
    cancelPhaseTransition();
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){seekSceneToMs(value);return}
    const profile=transitionProfileAt(value),visualMs=profile.visualMs||850,seekDelayMs=profile.seekDelayMs||150;
    document.body.style.setProperty('--journey-phase-transition-ms',`${visualMs}ms`);document.body.classList.add('journey-phase-transition');
    phaseTransitionTimer=setTimeout(()=>{seekSceneToMs(value);phaseTransitionEndTimer=setTimeout(()=>document.body.classList.remove('journey-phase-transition'),Math.max(320,visualMs*.55))},seekDelayMs);
  }
  function seekFromPointer(event){
    const track=document.querySelector('.journey-track');if(!track)return;const rect=track.getBoundingClientRect();if(rect.width<=0)return;
    seekSceneToMs(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*durationMinutes*60000);
  }
  const phaseSteps=[['Taxi out',0],['Takeoff',.025],['Climb',.0275],['Cruise',.05625],['Descent',.9125],['Approach',.96875],['Touchdown',.9854167],['Taxi in',.9875],['Arrived',1]];
  function stepScenePhase(direction){
    const total=Math.max(60000,durationMinutes*60000),current=phaseFor(currentElapsed(),total)[0];
    let index=phaseSteps.findIndex(([name])=>name===current);if(index<0)index=0;
    index=Math.max(0,Math.min(phaseSteps.length-1,index+(direction<0?-1:1)));
    return transitionSceneToMs(Math.min(total-1,Math.round(total*phaseSteps[index][1])));
  }
  const aircraftStageLabels={
    'Taxi out':['Taxi out','지상 이동'],'Takeoff':['Takeoff','이륙'],'Climb':['Climb','상승'],'Cruise':['Cruise','순항'],Descent:['Descent','하강'],Approach:['Approach','접근'],Touchdown:['Touchdown','착륙'],'Taxi in':['Taxi in','도착 이동'],Arrived:['Arrived','도착']
  };
  function aircraftStagePoints(total){return phaseSteps.map(([name,ratio])=>({label:aircraftStageLabels[name],ms:Math.min(total-1,Math.round(total*ratio))}))}
  function currentStagePoints(){const total=Math.max(60000,durationMinutes*60000);if(activeJourneyId==='train_journey'&&window.LullabyTrainJourney?.stagePoints)return window.LullabyTrainJourney.stagePoints(total);if(window.LullabyRemainingJourneys?.configs?.[activeJourneyId]&&window.LullabyRemainingJourneys.stagePoints)return window.LullabyRemainingJourneys.stagePoints(total);return aircraftStagePoints(total)}
  function renderStageControl(){
    const bar=document.getElementById('journeyStageBar'),select=document.getElementById('journeyStageSelect');if(!bar||!select)return;const ko=!english(),points=currentStagePoints();
    const label=document.querySelector('.journey-stage-select span');if(label)label.textContent=ko?'여정 단계':'Journey stage';
    bar.innerHTML=points.map((point,index)=>`<button type="button" data-stage-index="${index}"><span>${index+1}</span><b>${point.label[ko?1:0]}</b></button>`).join('');
    select.innerHTML=points.map((point,index)=>`<option value="${index}">${index+1}. ${point.label[ko?1:0]}</option>`).join('');syncStageControl();
  }
  function syncStageControl(){const points=currentStagePoints(),elapsed=currentElapsed();let active=0;for(let i=0;i<points.length;i++)if(elapsed>=points[i].ms-500)active=i;document.querySelectorAll('#journeyStageBar [data-stage-index]').forEach((button,index)=>{button.classList.toggle('active',index===active);if(index===active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')});const select=document.getElementById('journeyStageSelect');if(select&&select.value!==String(active))select.value=String(active)}
  function localizePhaseButtons(){
    const en=english(),prev=document.getElementById('journeyPrevPhase'),next=document.getElementById('journeyNextPhase');
    if(prev)prev.textContent=en?'◀ Previous phase':'◀ 이전 단계';if(next)next.textContent=en?'Next phase ▶':'다음 단계 ▶';
  }
  function syncEventToggle(){const button=document.getElementById('journeyEventToggle'),label=document.querySelector('[data-journey-event-label]'),name=window.LullabyLocales?.t?.('randomEvents')||'Random events',term=(key,fallback)=>window.LullabyLocales?.term?.(key)||fallback;if(label)label.textContent=name;if(button){button.setAttribute('aria-label',name);button.setAttribute('aria-checked',String(journeyEventsEnabled));button.textContent=journeyEventsEnabled?term('on','On'):term('off','Off')}}
  function setJourneyEventsEnabled(enabled){journeyEventsEnabled=Boolean(enabled);localStorage.setItem('lullaby-journey-random-events',journeyEventsEnabled?'on':'off');syncEventToggle();if(!journeyEventsEnabled)stopAircraftEvent();else if(scenePlaying&&activeJourneyId==='passenger_aircraft_cabin')scheduleAircraftEvent();document.dispatchEvent(new CustomEvent('lullaby-journey-events-changed',{detail:{enabled:journeyEventsEnabled}}));if(scenePlaying)updateSceneUi();else if(activeJourneyId==='passenger_aircraft_cabin'){const label=document.getElementById('eventLabel');if(label)label.textContent=journeyEventsEnabled?'None':(english()?'Off':'꺼짐')}}
  function ensurePhaseButtons(){
    const track=document.querySelector('.journey-track');if(!track||document.getElementById('journeyPhaseButtons'))return;
    const row=document.createElement('div');row.id='journeyPhaseButtons';row.className='journey-phase-buttons';
    row.innerHTML='<div id="journeyStageBar" class="journey-stage-bar" role="list" aria-label="Journey stages"></div><label class="journey-stage-select"><span>여정 단계</span><select id="journeyStageSelect"></select></label><div class="journey-phase-arrows"><button type="button" id="journeyPrevPhase" class="small-action"></button><button type="button" id="journeyNextPhase" class="small-action"></button></div><div class="journey-event-toggle"><span data-journey-event-label>랜덤 이벤트</span><button type="button" id="journeyEventToggle" role="switch"></button></div>';
    track.insertAdjacentElement('afterend',row);document.getElementById('journeyPrevPhase')?.addEventListener('click',()=>stepScenePhase(-1));document.getElementById('journeyNextPhase')?.addEventListener('click',()=>stepScenePhase(1));
    row.addEventListener('click',event=>{const button=event.target.closest('[data-stage-index]');if(!button)return;const point=currentStagePoints()[Number(button.dataset.stageIndex)];if(point)transitionSceneToMs(point.ms)});document.getElementById('journeyStageSelect')?.addEventListener('change',event=>{const point=currentStagePoints()[Number(event.target.value)];if(point)transitionSceneToMs(point.ms)});
    document.getElementById('journeyEventToggle')?.addEventListener('click',()=>setJourneyEventsEnabled(!journeyEventsEnabled));localizePhaseButtons();syncEventToggle();renderStageControl();
  }
  function syncJourneySeekAria(){
    const track=document.querySelector('.journey-track');if(!track)return;const total=Math.max(1,durationMinutes*60000),elapsed=Math.max(0,Math.min(total,currentElapsed())),[phase]=phaseFor(elapsed,total);
    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(Math.round(total/1000)));track.setAttribute('aria-valuenow',String(Math.round(elapsed/1000)));track.setAttribute('aria-valuetext',`${phase} · ${fmt(elapsed,true)}`);
  }
  function bindJourneySeek(){
    const track=document.querySelector('.journey-track');if(!track||track.dataset.seekBound==='1')return;
    track.dataset.seekBound='1';track.tabIndex=0;track.setAttribute('role','slider');track.setAttribute('aria-label',english()?'Journey position':'여정 위치');
    let dragging=false,pointerId=null;
    track.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;dragging=true;pointerId=event.pointerId;track.setPointerCapture?.(pointerId);seekFromPointer(event);event.preventDefault()});
    track.addEventListener('pointermove',event=>{if(dragging&&event.pointerId===pointerId){seekFromPointer(event);event.preventDefault()}});
    const finish=event=>{if(!dragging)return;if(event.pointerId!==undefined&&pointerId!==null&&event.pointerId!==pointerId)return;dragging=false;try{track.releasePointerCapture?.(pointerId)}catch{}pointerId=null};
    track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);
    track.addEventListener('keydown',event=>{const total=Math.max(60000,durationMinutes*60000);let target=currentElapsed();if(event.key==='ArrowLeft')target-=60000;else if(event.key==='ArrowRight')target+=60000;else if(event.key==='PageDown')target-=600000;else if(event.key==='PageUp')target+=600000;else if(event.key==='Home')target=0;else if(event.key==='End')target=total-1;else return;event.preventDefault();seekSceneToMs(target)});
    syncJourneySeekAria();
  }

  const baseUpdateSceneUi=updateSceneUi;updateSceneUi=function(){baseUpdateSceneUi();const label=document.getElementById('eventLabel');if(label&&activeJourneyId==='passenger_aircraft_cabin'){if(!journeyEventsEnabled)label.textContent=english()?'Off':'꺼짐';else if(performance.now()<aircraftEventLabelUntil)label.textContent=english()?'Cabin chime':'기내 안내음'}syncJourneySeekAria();syncStageControl()};
  bindJourneySeek();ensurePhaseButtons();
  document.addEventListener('lullaby-language-changed',()=>{const track=document.querySelector('.journey-track'),label=document.querySelector('.journey-stage-select span');if(track)track.setAttribute('aria-label',english()?'Journey position':'여정 위치');if(label)label.textContent=english()?'Journey stage':'여정 단계';localizePhaseButtons();syncEventToggle();renderStageControl();syncJourneySeekAria()});
  window.LullabyJourneyStageControl={render:renderStageControl,sync:syncStageControl,transitionToMs:transitionSceneToMs,transitionProfileAt};
  window.LullabyJourneyRuntime={seekToMs:seekSceneToMs,transitionToMs:transitionSceneToMs,previousPhase:()=>stepScenePhase(-1),nextPhase:()=>stepScenePhase(1),get elapsedMs(){return currentElapsed()},get totalMs(){return durationMinutes*60000}};
  window.LullabyJourneyEvents={get enabled(){return journeyEventsEnabled},setEnabled:setJourneyEventsEnabled};
  async function debugTriggerAircraftEvent(){
    if(!journeyEventsEnabled)setJourneyEventsEnabled(true);
    if(!scenePlaying)await startScene();else await ensureJourneyNodes();
    aircraftEventNode.el.currentTime=0;aircraftEventLabelUntil=performance.now()+3200;await aircraftEventNode.el.play();updateSceneUi();
    return'Cabin chime';
  }
  window.LullabyJourneyAudio={get phase(){return audiblePhase},get taxiReady(){return!!taxiNode},get taxiUrl(){return taxiNode?.url||window.LullabyAircraftTaxiSource?.url||null},get cruiseUrl(){return sceneNode?.url||window.LullabyAircraftSource?.url||null},get taxiGain(){return taxiNode?.gain?.gain?.value??0},get cruiseGain(){return sceneNode?.gain?.gain?.value??0},get nodes(){return{cruise:sceneNode,taxi:taxiNode}},ensureNodes:ensureJourneyNodes,triggerEvent:debugTriggerAircraftEvent};
})();
