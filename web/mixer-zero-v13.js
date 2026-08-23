(()=>{
  const R=window.LullabyPlayerRuntime;
  const root=document.getElementById('mixerGrid');
  if(!R||!root)return;
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  const source=id=>R.sourceById[id]||R.catalog.find(item=>item.id===id)||null;

  function off(id){
    const def=source(id);if(!def)return;
    if(def.kind==='event'){
      R.stopEventLayer(id);
      if(R.eventState[id])R.eventState[id].volume=0;
    }else{
      const node=R.nodes[id];
      if(node){node.el.pause();node.el.currentTime=0;node.gain.gain.value=0}
    }
  }

  async function on(id,volume){
    const def=source(id);if(!def)return;
    const value=Math.max(.001,clamp(volume));
    if(def.kind==='event'){
      if(!R.eventState[id]?.enabled)R.startEventLayer(def);
      if(R.eventState[id]){R.eventState[id].enabled=true;R.eventState[id].volume=value}
      return;
    }
    await R.ensureContext();
    if(!R.nodes[id])R.nodes[id]=await R.makeSourceNode(def);
    const node=R.nodes[id];
    node.gain.gain.value=value;
    if(node.el.paused)await node.el.play();
  }

  function normalizeRows(){
    root.querySelectorAll('.mixer-source').forEach(card=>{
      const id=card.dataset.source,range=card.querySelector('[data-source-volume]');
      if(!id||!range)return;
      const state=R.getMixerUiState(id);
      if(!state.on){range.value='0';card.classList.add('is-zero-off')}
      else{card.classList.remove('is-zero-off');range.value=String(Math.max(1,Math.min(100,state.volume||1)))}
    });
  }

  async function applySlider(input){
    const id=input.dataset.sourceVolume,value=clamp(Number(input.value)/100);
    input.disabled=true;
    try{
      if(value<=0)off(id);else await on(id,value);
      R.renderMixer();R.updateNowPlaying();
    }catch(error){console.error(error);R.setStatus?.(window.LullabyI18n?.language==='en'?'Could not start this sound.':'이 소리를 시작하지 못했습니다.')}
    finally{input.disabled=false;queueMicrotask(normalizeRows)}
  }

  async function toggle(button){
    const id=button.dataset.sourceToggle,def=source(id);if(!def)return;
    const state=R.getMixerUiState(id);
    if(state.on)off(id);else await on(id,(Number(def.defaultVolume)||30)/100);
    R.renderMixer();R.updateNowPlaying();queueMicrotask(normalizeRows);
  }

  document.addEventListener('input',event=>{
    const input=event.target.closest?.('#mixerGrid [data-source-volume]');if(!input)return;
    event.preventDefault();event.stopImmediatePropagation();applySlider(input);
  },true);
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#mixerGrid [data-source-toggle]');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();toggle(button).catch(console.error);
  },true);

  new MutationObserver(()=>queueMicrotask(normalizeRows)).observe(root,{childList:true,subtree:true});
  normalizeRows();setTimeout(normalizeRows,250);
  window.LullabyMixerZero={normalizeRows,on,off};
})();
