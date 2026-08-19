(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof getAircraftUrl!=='function')return;
  const originalStartScene=startScene;
  const playButton=document.getElementById('scenePlay');
  if(playButton&&originalStartScene)playButton.removeEventListener('click',originalStartScene);

  /**
   * Passenger Aircraft Cabin deliberately uses only the verified stereo field
   * recording as its audible bed. The previous short-delay stereo return and
   * extra ventilation layer could create comb-filter/whistling artefacts on a
   * broadband aircraft recording, so both are removed from the journey path.
   */
  const baseEnsureSceneNode=ensureSceneNode;
  ensureSceneNode=async function(){
    await baseEnsureSceneNode();
    sceneNode.el.loop=true;
    sceneNode.el.preload='auto';
    sceneNode.filter.Q.value=.12;
    sceneNode.filter.frequency.value=20000;
    return sceneNode;
  };

  updateSceneAudio=function(ms){
    if(!sceneNode||!ctx)return;
    const total=Math.max(60000,durationMinutes*60000);
    const [phase]=phaseFor(ms,total);
    const event=activeSceneEvent(ms);
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
    sceneNode.gain.gain.setTargetAtTime(direct,ctx.currentTime,.9);

    // Keep the field recording open and natural. Night depth is now only a
    // very small softening, rather than the former aggressive high-frequency cut.
    const cutoff=Math.max(18500,20200-(macro.night*900)-((1-macro.engine)*350));
    sceneNode.filter.frequency.setTargetAtTime(cutoff,ctx.currentTime,1.5);
  };

  pauseScene=function(){
    if(!scenePlaying)return;
    pausedAt=currentElapsed();scenePlaying=false;
    sceneNode?.el.pause();
    clearInterval(sceneTimer);
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Resume':'▶ 계속 재생';
    setStatus(window.LullabyI18n?.language==='en'?'Paused':'일시정지됨');updateNowPlaying();
  };

  stopScene=function(arrived=false){
    scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);
    if(sceneNode){sceneNode.el.pause();try{sceneNode.el.currentTime=0}catch{};sceneNode.gain.gain.value=.5}
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Start journey':'▶ 장면 시작';
    const phase=document.getElementById('phaseLabel'),elapsed=document.getElementById('elapsedLabel'),remaining=document.getElementById('remainingLabel'),belt=document.getElementById('seatbeltLabel'),progress=document.getElementById('journeyProgress'),event=document.getElementById('eventLabel');
    if(phase)phase.textContent=arrived?'Arrived':'Ready';if(elapsed)elapsed.textContent='00:00';if(remaining)remaining.textContent=fmt(durationMinutes*60000);if(belt)belt.textContent='—';if(progress)progress.style.width='0';if(event)event.textContent='None';
    syncJourneySeekAria();
    setStatus(arrived?(window.LullabyI18n?.language==='en'?'Journey complete.':'여정이 종료되었습니다.'):(window.LullabyI18n?.language==='en'?'Stopped':'정지됨'));updateNowPlaying();
  };

  startScene=async function(){
    try{
      await ensureSceneNode();
      if(scenePlaying){pauseScene();return}
      sceneStartedAt=performance.now();scenePlaying=true;
      await sceneNode.el.play();
      updateSceneAudio(currentElapsed());
      if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'Ⅱ Pause':'Ⅱ 일시정지';
      setStatus(window.LullabyI18n?.language==='en'?'Passenger Aircraft Cabin playing':'Passenger Aircraft Cabin 재생 중');
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(err){console.error(err);scenePlaying=false;setStatus(window.LullabyI18n?.language==='en'?'Could not start Aircraft audio. Reload and try again.':'Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}
  };
  if(playButton)playButton.addEventListener('click',startScene);

  function seekSceneToMs(value){
    const total=Math.max(60000,durationMinutes*60000);
    const target=Math.max(0,Math.min(total-1,Math.round(Number(value)||0)));
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
  bindJourneySeek();
  document.addEventListener('lullaby-language-changed',()=>{const track=document.querySelector('.journey-track');if(track)track.setAttribute('aria-label',window.LullabyI18n?.language==='en'?'Journey position':'여정 위치');syncJourneySeekAria()});
  window.LullabyJourneyRuntime={seekToMs:seekSceneToMs,get elapsedMs(){return currentElapsed()},get totalMs(){return durationMinutes*60000}};
})();
