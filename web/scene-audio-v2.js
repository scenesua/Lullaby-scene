(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof getAircraftUrl!=='function')return;
  let sceneVentNode=null,sceneRumbleNode=null;
  const originalStartScene=startScene;
  const playButton=document.getElementById('scenePlay');
  if(playButton&&originalStartScene)playButton.removeEventListener('click',originalStartScene);

  function randomizeStart(node){
    const apply=()=>{if(Number.isFinite(node.el.duration)&&node.el.duration>8){try{node.el.currentTime=Math.random()*(node.el.duration-4)}catch{}}};
    if(node.el.readyState>=1)apply();else node.el.addEventListener('loadedmetadata',apply,{once:true});
  }

  const baseEnsureSceneNode=ensureSceneNode;
  ensureSceneNode=async function(){
    await baseEnsureSceneNode();
    if(!sceneVentNode){
      sceneVentNode=makeMediaNode('/audio/ventilation.ogg');
      sceneVentNode.gain.gain.value=0;
      sceneVentNode.filter.frequency.value=7200;
      randomizeStart(sceneVentNode);
    }
    if(!sceneRumbleNode){
      sceneRumbleNode=makeMediaNode('/audio/brown_noise.ogg');
      sceneRumbleNode.gain.gain.value=0;
      sceneRumbleNode.filter.frequency.value=1200;
      randomizeStart(sceneRumbleNode);
    }
    return sceneNode;
  };

  const baseUpdateSceneAudio=updateSceneAudio;
  updateSceneAudio=function(ms){
    if(!sceneNode||!ctx)return;
    const total=durationMinutes*60000;
    const [phase]=phaseFor(ms,total);
    const event=activeSceneEvent(ms);
    const phaseDirect={"Taxi out":.48,Takeoff:.76,Climb:.63,Cruise:.43,Descent:.50,Approach:.58,Touchdown:.66,"Taxi in":.44,Arrived:0}[phase]??.43;
    const phaseVent={"Taxi out":.12,Takeoff:.09,Climb:.13,Cruise:.19,Descent:.17,Approach:.14,Touchdown:.10,"Taxi in":.13,Arrived:0}[phase]??.18;
    const phaseRumble={"Taxi out":.045,Takeoff:.10,Climb:.085,Cruise:.07,Descent:.075,Approach:.08,Touchdown:.09,"Taxi in":.05,Arrived:0}[phase]??.07;
    const wave=event?.type==='turbulence'?Math.sin(ms/340)*.055*macro.turbulence:Math.sin(ms/17000)*.008*macro.turbulence;
    const direct=Math.max(0,phaseDirect*(.48+macro.engine*.55+macro.activity*.10)+wave);
    const vent=Math.max(0,phaseVent*(.92+.16*macro.night)*(1-.12*macro.activity));
    const rumble=Math.max(0,phaseRumble*(.62+.72*macro.engine+.20*macro.turbulence));
    sceneNode.gain.gain.setTargetAtTime(direct,ctx.currentTime,1.4);
    sceneVentNode?.gain.gain.setTargetAtTime(vent,ctx.currentTime,2.4);
    sceneRumbleNode?.gain.gain.setTargetAtTime(rumble,ctx.currentTime,2.6);
    const directCutoff=Math.max(2200,15800-(macro.night*7200)-((1-macro.engine)*1900));
    const ventCutoff=Math.max(2500,7600-macro.night*3000);
    const rumbleCutoff=900+macro.engine*950+macro.turbulence*350;
    sceneNode.filter.frequency.setTargetAtTime(directCutoff,ctx.currentTime,1.8);
    if(sceneVentNode)sceneVentNode.filter.frequency.setTargetAtTime(ventCutoff,ctx.currentTime,2.2);
    if(sceneRumbleNode)sceneRumbleNode.filter.frequency.setTargetAtTime(rumbleCutoff,ctx.currentTime,2.2);
  };

  pauseScene=function(){
    if(!scenePlaying)return;
    pausedAt=currentElapsed();scenePlaying=false;
    sceneNode?.el.pause();sceneVentNode?.el.pause();sceneRumbleNode?.el.pause();
    clearInterval(sceneTimer);
    if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'▶ Resume':'▶ 계속 재생';
    setStatus(window.LullabyI18n?.language==='en'?'Paused':'일시정지됨');updateNowPlaying();
  };

  stopScene=function(arrived=false){
    scenePlaying=false;pausedAt=0;clearInterval(sceneTimer);
    [sceneNode,sceneVentNode,sceneRumbleNode].forEach(n=>{if(!n)return;n.el.pause();try{n.el.currentTime=0}catch{};n.gain.gain.value=0});
    if(sceneNode)sceneNode.gain.gain.value=.45;
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
      await Promise.allSettled([sceneVentNode?.el.play(),sceneRumbleNode?.el.play()].filter(Boolean));
      updateSceneAudio(currentElapsed());
      if(playButton)playButton.textContent=window.LullabyI18n?.language==='en'?'Ⅱ Pause':'Ⅱ 일시정지';
      setStatus(window.LullabyI18n?.language==='en'?'Passenger Aircraft Cabin playing':'Passenger Aircraft Cabin 재생 중');
      clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi();
    }catch(err){console.error(err);scenePlaying=false;setStatus(window.LullabyI18n?.language==='en'?'Could not start Aircraft audio. Reload and try again.':'Aircraft 오디오를 시작하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.')}
  };
  if(playButton)playButton.addEventListener('click',startScene);
})();
