(()=>{
  if(typeof ensureContext!=='function'||typeof makeMediaNode!=='function'||typeof makeSourceNode!=='function')return;
  let fxInput=null,warmth=null,air=null,glue=null,dry=null,convolver=null,wet=null;
  const defaults={warmth:50,air:50,room:18,glue:22};
  let state={...defaults};
  try{state={...defaults,...JSON.parse(localStorage.getItem('lullaby-simple-fx')||'{}')}}catch{}

  const baseEnsureContext=ensureContext;
  ensureContext=async function(){
    await baseEnsureContext();
    if(!fxInput){
      fxInput=ctx.createGain();
      warmth=ctx.createBiquadFilter();warmth.type='lowshelf';warmth.frequency.value=180;
      air=ctx.createBiquadFilter();air.type='highshelf';air.frequency.value=5200;
      glue=ctx.createDynamicsCompressor();glue.attack.value=.025;glue.release.value=.38;kneeSafe(glue,22);
      dry=ctx.createGain();dry.gain.value=1;
      convolver=ctx.createConvolver();convolver.buffer=createImpulse(ctx,1.65,2.25);
      wet=ctx.createGain();wet.gain.value=0;
      fxInput.connect(warmth).connect(air).connect(glue);
      glue.connect(dry).connect(master);
      glue.connect(convolver).connect(wet).connect(master);
      applyState(false);
    }
    return ctx;
  };

  function kneeSafe(node,value){try{node.knee.value=value}catch{}}
  function createImpulse(audioCtx,seconds,decay){
    const length=Math.max(1,Math.floor(audioCtx.sampleRate*seconds));
    const buffer=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let c=0;c<2;c++){
      const data=buffer.getChannelData(c);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,decay);
    }
    return buffer;
  }
  function clamp(v){return Math.max(0,Math.min(100,Number(v)||0))}
  function persist(){localStorage.setItem('lullaby-simple-fx',JSON.stringify(state))}
  function applyState(save=true){
    if(save)persist();
    if(!ctx||!fxInput)return;
    const w=clamp(state.warmth),a=clamp(state.air),r=clamp(state.room),g=clamp(state.glue);
    warmth.gain.setTargetAtTime((w-50)*.12,ctx.currentTime,.08);
    air.gain.setTargetAtTime((a-50)*.14,ctx.currentTime,.08);
    wet.gain.setTargetAtTime((r/100)*.24,ctx.currentTime,.1);
    glue.threshold.setTargetAtTime(-3-(g/100)*18,ctx.currentTime,.08);
    glue.ratio.setTargetAtTime(1+(g/100)*3.2,ctx.currentTime,.08);
  }
  function makeFxMediaNode(url,{loop=true}={}){
    const el=new Audio(url);el.loop=loop;el.preload='auto';el.crossOrigin='anonymous';
    const src=ctx.createMediaElementSource(el),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=20000;gain.gain.value=.3;
    src.connect(filter).connect(gain).connect(fxInput);
    return{el,src,filter,gain,url};
  }

  makeSourceNode=async function(def){
    await ensureContext();
    if(def.kind==='aircraft')return makeFxMediaNode(await getAircraftUrl());
    return makeFxMediaNode(def.url);
  };

  scheduleEvent=function(id,delayMs=null){
    const st=eventState[id],def=sourceById[id];if(!st?.enabled||!def)return;
    const wait=delayMs??rand((def.eventMinSeconds||2)*1000,(def.eventMaxSeconds||12)*1000);
    st.timer=setTimeout(async()=>{
      if(!st.enabled)return;
      try{
        await ensureContext();const node=makeFxMediaNode(def.url,{loop:false});node.gain.gain.value=st.volume??.35;
        node.el.addEventListener('ended',()=>{try{node.src.disconnect();node.filter.disconnect();node.gain.disconnect()}catch{}},{once:true});
        await node.el.play();
      }catch(err){console.error(err)}finally{if(st.enabled)scheduleEvent(id)}
    },wait);
  };

  function set(name,value){if(!(name in defaults))return;state[name]=clamp(value);applyState(true);syncUi()}
  function snapshot(){return{warmth:clamp(state.warmth),air:clamp(state.air),room:clamp(state.room),glue:clamp(state.glue)}}
  function apply(next){state={...defaults,...(next||{})};applyState(true);syncUi()}
  function reset(){apply(defaults)}
  function syncUi(){
    Object.entries(snapshot()).forEach(([key,value])=>{
      document.querySelectorAll(`[data-fx="${key}"]`).forEach(el=>{if(document.activeElement!==el)el.value=value});
      document.querySelectorAll(`[data-fx-output="${key}"]`).forEach(el=>el.textContent=`${Math.round(value)}%`);
    });
  }
  document.addEventListener('input',e=>{const input=e.target.closest?.('[data-fx]');if(input)set(input.dataset.fx,input.value)});
  document.addEventListener('DOMContentLoaded',syncUi,{once:true});setTimeout(syncUi,0);
  window.LullabyMixerFx={set,snapshot,apply,reset,defaults:{...defaults},syncUi};
})();
