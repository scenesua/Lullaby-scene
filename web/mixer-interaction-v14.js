(()=>{
  const R=window.LullabyPlayerRuntime;
  if(!R||!document.getElementById('webPlayer'))return;
  const desired=new Map(),starting=new Map();
  const clampPercent=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));
  const source=id=>R.sourceById[id]||R.catalog.find(item=>item.id===id)||null;
  const originalGet=typeof getMixerUiState==='function'?getMixerUiState.bind(window):R.getMixerUiState.bind(R);

  function actualState(id){
    const def=source(id)||{};
    if(def.kind==='event'){
      const st=R.eventState[id],on=!!st?.enabled;
      return{on,volume:on?clampPercent((st?.volume??0)*100):0};
    }
    const node=R.nodes[id],on=!!node&&!node.el.paused;
    return{on,volume:on?clampPercent((node?.gain?.gain?.value??0)*100):0};
  }
  function stateFor(id){return desired.get(id)||actualState(id)}
  try{getMixerUiState=stateFor}catch{}
  R.getMixerUiState=stateFor;

  function setDesired(id,percent){
    const volume=clampPercent(percent);
    const next={on:volume>0,volume};desired.set(id,next);updateDom(id,next);return next;
  }
  function clearDesiredSoon(){desired.clear();setTimeout(()=>{normalize();window.LullabyQuickMixer?.render?.()},220)}

  function disable(id){
    const def=source(id);if(!def)return;
    setDesired(id,0);
    if(def.kind==='event'){
      R.stopEventLayer(id);
      if(R.eventState[id])R.eventState[id].volume=0;
    }else{
      const node=R.nodes[id];if(node){node.gain.gain.value=0;node.el.pause();try{node.el.currentTime=0}catch{}}
    }
    R.updateNowPlaying();
  }

  async function ensureEnabled(id,percent){
    const def=source(id);if(!def)return;
    const volume=Math.max(1,clampPercent(percent));
    setDesired(id,volume);
    if(def.kind==='event'){
      if(!R.eventState[id]?.enabled)R.startEventLayer(def);
      if(R.eventState[id]){R.eventState[id].enabled=true;R.eventState[id].volume=volume/100}
      R.updateNowPlaying();return;
    }
    if(starting.has(id)){
      await starting.get(id);
      const node=R.nodes[id];if(node)node.gain.gain.value=volume/100;
      return;
    }
    const task=(async()=>{
      await R.ensureContext();
      if(!R.nodes[id])R.nodes[id]=await R.makeSourceNode(def);
      const node=R.nodes[id];if(!node)throw new Error(`missing audio node: ${id}`);
      node.gain.gain.value=volume/100;
      if(node.el.paused)await node.el.play();
      R.updateNowPlaying();
    })().catch(error=>{
      console.error(error);setDesired(id,0);
      R.setStatus?.(window.LullabyI18n?.language==='en'?'Could not start this sound.':'이 소리를 시작하지 못했습니다.');
    }).finally(()=>starting.delete(id));
    starting.set(id,task);await task;
  }

  function updateDom(id,state=stateFor(id)){
    document.querySelectorAll(`#mixerGrid [data-source="${CSS.escape(id)}"]`).forEach(row=>{
      row.classList.toggle('on',state.on);
      row.classList.toggle('is-zero-off',!state.on);
      const range=row.querySelector(`[data-source-volume="${CSS.escape(id)}"]`);if(range&&document.activeElement!==range)range.value=String(state.volume);
      const button=row.querySelector(`[data-source-toggle="${CSS.escape(id)}"]`);if(button)button.textContent=state.on?'On':'Off';
    });
    document.querySelectorAll(`[data-quick-source="${CSS.escape(id)}"]`).forEach(row=>{
      row.classList.toggle('is-on',state.on);row.classList.toggle('is-off',!state.on);
      const range=row.querySelector(`[data-quick-volume="${CSS.escape(id)}"]`);if(range&&document.activeElement!==range)range.value=String(state.volume);
      const output=row.querySelector(`[data-quick-output="${CSS.escape(id)}"]`);if(output)output.textContent=`${state.volume}%`;
      const button=row.querySelector(`[data-quick-toggle="${CSS.escape(id)}"]`);if(button){button.textContent=state.on?(window.LullabyI18n?.language==='en'?'Turn off':'끔'):(window.LullabyI18n?.language==='en'?'Add':'추가');button.setAttribute('aria-pressed',String(state.on))}
    });
  }
  function normalize(){R.catalog.forEach(def=>updateDom(def.id))}
  function finalize(){R.renderMixer();R.updateNowPlaying();queueMicrotask(()=>{normalize();window.LullabyQuickMixer?.render?.()})}

  async function setFromRange(input){
    const id=input.dataset.sourceVolume||input.dataset.quickVolume;if(!id)return;
    const percent=clampPercent(input.value);setDesired(id,percent);
    if(percent===0)disable(id);else await ensureEnabled(id,percent);
  }
  function defaultPercent(id){const def=source(id);return clampPercent(def?.defaultVolume||30)||30}
  async function toggle(id){const st=stateFor(id);if(st.on)disable(id);else await ensureEnabled(id,st.volume||defaultPercent(id));finalize()}
  function allOff(){R.catalog.forEach(def=>disable(def.id));finalize()}

  window.addEventListener('pointerdown',event=>{
    if(!event.target.closest?.('[data-source-volume],[data-quick-volume]'))return;
    R.ensureContext().catch(()=>{});
  },true);
  window.addEventListener('input',event=>{
    const input=event.target.closest?.('[data-source-volume],[data-quick-volume]');if(!input)return;
    event.preventDefault();event.stopImmediatePropagation();
    const id=input.dataset.sourceVolume||input.dataset.quickVolume,percent=clampPercent(input.value);
    setDesired(id,percent);
    // Do not rebuild either mixer while the thumb is moving. That was the main
    // source of the sticky/jerky range control behavior.
    setFromRange(input).catch(console.error);
  },true);
  window.addEventListener('change',event=>{
    if(!event.target.closest?.('[data-source-volume],[data-quick-volume]'))return;
    event.stopImmediatePropagation();setTimeout(finalize,0);
  },true);
  window.addEventListener('pointerup',event=>{
    if(event.target.closest?.('[data-source-volume],[data-quick-volume]'))setTimeout(finalize,0);
  },true);
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
  const mixer=document.getElementById('mixerGrid');if(mixer)new MutationObserver(()=>queueMicrotask(normalize)).observe(mixer,{childList:true,subtree:true});
  document.addEventListener('lullaby-language-changed',()=>queueMicrotask(normalize));
  setTimeout(normalize,120);
  window.LullabyMixerInteraction={stateFor,setVolume:(id,percent)=>percent<=0?(disable(id),Promise.resolve()):ensureEnabled(id,percent),disable,normalize};
})();
