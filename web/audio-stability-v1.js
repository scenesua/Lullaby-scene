(()=>{
  'use strict';
  if(typeof ensureContext!=='function')return;

  const BACKGROUND_EVENT_MIN_MS=15000;
  const observedMedia=new WeakSet();
  const activeMedia=new Set();
  let limiter=null;

  function installLimiter(){
    if(!ctx||!master||limiter)return;
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

  const baseEnsureContext=ensureContext;
  ensureContext=async function(){
    const audioContext=await baseEnsureContext();
    installLimiter();
    return audioContext;
  };

  function bypassRedundantSourceFilter(node,def){
    if(!node||!node.src||!node.filter||!node.gain||def?.kind==='aircraft'||node.__lullabyFilterBypassed)return node;
    try{
      node.src.disconnect();
      node.filter.disconnect();
      node.src.connect(node.gain);
      node.__lullabyFilterBypassed=true;
    }catch(error){
      console.warn('Lullaby source filter bypass unavailable',error);
    }
    return node;
  }

  if(typeof makeSourceNode==='function'){
    const baseMakeSourceNode=makeSourceNode;
    makeSourceNode=async function(def){
      return bypassRedundantSourceFilter(await baseMakeSourceNode(def),def);
    };
  }

  function hiddenEventDelay(def,requested){
    if(Number.isFinite(requested))return Math.max(BACKGROUND_EVENT_MIN_MS,requested);
    const min=Math.max(BACKGROUND_EVENT_MIN_MS,(def?.eventMinSeconds||15)*1000);
    const max=Math.max(min,(def?.eventMaxSeconds||30)*1000);
    return min+Math.random()*(max-min);
  }

  if(typeof scheduleEvent==='function'){
    const baseScheduleEvent=scheduleEvent;
    scheduleEvent=function(id,delayMs=null){
      const st=eventState[id],def=sourceById[id];
      if(!st?.enabled||!def)return;
      if(!document.hidden)return baseScheduleEvent(id,delayMs);
      if(st.timer)clearTimeout(st.timer);
      st.timer=setTimeout(()=>{
        st.timer=null;
        if(st.enabled)scheduleEvent(id);
      },hiddenEventDelay(def,delayMs));
    };
  }

  if(typeof updateSceneUi==='function'){
    const baseUpdateSceneUi=updateSceneUi;
    updateSceneUi=function(){
      if(!document.hidden)return baseUpdateSceneUi();
      if(!scenePlaying)return;
      const elapsed=currentElapsed();
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
      scheduleEvent(id,hidden?BACKGROUND_EVENT_MIN_MS:500);
    });
  }

  async function restoreForegroundAudio(){
    try{
      if(ctx?.state==='suspended')await ctx.resume();
    }catch{}
    if(typeof scenePlaying!=='undefined'&&scenePlaying&&typeof updateSceneUi==='function'){
      try{updateSceneUi()}catch{}
    }
  }

  document.addEventListener('visibilitychange',()=>{
    resetEventSchedules(document.hidden);
    if(!document.hidden)restoreForegroundAudio();
  },{passive:true});
  window.addEventListener('pageshow',()=>{if(!document.hidden)restoreForegroundAudio()},{passive:true});

  function syncMediaSession(){
    if(!('mediaSession' in navigator))return;
    for(const media of [...activeMedia]){
      if(media.paused||media.ended)activeMedia.delete(media);
    }
    try{navigator.mediaSession.playbackState=activeMedia.size?'playing':'paused'}catch{}
  }

  function observeMedia(media){
    if(observedMedia.has(media))return;
    observedMedia.add(media);
    media.addEventListener('pause',()=>{activeMedia.delete(media);syncMediaSession()});
    media.addEventListener('ended',()=>{activeMedia.delete(media);syncMediaSession()});
    media.addEventListener('playing',()=>{activeMedia.add(media);syncMediaSession()});
  }

  if(window.HTMLMediaElement){
    const nativePlay=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
      observeMedia(this);
      const result=nativePlay.apply(this,args);
      if(result&&typeof result.then==='function'){
        result.then(()=>{activeMedia.add(this);syncMediaSession()}).catch(()=>{});
      }else{
        activeMedia.add(this);syncMediaSession();
      }
      return result;
    };
    const nativePause=HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause=function(...args){
      activeMedia.delete(this);
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

  window.LullabyAudioStability={
    version:1,
    installLimiter,
    get limiterActive(){return !!limiter},
    get backgroundMode(){return document.hidden}
  };
})();
