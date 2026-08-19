(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof getAircraftUrl!=='function')return;
  let sceneVentNode=null,sceneSpace=null;
  const originalStartScene=startScene;
  const playButton=document.getElementById('scenePlay');
  if(playButton&&originalStartScene)playButton.removeEventListener('click',originalStartScene);

  function randomizeStart(node){
    const apply=()=>{if(Number.isFinite(node.el.duration)&&node.el.duration>8){try{node.el.currentTime=Math.random()*(node.el.duration-4)}catch{}}};
    if(node.el.readyState>=1)apply();else node.el.addEventListener('loadedmetadata',apply,{once:true});
  }

  function ensureSpaceReturn(){
    if(sceneSpace||!ctx||!sceneNode||!master||typeof ctx.createStereoPanner!=='function')return;
    const leftDelay=ctx.createDelay(.05),rightDelay=ctx.createDelay(.05);
    const leftPan=ctx.createStereoPanner(),rightPan=ctx.createStereoPanner();
    const leftGain=ctx.createGain(),rightGain=ctx.createGain();
    leftDelay.delayTime.value=.011;rightDelay.delayTime.value=.017;
    leftPan.pan.value=-.72;rightPan.pan.value=.72;
    leftGain.gain.value=.026;rightGain.gain.value=.022;
    sceneNode.filter.connect(leftDelay).connect(leftPan).connect(leftGain).connect(master);
    sceneNode.filter.connect(rightDelay).connect(rightPan).connect(rightGain).connect(master);
    sceneSpace={leftGain,rightGain};
  }

  const baseEnsureSceneNode=ensureSceneNode;
  ensureSceneNode=async function(){
    await baseEnsureSceneNode();
    sceneNode.filter.Q.value=.25;
    sceneNode.filter.frequency.value=19000;
    ensureSpaceReturn();
    if(!sceneVentNode){
      sceneVentNode=makeMediaNode('/audio/ventilation.ogg');
      sceneVentNode.gain.gain.value=0;
      sceneVentNode.filter.Q.value=.2;
      sceneVentNode.filter.frequency.value=12500;
      randomizeStart(sceneVentNode);
    }
    return sceneNode;
  };

  updateSceneAudio=function(ms){
    if(!sceneNode||!ctx)return;
    const total=Math.max(60000,durationMinutes*60000);
    const [phase]=phaseFor(ms,total);
    const event=activeSceneEvent(ms);
    const phaseDirect={"Taxi out":.52,Takeoff:.68,Climb:.61,Cruise:.55,Descent:.58,Approach:.62,Touchdown:.66,"Taxi in":.50,Arrived:0}[phase]??.55;
    const phaseVent={"Taxi out":.018,Takeoff:.022,Climb:.026,Cruise:.032,Descent:.030,Approach:.026,Touchdown:.022,"Taxi in":.020,Arrived:0}[phase]??.028;
    const turbulenceLift=event?.type==='turbulence'?.014*macro.turbulence:0;
    const direct=Math.max(0,phaseDirect*(.72+macro.engine*.36+macro.activity*.035)+turbulenceLift);
    const vent=Math.max(0,phaseVent*(.9+.10*macro.night)*(1-.08*macro.activity));
    sceneNode.gain.gain.setTargetAtTime(direct,ctx.currentTime,1.8);
    sceneVentNode?.gain.gain.setTargetAtTime(vent,ctx.currentTime,3.2);
    const directCutoff=Math.max(15500,20500-(macro.night*2600)-((1-macro.engine)*900));
    const ventCutoff=Math.max(9000,13500-macro.night*2200);
    sceneNode.filter.frequency.setTargetAtTime(directCutoff,ctx.currentTime,2.2);
    if(sceneVentNode)sceneVentNode.filter.frequency.setTargetAtTime(ventCutoff,ctx.currentTime,3.0);
    if(sceneSpace){
      const space=.018+macro.night*.012+macro.activity*.004;
      sceneSpace.leftGain.gain.setTargetAtTime(space,ctx.currentTime,2.8);
      sceneSpace.rightGain.gain.setTargetAtTime(space*.86,ctx.currentTime,2.8);
    }
  };

  pauseScene=function(){
    if(!scenePlaying)return;
    pausedAt=currentElapsed();scenePlaying=false;
    sceneNode?.el.pause();sceneVentNode?.el.pause();
    clearInterval(sceneTimer);
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Resume':'▶ 계속 재생';
    setStatus(window.LullabyI18n?.language==='en'?'Paused':'일시정지됨');updateNowPlaying();
  };

  stopScene=function(arrived=false){
    scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);
    [sceneNode,sceneVentNode].forEach(n=>{if(!n)return;n.el.pause();try{n.el.currentTime=0}catch{};n.gain.gain.value=0});
    if(sceneNode)sceneNode.gain.gain.value=.5;
    if(sceneSpace){sceneSpace.leftGain.gain.value=0;sceneSpace.rightGain.gain.value=0}
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Start journey':'▶ 장면 시작';
    const phase=document.getElementById('phaseLabel'),elapsed=document.getElementById('elapsedLabel'),remaining=document.getElementById('remainingLabel'),belt=document.getElementById('seatbeltLabel'),progress=document.getElementById('journeyProgress'),event=document.getElementById('eventLabel');
    if(phase)phase.textContent=arrived?'Arrived':'Ready';if(elapsed)elapsed.textContent='00:00';if(remaining)remaining.textContent=fmt(durationMinutes*60000);if(belt)belt.textContent='—';if(progress)progress.style.width='0';if(event)event.textContent='None';
    setStatus(arrived?(window.LullabyI18n?.language==='en'?'Journey complete.':'여정이 종료되었습니다.'):(window.LullabyI18n?.language==='en'?'Stopped':'정지됨'));updateNowPlaying();
  };

  startScene=async function(){
    try{
      await ensureSceneNode();
      if(scenePlaying){pauseScene();return}
      sceneStartedAt=performance.now();scenePlaying=true;
      await sceneNode.el.play();
      await Promise.allSettled([sceneVentNode?.el.play()].filter(Boolean));
      updateSceneAudio(currentElapsed());
      if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'Ⅱ Pause':'Ⅱ 일시정지';
      setStatus(window.LullabyI18n?.language==='en'?'Passenger Aircraft Cabin playing':'Passenger Aircraft Cabin 재생 중');
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(err){console.error(err);scenePlaying=false;setStatus(window.LullabyI18n?.language==='en'?'Could not start Aircraft audio. Reload and try again.':'Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}
  };
  if(playButton)playButton.addEventListener('click',startScene);
})();
