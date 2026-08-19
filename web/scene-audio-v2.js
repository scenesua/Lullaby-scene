(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof getAircraftUrl!=='function')return;
  const originalStartScene=startScene;
  const playButton=document.getElementById('scenePlay');
  if(playButton&&originalStartScene)playButton.removeEventListener('click',originalStartScene);

  let taxiNode=null;
  let audiblePhase='Ready';

  /**
   * Cruise/flight keeps the current 853735-derived bed for now. Taxi out/in use
   * the separate 627056 field recording. This keeps the old 105 s processed loop
   * completely silent during taxi and avoids using its long overlap as a fake
   * "event". 627056 receives no aircraft whistle-notch bank or widening.
   */
  const baseEnsureSceneNode=ensureSceneNode;
  ensureSceneNode=async function(){
    await baseEnsureSceneNode();
    sceneNode.el.loop=true;
    sceneNode.el.preload='auto';
    if(!sceneNode.whistleGuard){
      try{
        sceneNode.src.disconnect();
        const tone685=ctx.createBiquadFilter(),tone1191=ctx.createBiquadFilter(),tone2383=ctx.createBiquadFilter(),tone3574=ctx.createBiquadFilter(),tone10544=ctx.createBiquadFilter();
        tone685.type='peaking';tone685.frequency.value=685;tone685.Q.value=5;tone685.gain.value=-6;
        tone1191.type='peaking';tone1191.frequency.value=1191;tone1191.Q.value=6;tone1191.gain.value=-10;
        tone2383.type='peaking';tone2383.frequency.value=2383;tone2383.Q.value=8;tone2383.gain.value=-6;
        tone3574.type='peaking';tone3574.frequency.value=3574;tone3574.Q.value=8;tone3574.gain.value=-10;
        tone10544.type='peaking';tone10544.frequency.value=10544;tone10544.Q.value=7;tone10544.gain.value=-18;
        sceneNode.src.connect(tone685).connect(tone1191).connect(tone2383).connect(tone3574).connect(tone10544).connect(sceneNode.filter);
        sceneNode.whistleGuard={tone685,tone1191,tone2383,tone3574,tone10544};
      }catch(error){console.warn('aircraft whistle guard unavailable',error)}
    }
    sceneNode.filter.Q.value=.15;
    sceneNode.filter.frequency.value=18500;
    return sceneNode;
  };

  async function ensureTaxiNode(){
    if(taxiNode)return taxiNode;
    if(typeof getAircraftTaxiUrl!=='function')throw new Error('Aircraft taxi source unavailable');
    await ensureContext();
    taxiNode=makeMediaNode(await getAircraftTaxiUrl());
    taxiNode.el.loop=true;
    taxiNode.el.preload='auto';
    taxiNode.filter.Q.value=.08;
    taxiNode.filter.frequency.value=20000;
    taxiNode.gain.gain.value=0;
    return taxiNode;
  }

  async function ensureJourneyNodes(){
    await Promise.all([ensureSceneNode(),ensureTaxiNode()]);
    return{cruise:sceneNode,taxi:taxiNode};
  }

  function isTaxiPhase(phase){return phase==='Taxi out'||phase==='Taxi in'}

  updateSceneAudio=function(ms){
    if(!sceneNode||!taxiNode||!ctx)return;
    const total=Math.max(60000,durationMinutes*60000);
    const [phase]=phaseFor(ms,total);
    const event=activeSceneEvent(ms);
    audiblePhase=phase;
    const phaseDirect={
      'Taxi out':.50,
      Takeoff:.61,
      Climb:.57,
      Cruise:.53,
      Descent:.54,
      Approach:.56,
      Touchdown:.58,
      'Taxi in':.48,
      Arrived:0
    }[phase]??.53;
    const turbulenceLift=event?.type==='turbulence'?.008*macro.turbulence:0;
    const cabinLift=event?.type==='cabin'?.006*macro.activity:0;
    const presence=.88+macro.engine*.18;
    const direct=Math.max(0,phaseDirect*presence+turbulenceLift+cabinLift);
    const taxi=isTaxiPhase(phase);

    // Only phase transitions overlap the two beds. A 250 ms WebAudio time
    // constant settles in roughly one second; there is no repeating long
    // two-copy blend inside Taxi itself.
    sceneNode.gain.gain.setTargetAtTime(taxi?0:direct,ctx.currentTime,.25);
    taxiNode.gain.gain.setTargetAtTime(taxi?Math.max(0,phaseDirect*(.90+macro.engine*.10)):0,ctx.currentTime,.25);

    const cutoff=Math.max(16500,18800-(macro.night*1100)-((1-macro.engine)*450));
    sceneNode.filter.frequency.setTargetAtTime(cutoff,ctx.currentTime,1.5);
    taxiNode.filter.frequency.setTargetAtTime(Math.max(18000,20000-(macro.night*450)),ctx.currentTime,1.5);
  };

  pauseScene=function(){
    if(!scenePlaying)return;
    pausedAt=currentElapsed();scenePlaying=false;
    sceneNode?.el.pause();taxiNode?.el.pause();
    clearInterval(sceneTimer);
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Resume':'▶ 계속 재생';
    setStatus(window.LullabyI18n?.language==='en'?'Paused':'일시정지됨');updateNowPlaying();
  };

  stopScene=function(arrived=false){
    scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);
    for(const node of [sceneNode,taxiNode])if(node){node.el.pause();try{node.el.currentTime=0}catch{};node.gain.gain.value=0}
    audiblePhase=arrived?'Arrived':'Ready';
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Start journey':'▶ 장면 시작';
    const phase=document.getElementById('phaseLabel'),elapsed=document.getElementById('elapsedLabel'),remaining=document.getElementById('remainingLabel'),belt=document.getElementById('seatbeltLabel'),progress=document.getElementById('journeyProgress'),event=document.getElementById('eventLabel');
    if(phase)phase.textContent=arrived?'Arrived':'Ready';if(elapsed)elapsed.textContent='00:00';if(remaining)remaining.textContent=fmt(durationMinutes*60000);if(belt)belt.textContent='—';if(progress)progress.style.width='0';if(event)event.textContent='None';
    syncJourneySeekAria();
    setStatus(arrived?(window.LullabyI18n?.language==='en'?'Journey complete.':'여정이 종료되었습니다.'):(window.LullabyI18n?.language==='en'?'Stopped':'정지됨'));updateNowPlaying();
  };

  startScene=async function(){
    try{
      await ensureJourneyNodes();
      if(scenePlaying){pauseScene();return}
      sceneStartedAt=performance.now();scenePlaying=true;
      // Both elements start under the same user gesture. Routing is done only
      // with gain nodes, so seeking across a phase does not incur a new load.
      await Promise.all([sceneNode.el.play(),taxiNode.el.play()]);
      updateSceneAudio(currentElapsed());
      if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'Ⅱ Pause':'Ⅱ 일시정지';
      setStatus(window.LullabyI18n?.language==='en'?'Passenger Aircraft Cabin playing':'Passenger Aircraft Cabin 재생 중');
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(err){console.error(err);scenePlaying=false;sceneNode?.el.pause();taxiNode?.el.pause();setStatus(window.LullabyI18n?.language==='en'?'Could not start Aircraft audio. Reload and try again.':'Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}
  };
  if(playButton)playButton.addEventListener('click',startScene);

  function seekSceneToMs(value){
    const total=Math.max(60000,durationMinutes*60000);
    const target=Math.max(0,Math.min(total-1,Math.round(Number(value)||0));
    pausedAt=target;
    if(scenePlaying)sceneStartedAt=performance.now();
    updateSceneUi();
    return target;
  }

  function seekFromPointer(event){
    const track=document.querySelector('.journey-track');if(!track)return;
    const rect=track.getBoundingClientRect();if(rect.width<=0)return;
    const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
    seekSceneToMs(ratio*durationMinutes*60000);
  }

  const phaseSteps=[
    ['Taxi out',0],['Takeoff',.025],['Climb',.0275],['Cruise',.05625],
    ['Descent',.9125],['Approach',.96875],['Touchdown',.9854167],['Taxi in',.9875],['Arrived',1]
  ];
  function stepScenePhase(direction){
    const total=Math.max(60000,durationMinutes*60000),elapsed=currentElapsed();
    const current=phaseFor(elapsed,total)[0];
    let index=phaseSteps.findIndex(([name])=>name===current);if(index<0)index=0;
    const targetIndex=Math.max(0,Math.min(phaseSteps.length-1,index+(direction<0?-1:1)));
    return seekSceneToMs(Math.min(total-1,Math.round(total*phaseSteps[targetIndex][1])));
  }
  function localizePhaseButtons(){
    const en=window.LullabyI18n?.language==='en';
    const prev=document.getElementById('journeyPrevPhase'),next=document.getElementById('journeyNextPhase');
    if(prev)prev.textContent=en?'◀ Previous phase':'◀ 이전 단계';
    if(next)next.textContent=en?'Next phase ▶':'다음 단계 ▶';
  }
  function ensurePhaseButtons(){
    const track=document.querySelector('.journey-track');if(!track||document.getElementById('journeyPhaseButtons'))return;
    const row=document.createElement('div');row.id='journeyPhaseButtons';row.className='journey-phase-buttons';
    row.innerHTML='<button type="button" id="journeyPrevPhase" class="small-action"></button><button type="button" id="journeyNextPhase" class="small-action"></button>';
    track.insertAdjacentElement('afterend',row);
    document.getElementById('journeyPrevPhase')?.addEventListener('click',()=>stepScenePhase(-1));
    document.getElementById('journeyNextPhase')?.addEventListener('click',()=>stepScenePhase(1));
    if(!document.getElementById('journeyPhaseButtonStyle')){
      const style=document.createElement('style');style.id='journeyPhaseButtonStyle';
      style.textContent='.journey-phase-buttons{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.journey-phase-buttons .small-action{min-height:42px}@media(max-width:560px){.journey-phase-buttons{gap:8px}}';
      document.head.appendChild(style);
    }
    localizePhaseButtons();
  }

  function syncJourneySeekAria(){
    const track=document.querySelector('.journey-track');if(!track)return;
    const total=Math.max(1,durationMinutes*60000);
    const elapsed=Math.max(0,Math.min(total,currentElapsed()));
    const [phase]=phaseFor(elapsed,total);
    track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax',String(Math.round(total/1000)));
    track.setAttribute('aria-valuenow',String(Math.round(elapsed/1000)));
    track.setAttribute('aria-valuetext',`${phase} · ${fmt(elapsed,true)}`);
  }

  function bindJourneySeek(){
    const track=document.querySelector('.journey-track');if(!track||track.dataset.seekBound==='1')return;
    track.dataset.seekBound='1';track.tabIndex=0;track.setAttribute('role','slider');track.setAttribute('aria-label',window.LullabyI18n?.language==='en'?'Journey position':'여정 위치');
    let dragging=false,pointerId=null;
    track.addEventListener('pointerdown',event=>{
      if(event.button!==undefined&&event.button!==0)return;
      dragging=true;pointerId=event.pointerId;track.setPointerCapture?.(pointerId);seekFromPointer(event);event.preventDefault();
    });
    track.addEventListener('pointermove',event=>{if(dragging&&event.pointerId===pointerId){seekFromPointer(event);event.preventDefault()}});
    const finish=event=>{if(!dragging)return;if(event.pointerId!==undefined&&pointerId!==null&&event.pointerId!==pointerId)return;dragging=false;try{track.releasePointerCapture?.(pointerId)}catch{}pointerId=null};
    track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);
    track.addEventListener('keydown',event=>{
      const total=Math.max(60000,durationMinutes*60000);let target=currentElapsed();
      if(event.key==='ArrowLeft')target-=60_000;else if(event.key==='ArrowRight')target+=60_000;else if(event.key==='PageDown')target-=10*60_000;else if(event.key==='PageUp')target+=10*60_000;else if(event.key==='Home')target=0;else if(event.key==='End')target=total-1;else return;
      event.preventDefault();seekSceneToMs(target);
    });
    syncJourneySeekAria();
  }

  const baseUpdateSceneUi=updateSceneUi;
  updateSceneUi=function(){baseUpdateSceneUi();syncJourneySeekAria()};
  bindJourneySeek();ensurePhaseButtons();
  document.addEventListener('lullaby-language-changed',()=>{const track=document.querySelector('.journey-track');if(track)track.setAttribute('aria-label',window.LullabyI18n?.language==='en'?'Journey position':'여정 위치');localizePhaseButtons();syncJourneySeekAria()});
  window.LullabyJourneyRuntime={seekToMs:seekSceneToMs,previousPhase:()=>stepScenePhase(-1),nextPhase:()=>stepScenePhase(1),get elapsedMs(){return currentElapsed()},get totalMs(){return durationMinutes*60000}};
  window.LullabyJourneyAudio={
    get phase(){return audiblePhase},
    get taxiReady(){return!!taxiNode},
    get taxiUrl(){return taxiNode?.url||window.LullabyAircraftTaxiSource?.url||null},
    get cruiseUrl(){return sceneNode?.url||window.LullabyAircraftSource?.url||null},
    get taxiGain(){return taxiNode?.gain?.gain?.value??0},
    get cruiseGain(){return sceneNode?.gain?.gain?.value??0},
  };
})();
