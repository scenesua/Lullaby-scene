(()=>{
  'use strict';
  if(typeof makeSourceNode!=='function')return;

  const BACKGROUND_EVENT_MIN_MS=15000;
  const observedMedia=new WeakSet();
  const activeMedia=new Set();
  const eventPlayers=new Map();
  let limiter=null;
  let syncQueued=false;

  function randomBetween(min,max){return min+Math.random()*(max-min)}

  function timerScale(){
    if(typeof sleepTimerEnd==='undefined'||!sleepTimerEnd)return 1;
    const fadeMs=Math.max(1,(Number(sleepFadeSeconds)||30)*1000);
    return clamp((sleepTimerEnd-Date.now())/fadeMs,0,1);
  }

  function activeDirectCount(){
    let count=0;
    if(typeof nodes!=='undefined')Object.values(nodes).forEach(node=>{
      if(node?.__lullabyDirect&&!node.el.paused&&!node.el.ended)count++;
    });
    eventPlayers.forEach(media=>{if(!media.paused&&!media.ended)count++});
    return Math.max(1,count);
  }

  function outputHeadroom(){
    const count=activeDirectCount();
    return Math.max(.76,1/Math.sqrt(1+.12*Math.max(0,count-1)));
  }

  function directVolume(sourceGain){
    return clamp((Number(sourceGain)||0)*(Number(masterValue)||0)*timerScale()*outputHeadroom(),0,1);
  }

  function syncDirectVolumes(){
    syncQueued=false;
    if(typeof nodes!=='undefined')Object.values(nodes).forEach(node=>{
      if(node?.__lullabyDirect)node.el.volume=directVolume(node.gain.gain.value);
    });
    eventPlayers.forEach((media,id)=>{
      const gain=eventState?.[media.eventSourceId||id]?.volume??0;
      media.volume=directVolume(gain*(media.eventLevel??1));
    });
  }

  function queueDirectSync(){
    if(syncQueued)return;
    syncQueued=true;
    queueMicrotask(syncDirectVolumes);
  }

  function makeDirectParam(el,initial=.3){
    let current=clamp(Number(initial)||0,0,1);
    return{
      get value(){return current},
      set value(next){current=clamp(Number(next)||0,0,1);queueDirectSync()},
      setTargetAtTime(next){current=clamp(Number(next)||0,0,1);queueDirectSync()},
      cancelScheduledValues(){},
      linearRampToValueAtTime(next){current=clamp(Number(next)||0,0,1);queueDirectSync()}
    };
  }

  function observeMedia(media){
    if(!media||observedMedia.has(media))return;
    observedMedia.add(media);
    media.addEventListener('pause',()=>{activeMedia.delete(media);queueDirectSync();syncMediaSession()});
    media.addEventListener('ended',()=>{activeMedia.delete(media);queueDirectSync();syncMediaSession()});
    media.addEventListener('playing',()=>{activeMedia.add(media);queueDirectSync();syncMediaSession()});
  }

  function makeDirectNode(url,{loop=true,preload='auto'}={}){
    const el=new Audio();
    el.loop=loop;
    el.preload=preload;
    el.crossOrigin='anonymous';
    el.src=url;
    const param=makeDirectParam(el,.3);
    const node={
      el,
      src:null,
      filter:null,
      gain:{gain:param},
      url,
      __lullabyDirect:true
    };
    observeMedia(el);
    queueDirectSync();
    return node;
  }

  function installLimiter(){
    if(typeof ctx==='undefined'||!ctx||typeof master==='undefined'||!master||limiter)return;
    try{
      limiter=ctx.createDynamicsCompressor();
      limiter.threshold.value=-6;
      limiter.knee.value=4;
      limiter.ratio.value=20;
      limiter.attack.value=.003;
      limiter.release.value=.22;
      master.disconnect();
      master.connect(limiter).connect(ctx.destination);
    }catch(error){
      console.warn('Lullaby output limiter unavailable',error);
      limiter=null;
      try{master.connect(ctx.destination)}catch{}
    }
  }

  if(typeof ensureContext==='function'){
    const baseEnsureContext=ensureContext;
    ensureContext=async function(){
      const audioContext=await baseEnsureContext();
      installLimiter();
      return audioContext;
    };
  }

  // Mixer beds do not need realtime DSP. Keeping them as native HTMLAudio
  // avoids Android background throttling of AudioContext render quanta.
  makeSourceNode=async function(def){
    if(!def)throw new Error('Missing source definition');
    const url=def.kind==='aircraft'?await getAircraftUrl():def.url;
    if(!url)throw new Error(`Missing source URL: ${def.id||'unknown'}`);
    if(Number(def.loopCrossfadeSeconds)>0&&typeof makeCrossfadeLoopNode==='function'){
      await ensureContext();
      return makeCrossfadeLoopNode(url,{durationSeconds:def.loopDurationSeconds,fadeSeconds:def.loopCrossfadeSeconds,preload:'auto'});
    }
    return makeDirectNode(url,{loop:true,preload:'auto'});
  };

  if(typeof setSourceVolume==='function'){
    const baseSetSourceVolume=setSourceVolume;
    setSourceVolume=function(id,value){
      const node=nodes?.[id];
      if(node?.__lullabyDirect){node.gain.gain.value=value;return}
      baseSetSourceVolume(id,value);
      if(sourceById?.[id]?.kind==='event')queueDirectSync();
    };
  }

  if(typeof setMaster==='function'){
    const baseSetMaster=setMaster;
    setMaster=function(value,fromTimer=false){
      baseSetMaster(value,fromTimer);
      queueDirectSync();
    };
  }

  if(typeof updateSleepTimer==='function'){
    const baseUpdateSleepTimer=updateSleepTimer;
    updateSleepTimer=function(){
      const result=baseUpdateSleepTimer();
      queueDirectSync();
      return result;
    };
  }

  if(typeof cancelSleepTimer==='function'){
    const baseCancelSleepTimer=cancelSleepTimer;
    cancelSleepTimer=function(){
      const result=baseCancelSleepTimer();
      queueDirectSync();
      return result;
    };
  }

  function getEventMedia(id,def){
    if(def.eventVariants?.length){
      // Reuse idle voices, never restart a ringing note; bound overlap to eight.
      let key=null;
      for(let voice=0;voice<8;voice++){
        const candidate=`${id}:${voice}`,media=eventPlayers.get(candidate);
        if(!media||media.paused||media.ended){key=candidate;break}
      }
      if(key===null)return null;
      let media=eventPlayers.get(key);
      if(!media){media=new Audio();media.preload='auto';media.crossOrigin='anonymous';media.eventSourceId=id;observeMedia(media);eventPlayers.set(key,media)}
      const choices=def.eventVariants.filter(url=>url!==eventState[id].lastVariant);
      const url=choices[Math.floor(Math.random()*choices.length)]||def.eventVariants[0];
      eventState[id].lastVariant=url;
      media.eventLevel=id==='rain_drum'?randomBetween(.48,.84):randomBetween(.62,1);
      media.src=url;
      media.playbackRate=id==='rain_drum'?randomBetween(.90,1.10):1;
      return media;
    }
    let media=eventPlayers.get(id);
    if(media)return media;
    media=new Audio();
    media.preload='auto';
    media.crossOrigin='anonymous';
    media.src=def.url;
    media.loop=false;
    observeMedia(media);
    eventPlayers.set(id,media);
    return media;
  }

  function hiddenEventDelay(def,requested){
    if(Number.isFinite(requested))return Math.max(BACKGROUND_EVENT_MIN_MS,requested);
    const min=Math.max(BACKGROUND_EVENT_MIN_MS,(def?.eventMinSeconds||15)*1000);
    const max=Math.max(min,(def?.eventMaxSeconds||30)*1000);
    return min+Math.random()*(max-min);
  }

  if(typeof scheduleEvent==='function'){
    scheduleEvent=function(id,delayMs=null){
      const st=eventState[id],def=sourceById[id];
      if(!st?.enabled||!def)return;
      const rainDrum=id==='rain_drum';
      const clusterActive=rainDrum&&Number.isFinite(st.clusterRemaining);
      if(rainDrum&&!clusterActive)st.clusterRemaining=1+Math.floor(Math.random()*4);
      let wait=rainDrum
        ?clusterActive?randomBetween(75,260):randomBetween((def.eventMinSeconds||.65)*1000,(def.eventMaxSeconds||2.4)*1000)
        :document.hidden&&!def.eventVariants?.length
        ?hiddenEventDelay(def,delayMs)
        :(delayMs??randomBetween((def.eventMinSeconds||2)*1000,(def.eventMaxSeconds||12)*1000));
      if(delayMs===null&&def.eventVariants?.length&&!rainDrum&&Math.random()<.12)wait+=randomBetween(1800,2600);
      if(st.timer)clearTimeout(st.timer);
      st.timer=setTimeout(async()=>{
        st.timer=null;
        if(!st.enabled)return;
        try{
          const media=getEventMedia(id,def);
          if(!media)return;
          media.volume=directVolume((st.volume??.35)*(media.eventLevel??1));
          try{media.currentTime=0}catch{}
          await media.play();
        }catch(error){if(error?.name!=='AbortError'&&st.enabled)console.error(error)}
        finally{
          if(rainDrum){
            st.clusterRemaining=Math.max(0,(st.clusterRemaining||0)-1);
            if(st.clusterRemaining===0)st.clusterRemaining=NaN;
          }
          if(st.enabled&&eventState[id]===st)scheduleEvent(id);
        }
      },wait);
    };
  }

  if(typeof stopEventLayer==='function'){
    const baseStopEventLayer=stopEventLayer;
    stopEventLayer=function(id){
      baseStopEventLayer(id);
      eventPlayers.forEach((media,key)=>{
        if(key===id||media.eventSourceId===id){media.pause();try{media.currentTime=0}catch{}}
      });
      queueDirectSync();
    };
  }

  if(typeof updateSceneUi==='function'){
    const baseUpdateSceneUi=updateSceneUi;
    updateSceneUi=function(){
      if(!document.hidden)return baseUpdateSceneUi();
      if(!scenePlaying)return;
      const elapsed=currentElapsed();
      // Keep the scene DSP alive only for an actually playing journey. Avoid DOM work.
      updateSceneAudio(elapsed);
      if(elapsed>=durationMinutes*60000)baseUpdateSceneUi();
    };
  }

  function resetEventSchedules(hidden){
    if(typeof eventState==='undefined'||typeof scheduleEvent!=='function')return;
    Object.keys(eventState).forEach(id=>{
      const st=eventState[id];
      if(!st?.enabled)return;
      if(st.timer)clearTimeout(st.timer);
      st.timer=null;
      scheduleEvent(id,sourceById[id]?.eventVariants?.length?null:hidden?BACKGROUND_EVENT_MIN_MS:500);
    });
  }

  async function restoreForegroundAudio(){
    try{
      if(typeof ctx!=='undefined'&&ctx?.state==='suspended'&&scenePlaying)await ctx.resume();
    }catch{}
    if(typeof scenePlaying!=='undefined'&&scenePlaying&&typeof updateSceneUi==='function'){
      try{updateSceneUi()}catch{}
    }
    queueDirectSync();
  }

  document.addEventListener('visibilitychange',()=>{
    resetEventSchedules(document.hidden);
    if(document.hidden){
      // When only native mixer beds are active, suspend the otherwise idle DSP graph.
      if(typeof ctx!=='undefined'&&ctx?.state==='running'&&!scenePlaying)ctx.suspend().catch(()=>{});
      queueDirectSync();
    }else restoreForegroundAudio();
  },{passive:true});
  window.addEventListener('pageshow',()=>{if(!document.hidden)restoreForegroundAudio()},{passive:true});

  function syncMediaSession(){
    if(!('mediaSession' in navigator))return;
    for(const media of [...activeMedia]){
      if(media.paused||media.ended)activeMedia.delete(media);
    }
    try{navigator.mediaSession.playbackState=activeMedia.size?'playing':'paused'}catch{}
  }

  if(window.HTMLMediaElement){
    const nativePlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
      observeMedia(this);
      const result=nativePlay.apply(this,args);
      if(result&&typeof result.then==='function'){
        result.then(()=>{activeMedia.add(this);queueDirectSync();syncMediaSession()}).catch(()=>{});
      }else{
        activeMedia.add(this);queueDirectSync();syncMediaSession();
      }
      return result;
    };
    const nativePause=HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause=function(...args){
      activeMedia.delete(this);
      queueDirectSync();
      syncMediaSession();
      return nativePause.apply(this,args);
    };
  }

  if('mediaSession' in navigator&&window.MediaMetadata){
    try{
      navigator.mediaSession.metadata=new MediaMetadata({
        title:'Lullaby Scene',
        artist:'Lullaby Scene',
        album:'Living soundscapes for sleep'
      });
    }catch{}
  }

  // Runtime bridge was created before this patch; refresh the mutable function refs
  // so MixerInteraction uses the stable native-media path instead of stale WebAudio refs.
  const runtime=window.LullabyPlayerRuntime;
  if(runtime){
    runtime.makeSourceNode=makeSourceNode;
    runtime.setMaster=setMaster;
    runtime.stopEventLayer=stopEventLayer;
    runtime.ensureContext=ensureContext;
  }

  queueDirectSync();
  window.LullabyAudioStability={
    version:2,
    get eventVoices(){return [...eventPlayers].map(([key,media])=>({id:media.eventSourceId||key,url:media.src,paused:media.paused,ended:media.ended,volume:media.volume,playbackRate:media.playbackRate}))},
    installLimiter,
    syncDirectVolumes,
    get limiterActive(){return !!limiter},
    get backgroundMode(){return document.hidden},
    get directSourceCount(){return typeof nodes==='undefined'?0:Object.values(nodes).filter(node=>node?.__lullabyDirect).length},
    get activeDirectCount(){return activeDirectCount()}
  };
})();
