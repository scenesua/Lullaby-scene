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
  const nodes=()=>{const value=provider()?.nodes??provider()?.activeNodes??{};return Object.fromEntries(Object.entries(value||{}).filter(([,node])=>node))};
  const describeNode=([name,node])=>({
    name,url:node.url||'',paused:!!node.el?.paused,currentTime:Number(node.el?.currentTime||0),duration:Number(node.loopDurationSeconds||node.el?.duration||0),gain:Number(node.gain?.gain?.value||0),filterHz:Number(node.filter?.frequency?.value||0),crossfade:!!node.__lullabyCrossfadeLoop,fadeSeconds:Number(node.loopFadeSeconds||0),loopCount:Number(node.loopCount||0),voices:(node.voices||[]).map((voice,index)=>({index,paused:voice.el.paused,currentTime:Number(voice.el.currentTime||0),gain:Number(voice.envelope.gain.value||0)}))
  });
  async function ensurePlaying(){if(!scenePlaying)await startScene();if(!scenePlaying)throw new Error('Journey did not start. Check browser audio permission.');await wait(100)}
  async function selectJourney(id){
    const button=document.querySelector(`[data-journey="${CSS.escape(id)}"]`);if(!button)throw new Error(`Unknown Journey: ${id}`);
    if(scenePlaying||pausedAt>0)stopScene(false);button.click();await wait(80);if(activeJourneyId!==id)throw new Error(`Could not select ${id}`);return snapshot();
  }
  async function triggerEvent(type='random'){await ensurePlaying();const target=provider();if(typeof target?.triggerEvent!=='function')throw new Error('This Journey has no debug event adapter.');const label=await target.triggerEvent(type);record('event',label);return label}
  async function jumpBeforeLoop(leadSeconds=1.5){
    await ensurePlaying();await provider()?.ensureNodes?.();let loops=Object.entries(nodes()).filter(([,node])=>node.__lullabyCrossfadeLoop);
    if(!loops.length)throw new Error('The active phase has no looping ambience.');
    if(!loops.some(([,node])=>!node.el.paused&&Number(node.gain?.gain?.value||0)>.005)){
      document.querySelector('[data-stage-index="2"]')?.click();await wait(900);loops=Object.entries(nodes()).filter(([,node])=>node.__lullabyCrossfadeLoop);
    }
    const lead=Math.max(.25,Math.min(5,Number(leadSeconds)||1.5));for(const[,node]of loops){const duration=Number(node.loopDurationSeconds||node.el.duration),fade=Number(node.loopFadeSeconds||0);node.el.currentTime=Math.max(0,duration-fade-lead)}
    record('loop',`Jumped ${loops.map(([name])=>name).join(', ')} to ${lead.toFixed(1)}s before crossfade`);return loops.map(([name])=>name);
  }
  function snapshot(){
    const elapsed=Number(window.LullabyJourneyRuntime?.elapsedMs||0),total=Number(window.LullabyJourneyRuntime?.totalMs||0);
    return{journeyId:activeJourneyId,playing:!!scenePlaying,elapsedMs:elapsed,totalMs:total,progress:total?elapsed/total:0,phase:document.getElementById('phaseLabel')?.textContent||'',event:document.getElementById('eventLabel')?.textContent||'',eventsEnabled:!!window.LullabyJourneyEvents?.enabled,audioContext:ctx?.state||'not-created',master:Number(masterValue||0),visibility:document.visibilityState,nodes:Object.entries(nodes()).map(describeNode),logs:[...logs]};
  }
  window.LullabyDebug={
    snapshot,selectJourney,triggerEvent,jumpBeforeLoop,
    async playPause(){await startScene();return snapshot()},
    stop(){stopScene(false);return snapshot()},
    stage(index){const button=document.querySelector(`[data-stage-index="${Math.max(0,Math.round(Number(index)||0))}"]`);if(!button)throw new Error('Journey stage is unavailable.');button.click()},
    previousStage(){return window.LullabyJourneyRuntime?.previousPhase?.()},nextStage(){return window.LullabyJourneyRuntime?.nextPhase?.()},
    setEvents(enabled){window.LullabyJourneyEvents?.setEnabled(!!enabled);return!!window.LullabyJourneyEvents?.enabled},
    setDuration(minutes){if(typeof window.setDuration!=='function')throw new Error('Duration control is unavailable.');window.setDuration(Math.max(1,Math.round(Number(minutes)||1)));return window.LullabyJourneyRuntime?.totalMs},
    async setAudioContext(running){await ensureContext();if(running)await ctx.resume();else await ctx.suspend();return ctx.state},
    clearLogs(){logs.length=0},get logs(){return[...logs]}
  };
  dispatchEvent(new CustomEvent('lullaby-debug-ready'));
})();
