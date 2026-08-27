(()=>{
  'use strict';
  if(!document.getElementById('webPlayer'))return;
  const logs=[];
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const text=value=>value instanceof Error?`${value.name}: ${value.message}`:typeof value==='string'?value:JSON.stringify(value);
  const record=(level,...values)=>{logs.push({at:new Date().toISOString(),level,message:values.map(text).join(' ')});if(logs.length>120)logs.shift()};
  for(const level of['warn','error']){const original=console[level].bind(console);console[level]=(...values)=>{record(level,...values);original(...values)}}
  addEventListener('error',event=>record('error',event.error||event.message));
  addEventListener('unhandledrejection',event=>record('error',event.reason));

  const provider=()=>activeJourneyId==='passenger_aircraft_cabin'?window.LullabyJourneyAudio:activeJourneyId==='train_journey'?window.LullabyTrainJourney:window.LullabyRemainingJourneys;
  const EVENT_OPTIONS={
    passenger_aircraft_cabin:[['primary','객실 차임']],train_journey:[['primary','먼 레일 이음매']],spacecraft_journey:[['primary','캐빈 서보']],ferry_journey:[['primary','선체를 스치는 파도']],submarine_journey:[['primary','먼 소나']],
    forest_temple_journey:[['random','숲속 절 랜덤 이벤트'],['bowl','싱잉볼 · 먼 법당'],['moktak','법당 목탁'],['gravel','느린 자갈 발소리'],['heartSutra','반야심경 · 한국어 독송']],
    hood_journey:[['random','HOOD 랜덤 이벤트'],['fight','총격전 전체'],['gunshot','기본 총성'],['gunShotgun','산탄총'],['siren','경찰차 통과'],['carPass','일반 차량 통과'],['glass','유리 파손'],['shoutMale','먼 고함'],['screamCrowd','먼 비명'],['dog','동네 개 짖는 소리'],['footsteps','보도 위 발소리'],['carDoor','차 문'],['helicopter','먼 헬리콥터']]
  };
  let templeBowlPreviewNode=null;
  const nodes=()=>{const value=provider()?.nodes??provider()?.activeNodes??{};const entries=Object.entries(value||{}).filter(([,node])=>node);if(activeJourneyId==='forest_temple_journey'&&templeBowlPreviewNode)entries.push(['bowlPreview',templeBowlPreviewNode]);return Object.fromEntries(entries)};
  const describeNode=([name,node])=>({
    name,url:node.url||'',paused:!!node.el?.paused,currentTime:Number(node.el?.currentTime||0),duration:Number(node.loopDurationSeconds||node.el?.duration||0),gain:Number(node.gain?.gain?.value||0),filterHz:Number(node.filter?.frequency?.value||0),crossfade:!!node.__lullabyCrossfadeLoop,fadeSeconds:Number(node.loopFadeSeconds||0),loopCount:Number(node.loopCount||0),voices:(node.voices||[]).map((voice,index)=>({index,paused:voice.el.paused,currentTime:Number(voice.el.currentTime||0),gain:Number(voice.envelope.gain.value||0)}))
  });
  function createTempleImpulse(audioCtx,seconds=2.8,decay=2.45){
    const length=Math.max(1,Math.floor(audioCtx.sampleRate*seconds)),buffer=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<length;i++){const t=1-i/length;data[i]=(Math.random()*2-1)*Math.pow(t,decay)*(0.82+0.18*Math.sin(i*0.017+channel))}}
    return buffer;
  }
  let templeRoomImpulse=null;
  const sharedTempleRoomImpulse=()=>templeRoomImpulse||(templeRoomImpulse=createTempleImpulse(ctx));
  function attachTempleRoomFx(node,label='Temple event'){
    if(!node||node.__lullabyDebugTempleRoomFx||!ctx||!master)return;
    const preDelay=ctx.createDelay(.2);preDelay.delayTime.value=.055;
    const reverbTone=ctx.createBiquadFilter();reverbTone.type='lowpass';reverbTone.frequency.value=5000;reverbTone.Q.value=.35;
    const convolver=ctx.createConvolver();convolver.buffer=sharedTempleRoomImpulse();
    const reverbWet=ctx.createGain();reverbWet.gain.value=.50;
    const echoDelay=ctx.createDelay(1);echoDelay.delayTime.value=.41;
    const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=4800;
    const echoWet=ctx.createGain();echoWet.gain.value=.065;
    const echoFeedback=ctx.createGain();echoFeedback.gain.value=.10;
    node.gain.connect(preDelay).connect(reverbTone).connect(convolver).connect(reverbWet).connect(master);
    node.gain.connect(echoDelay);echoDelay.connect(echoTone).connect(echoWet).connect(master);echoDelay.connect(echoFeedback).connect(echoDelay);
    node.__lullabyDebugTempleRoomFx={preDelay,reverbTone,convolver,reverbWet,echoDelay,echoTone,echoWet,echoFeedback};
    record('event',`${label} FX ready · shared 2.8s temple room + subtle echo`);
  }
  async function prepareTempleEventFx(){
    if(activeJourneyId!=='forest_temple_journey')return;
    const target=window.LullabyRemainingJourneys;await target?.ensureNodes?.();const events=target?.eventNode;
    attachTempleRoomFx(events?.heartSutra,'Forest Temple Korean Heart Sutra');
    attachTempleRoomFx(events?.moktak,'Forest Temple Moktak');
  }
  async function ensureTempleBowlPreview(){
    await ensureContext();
    if(templeBowlPreviewNode)return templeBowlPreviewNode;
    const node=makeMediaNode('/audio/scenes/forest_temple_journey/forest_temple_bowl_distant_bed_001.ogg?v=1',{loop:false,preload:'auto'}),panner=ctx.createStereoPanner?.();
    if(panner){node.filter.disconnect();node.filter.connect(panner).connect(node.gain);panner.pan.value=0;node.panner=panner}
    node.filter.frequency.value=4400;node.gain.gain.value=.18;templeBowlPreviewNode=node;return node;
  }
  async function ensurePlaying(){if(!scenePlaying)await startScene();if(!scenePlaying)throw new Error('Journey did not start. Check browser audio permission.');await wait(100);await prepareTempleEventFx()}
  async function selectJourney(id){
    const button=document.querySelector(`[data-journey="${CSS.escape(id)}"]`);if(!button)throw new Error(`Unknown Journey: ${id}`);
    if(scenePlaying||pausedAt>0)stopScene(false);button.click();await wait(120);window.LullabyJourneyStageControl?.render?.();if(activeJourneyId!==id)throw new Error(`Could not select ${id}`);return snapshot();
  }
  function currentStagePoints(){
    const target=provider(),total=Math.max(60000,Number(window.LullabyJourneyRuntime?.totalMs||((typeof durationMinutes==='number'?durationMinutes:1)*60000)));
    try{if(typeof target?.stagePoints==='function')return target.stagePoints(total)||[]}catch(error){record('warn','stage points unavailable',error)}
    return[];
  }
  async function setStage(index){
    const safe=Math.max(0,Math.round(Number(index)||0)),points=currentStagePoints(),transition=window.LullabyJourneyRuntime?.transitionToMs||window.LullabyJourneyRuntime?.seekToMs;
    if(points[safe]&&typeof transition==='function'){transition(points[safe].ms);await wait(180);return snapshot()}
    const button=document.querySelector(`#journeyStageBar [data-stage-index="${safe}"]`);if(!button)throw new Error('Journey stage is unavailable.');button.click();await wait(180);return snapshot();
  }
  async function moveStage(direction){
    const points=currentStagePoints();
    if(points.length){const elapsed=Number(window.LullabyJourneyRuntime?.elapsedMs||0);let active=0;for(let i=0;i<points.length;i++)if(elapsed>=Number(points[i].ms||0)-500)active=i;return setStage(Math.max(0,Math.min(points.length-1,active+(direction<0?-1:1))))}
    const fallback=direction<0?window.LullabyJourneyRuntime?.previousPhase:window.LullabyJourneyRuntime?.nextPhase;return typeof fallback==='function'?fallback():undefined;
  }
  async function triggerEvent(type='random'){
    await ensurePlaying();
    if(activeJourneyId==='forest_temple_journey'&&type==='bowl'){
      const node=await ensureTempleBowlPreview();node.el.pause();try{node.el.currentTime=0}catch{}node.filter.frequency.setValueAtTime(4400,ctx.currentTime);node.gain.gain.setValueAtTime(.18,ctx.currentTime);if(node.panner)node.panner.pan.setValueAtTime(0,ctx.currentTime);await node.el.play();record('event','싱잉볼 · 먼 법당');return'싱잉볼 · 먼 법당';
    }
    const target=provider();if(typeof target?.triggerEvent!=='function')throw new Error('This Journey has no debug event adapter.');const label=await target.triggerEvent(type);record('event',label);return label;
  }
  async function jumpBeforeLoop(leadSeconds=1.5){
    await ensurePlaying();await provider()?.ensureNodes?.();let loops=Object.entries(nodes()).filter(([,node])=>node.__lullabyCrossfadeLoop);
    if(!loops.length)throw new Error('The active phase has no looping ambience.');
    if(!loops.some(([,node])=>!node.el.paused&&Number(node.gain?.gain?.value||0)>.005)){await setStage(2);await wait(900);loops=Object.entries(nodes()).filter(([,node])=>node.__lullabyCrossfadeLoop)}
    const lead=Math.max(.25,Math.min(5,Number(leadSeconds)||1.5));for(const[,node]of loops){const duration=Number(node.loopDurationSeconds||node.el.duration),fade=Number(node.loopFadeSeconds||0);node.el.currentTime=Math.max(0,duration-fade-lead)}
    record('loop',`Jumped ${loops.map(([name])=>name).join(', ')} to ${lead.toFixed(1)}s before crossfade`);return loops.map(([name])=>name);
  }
  function snapshot(){
    const elapsed=Number(window.LullabyJourneyRuntime?.elapsedMs||0),total=Number(window.LullabyJourneyRuntime?.totalMs||0);
    return{journeyId:activeJourneyId,eventOptions:EVENT_OPTIONS[activeJourneyId]||[],playing:!!scenePlaying,elapsedMs:elapsed,totalMs:total,progress:total?elapsed/total:0,phase:document.getElementById('phaseLabel')?.textContent||'',event:document.getElementById('eventLabel')?.textContent||'',eventsEnabled:!!window.LullabyJourneyEvents?.enabled,audioContext:ctx?.state||'not-created',master:Number(masterValue||0),visibility:document.visibilityState,nodes:Object.entries(nodes()).map(describeNode),logs:[...logs]};
  }
  window.LullabyDebug={
    snapshot,selectJourney,triggerEvent,jumpBeforeLoop,
    async playPause(){await startScene();if(scenePlaying){await wait(80);await prepareTempleEventFx()}return snapshot()},
    stop(){templeBowlPreviewNode?.el?.pause();stopScene(false);return snapshot()},
    stage:setStage,previousStage(){return moveStage(-1)},nextStage(){return moveStage(1)},
    setEvents(enabled){window.LullabyJourneyEvents?.setEnabled(!!enabled);return!!window.LullabyJourneyEvents?.enabled},
    setDuration(minutes){if(typeof window.setDuration!=='function')throw new Error('Duration control is unavailable.');window.setDuration(Math.max(1,Math.round(Number(minutes)||1)));return window.LullabyJourneyRuntime?.totalMs},
    async setAudioContext(running){await ensureContext();if(running)await ctx.resume();else await ctx.suspend();return ctx.state},
    clearLogs(){logs.length=0},get logs(){return[...logs]}
  };
  dispatchEvent(new CustomEvent('lullaby-debug-ready'));
})();