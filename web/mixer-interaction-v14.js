(()=>{
  const R=window.LullabyPlayerRuntime;
  if(!R||!document.getElementById('webPlayer'))return;
  const desired=new Map(),starting=new Map(),latestPercent=new Map(),lastNonZero=new Map(),rafById=new Map();
  let draggingInput=null;
  const clampPercent=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0))),english=()=>(window.LullabyI18n?.language||document.documentElement.lang)!=='ko';
  const source=id=>R.sourceById[id]||R.catalog.find(item=>item.id===id)||null;

  function actualState(id){
    const def=source(id)||{};
    if(def.kind==='event'){
      const st=R.eventState[id],on=!!st?.enabled;
      return{on,volume:on?clampPercent((st?.volume??0)*100):0};
    }
    const node=R.nodes[id],on=!!node&&!node.el.paused;
    return{on,volume:on?clampPercent((node?.gain?.gain?.value??0)*100):0};
  }
  const stateFor=id=>desired.get(id)||actualState(id);
  try{getMixerUiState=stateFor}catch{}
  R.getMixerUiState=stateFor;

  function setClass(row,name,enabled){
    if(row.classList.contains(name)!==enabled)row.classList.toggle(name,enabled);
  }
  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
  function setAttr(node,name,value){if(node&&node.getAttribute(name)!==value)node.setAttribute(name,value)}

  function syncSwitch(button,id,on){
    if(!button)return;
    const name=window.LullabyLocales?.sourceName?.(id,source(id)?.name||id)||source(id)?.name||id;
    setText(button,window.LullabyLocales?.term?.(on?'on':'off')||(on?'On':'Off'));
    setAttr(button,'role','switch');setAttr(button,'aria-checked',String(on));setAttr(button,'aria-label',name);
    if(button.hasAttribute('aria-pressed'))button.removeAttribute('aria-pressed');
  }

  function updateDom(id,state=stateFor(id)){
    document.querySelectorAll(`#mixerGrid [data-source="${CSS.escape(id)}"]`).forEach(row=>{
      setClass(row,'on',state.on);setClass(row,'is-zero-off',!state.on);
      const range=row.querySelector(`[data-source-volume="${CSS.escape(id)}"]`);if(range&&document.activeElement!==range&&range.value!==String(state.volume))range.value=String(state.volume);
      syncSwitch(row.querySelector(`[data-source-toggle="${CSS.escape(id)}"]`),id,state.on);
    });
    document.querySelectorAll(`[data-quick-source="${CSS.escape(id)}"]`).forEach(row=>{
      setClass(row,'is-on',state.on);setClass(row,'is-off',!state.on);
      const range=row.querySelector(`[data-quick-volume="${CSS.escape(id)}"]`);if(range&&document.activeElement!==range&&range.value!==String(state.volume))range.value=String(state.volume);
      const output=row.querySelector(`[data-quick-output="${CSS.escape(id)}"]`);setText(output,`${state.volume}%`);
      syncSwitch(row.querySelector(`[data-quick-toggle="${CSS.escape(id)}"]`),id,state.on);
    });
  }

  function setDesired(id,percent){
    const volume=clampPercent(percent),next={on:volume>0,volume};
    desired.set(id,next);latestPercent.set(id,volume);if(volume>0)lastNonZero.set(id,volume);updateDom(id,next);return next;
  }

  function applyGainNextFrame(id,percent){
    if(rafById.has(id))return;
    const frame=requestAnimationFrame(()=>{
      rafById.delete(id);
      const latest=latestPercent.get(id)??percent,node=R.nodes[id];
      if(!node||!window.AudioContext&& !window.webkitAudioContext)return;
      const value=latest/100;
      try{
        if(typeof ctx!=='undefined'&&ctx&&node.gain?.gain?.setTargetAtTime)node.gain.gain.setTargetAtTime(value,ctx.currentTime,.025);
        else if(node.gain?.gain)node.gain.gain.value=value;
      }catch{if(node.gain?.gain)node.gain.gain.value=value}
    });
    rafById.set(id,frame);
  }

  function disable(id){
    const def=source(id);if(!def)return;
    setDesired(id,0);
    if(def.kind==='event'){
      R.stopEventLayer(id);if(R.eventState[id]){R.eventState[id].enabled=false;R.eventState[id].volume=0}
    }else{
      const node=R.nodes[id];if(node){try{node.gain.gain.value=0}catch{};node.el.pause();try{node.el.currentTime=0}catch{}}
    }
    R.updateNowPlaying();
  }

  async function startContinuous(id,def){
    if(starting.has(id))return starting.get(id);
    const task=(async()=>{
      await R.ensureContext();
      if(!R.nodes[id])R.nodes[id]=await R.makeSourceNode(def);
      const node=R.nodes[id];if(!node)throw new Error(`missing audio node: ${id}`);
      const latest=Math.max(1,latestPercent.get(id)||1);node.gain.gain.value=latest/100;
      if(node.el.paused)await node.el.play();
      const after=latestPercent.get(id)||0;
      if(after<=0)disable(id);else applyGainNextFrame(id,after);
      R.updateNowPlaying();
    })().catch(error=>{
      console.error(error);setDesired(id,0);
      R.setStatus?.(english()?'Could not start this sound.':'이 소리를 시작하지 못했습니다.');
    }).finally(()=>starting.delete(id));
    starting.set(id,task);return task;
  }

  function setVolume(id,percent,options={}){
    const def=source(id);if(!def)return Promise.resolve();
    const value=clampPercent(percent);setDesired(id,value);
    if(value===0){disable(id);return Promise.resolve()}
    if(!options.preserveJourney)R.stopJourney?.();
    if(def.kind==='event'){
      if(!R.eventState[id]?.enabled)R.startEventLayer(def);
      if(R.eventState[id]){R.eventState[id].enabled=true;R.eventState[id].volume=value/100}
      window.LullabyAudioStability?.syncDirectVolumes?.();
      R.updateNowPlaying();return Promise.resolve();
    }
    const node=R.nodes[id];
    if(node&&!node.el.paused){applyGainNextFrame(id,value);return Promise.resolve()}
    return startContinuous(id,def);
  }

  function defaultPercent(id){const def=source(id);return clampPercent(lastNonZero.get(id)||def?.defaultVolume||30)||30}
  async function toggle(id){const st=stateFor(id);if(st.on)disable(id);else await setVolume(id,defaultPercent(id));finalize()}
  function normalize(){R.catalog.forEach(def=>updateDom(def.id))}
  function finalize(){if(draggingInput)return;desired.clear();R.renderMixer();R.updateNowPlaying();queueMicrotask(()=>{normalize();window.LullabyQuickMixer?.render?.()})}
  function finishInput(input){const id=input.dataset.sourceVolume||input.dataset.quickVolume;Promise.resolve(starting.get(id)).then(()=>setTimeout(finalize,0))}
  function allOff(){R.catalog.forEach(def=>disable(def.id));finalize()}
  function clearDesiredSoon(){desired.clear();setTimeout(()=>{normalize();window.LullabyQuickMixer?.render?.()},220)}

  const beginInput=event=>{
    const input=event.target.closest?.('[data-source-volume],[data-quick-volume]');if(!input)return;
    if(draggingInput===input)return;
    draggingInput=input;input.dataset.dragging='1';R.ensureContext().catch(()=>{});
  };
  window.addEventListener('pointerdown',beginInput,true);window.addEventListener('mousedown',beginInput,true);window.addEventListener('touchstart',beginInput,{capture:true,passive:true});
  window.addEventListener('input',event=>{
    const input=event.target.closest?.('[data-source-volume],[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();
    const id=input.dataset.sourceVolume||input.dataset.quickVolume;
    setVolume(id,input.value);
  },true);
  window.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-source-volume],[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();if(input!==draggingInput)finishInput(input);
  },true);
  const releaseInput=()=>{if(!draggingInput)return;const input=draggingInput;draggingInput=null;delete input.dataset.dragging;finishInput(input)};
  window.addEventListener('pointerup',releaseInput,true);window.addEventListener('pointercancel',releaseInput,true);
  window.addEventListener('mouseup',releaseInput,true);window.addEventListener('touchend',releaseInput,true);window.addEventListener('touchcancel',releaseInput,true);window.addEventListener('blur',releaseInput);
  window.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-source-toggle],[data-quick-toggle]');
    if(button){event.preventDefault();event.stopImmediatePropagation();toggle(button.dataset.sourceToggle||button.dataset.quickToggle).catch(console.error);return}
    if(event.target.closest?.('#stopAllMixer,[data-quick-all-off]')){event.preventDefault();event.stopImmediatePropagation();allOff();return}
    if(event.target.closest?.('[data-preset],[data-user-preset],[data-saved-load]'))clearDesiredSoon();
  },true);

  if(typeof R.applyPreset==='function'){
    const baseApply=R.applyPreset.bind(R);
    R.applyPreset=async(...args)=>{desired.clear();const result=await baseApply(...args);setTimeout(normalize,80);return result};
  }
  const mixer=document.getElementById('mixerGrid');if(mixer)new MutationObserver(()=>queueMicrotask(normalize)).observe(mixer,{childList:true});
  document.addEventListener('lullaby-language-changed',()=>queueMicrotask(normalize));
  setTimeout(normalize,120);
  window.LullabyMixerInteraction={stateFor,setVolume,disable,normalize,toggle,syncSwitch};
})();
