(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const R=window.LullabyPlayerRuntime;
  if(!R){console.error('LullabyPlayerRuntime is unavailable');return}
  const isEnglish=()=>(window.LullabyI18n?.language||document.documentElement.lang)!=='ko';
  let activePreset=null,interactionActive=false,renderPending=false;
  const starting=new Map(),volumeTasks=new Map();
  const sourceDef=id=>R.sourceById[id]||R.catalog.find(source=>source.id===id)||null;
  const stateFor=id=>window.LullabyMixerInteraction?.stateFor?.(id)||R.getMixerUiState(id)||{on:false,volume:0};
  const presetById=id=>R.presets.find(item=>item.id===id)||(R.loadUserPresets()||[]).find(item=>item.id===id)||null;
  const presetIds=()=>activePreset?Object.keys(activePreset.mix||{}):[];
  const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function ensureMainQuickMixer(){
    const host=$('[data-scene-content="simple"]');if(!host)return null;
    let section=$('#simpleQuickMixerSection');if(section)return section.querySelector('#simpleQuickMixerList');
    section=document.createElement('section');section.id='simpleQuickMixerSection';section.className='simple-quick-mixer-main';
    section.innerHTML='<div class="quick-mixer-heading"><div><p class="eyebrow" data-quick-title></p><p class="muted-copy" data-quick-help></p></div><button type="button" class="small-action" data-quick-all-off></button></div><div id="simpleQuickMixerList" class="quick-mixer-list"></div>';
    const picker=$('#presetPicker'),transport=$('#simpleSceneTransport');if(picker)picker.insertAdjacentElement('afterend',section);else if(transport)transport.insertAdjacentElement('afterend',section);else host.querySelector('.simple-scene-header')?.insertAdjacentElement('afterend',section);
    localize();return section.querySelector('#simpleQuickMixerList');
  }
  const roots=()=>[ensureMainQuickMixer(),$('#inspectorMixerList')].filter(Boolean);

  function orderedSources(){
    const preferred=presetIds(),preferredSet=new Set(preferred),byId=new Map(R.catalog.map(item=>[item.id,item]));
    const presetSources=preferred.map(id=>byId.get(id)).filter(Boolean);
    const extras=R.catalog.filter(item=>!preferredSet.has(item.id)&&stateFor(item.id).on);
    const inactive=R.catalog.filter(item=>!preferredSet.has(item.id)&&!stateFor(item.id).on);
    return [...presetSources,...extras,...inactive];
  }

  function rowMarkup(def){
    const state=stateFor(def.id),on=!!state.on,preferred=presetIds().includes(def.id),volume=on?Math.max(0,Math.min(100,Number(state.volume)||0)):0;
    const status=preferred?(isEnglish()?'Current scene':'현재 씬'):on?(isEnglish()?'On':'켜짐'):(isEnglish()?'Off':'꺼짐');
    const action=window.LullabyLocales?.term?.(on?'on':'off')||(on?'On':'Off');
    return `<div class="quick-mixer-row ${on?'is-on':'is-off'} ${preferred?'is-preset-source':''}" data-quick-source="${def.id}"><div class="quick-mixer-copy"><strong title="${escapeText(def.name||def.id)}">${escapeText(def.name||def.id)}</strong><span>${status}</span></div><button type="button" data-quick-toggle="${def.id}" role="switch" aria-checked="${on}" aria-label="${escapeText(def.name||def.id)}">${action}</button><label class="quick-mixer-volume"><output data-quick-output="${def.id}">${volume}%</output><input data-quick-volume="${def.id}" type="range" min="0" max="100" value="${volume}" aria-label="${escapeText(def.name||def.id)} volume"></label></div>`;
  }

  function render(){
    if(interactionActive||document.querySelector('[data-dragging="1"]')){renderPending=true;return}
    renderPending=false;const list=orderedSources();if(!list.length){setTimeout(render,150);return}
    const html=list.map(rowMarkup).join('');roots().forEach(root=>{if(root.innerHTML===html)return;const focused=root.contains(document.activeElement)?document.activeElement:null,kind=focused?.hasAttribute('data-quick-volume')?'data-quick-volume':'data-quick-toggle',id=focused?.getAttribute(kind);root.innerHTML=html;if(id)root.querySelector(`[${kind}="${CSS.escape(id)}"]`)?.focus({preventScroll:true})});localize();
  }
  function requestRender(){if(interactionActive){renderPending=true;return}queueMicrotask(render)}

  async function legacyEnsureEnabled(id,volume){
    const def=sourceDef(id);if(!def)return;const value=Math.max(.001,Math.min(1,Number(volume)||0));
    if(def.kind==='event'){
      if(!R.eventState[id]?.enabled)R.startEventLayer(def);
      if(R.eventState[id]){R.eventState[id].enabled=true;R.eventState[id].volume=value}
      return;
    }
    if(starting.has(id)){await starting.get(id);if(R.nodes[id])R.nodes[id].gain.gain.value=value;return}
    const task=(async()=>{await R.ensureContext();if(!R.nodes[id])R.nodes[id]=await R.makeSourceNode(def);const node=R.nodes[id];if(!node)return;node.gain.gain.value=value;if(node.el.paused)await node.el.play()})().finally(()=>starting.delete(id));
    starting.set(id,task);await task;
  }

  function legacyDisable(id){
    const def=sourceDef(id);if(!def)return;
    if(def.kind==='event'){R.stopEventLayer(id);if(R.eventState[id])R.eventState[id].volume=0;return}
    const nodes=R.nodes;if(nodes[id]){nodes[id].el.pause();nodes[id].el.currentTime=0;nodes[id].gain.gain.value=0}
  }

  function preferredPercent(id){
    const presetValue=activePreset?.mix?.[id];
    if(Number(presetValue)>0)return Math.max(1,Math.min(100,Math.round(Number(presetValue)*100)));
    const def=sourceDef(id);return Math.max(1,Math.min(100,Math.round(Number(def?.defaultVolume||30))));
  }

  function updateRowDuringInput(id,percent){
    const value=Math.max(0,Math.min(100,Number(percent)||0));
    $$(`[data-quick-source="${id}"]`).forEach(row=>{
      const on=value>0;
      if(row.classList.contains('is-on')!==on)row.classList.toggle('is-on',on);
      if(row.classList.contains('is-off')===on)row.classList.toggle('is-off',!on);
      const output=row.querySelector(`[data-quick-output="${id}"]`);if(output&&output.textContent!==`${Math.round(value)}%`)output.textContent=`${Math.round(value)}%`;
      const button=row.querySelector(`[data-quick-toggle="${id}"]`);window.LullabyMixerInteraction?.syncSwitch?.(button,id,on);
      const status=row.querySelector('.quick-mixer-copy span');if(status&&!row.classList.contains('is-preset-source')){const text=on?(isEnglish()?'On':'켜짐'):(isEnglish()?'Off':'꺼짐');if(status.textContent!==text)status.textContent=text}
      row.querySelectorAll(`[data-quick-volume="${id}"]`).forEach(input=>{const text=String(Math.round(value));if(document.activeElement!==input&&input.value!==text)input.value=text});
    });
  }

  async function setQuickVolume(id,percent){
    const value=Math.max(0,Math.min(100,Number(percent)||0));updateRowDuringInput(id,value);
    if(window.LullabyMixerInteraction?.setVolume){await window.LullabyMixerInteraction.setVolume(id,value);return}
    if(value===0)legacyDisable(id);else await legacyEnsureEnabled(id,value/100);R.updateNowPlaying();
  }
  async function toggle(id){
    if(window.LullabyMixerInteraction?.toggle){await window.LullabyMixerInteraction.toggle(id);requestRender();return}
    if(stateFor(id).on)legacyDisable(id);else await legacyEnsureEnabled(id,preferredPercent(id)/100);R.renderMixer();R.updateNowPlaying();requestRender();
  }
  function turnAllOff(){
    if(window.LullabyMixerInteraction){R.catalog.forEach(def=>window.LullabyMixerInteraction.disable(def.id));R.renderMixer();R.updateNowPlaying();requestRender();return}
    R.catalog.forEach(def=>legacyDisable(def.id));R.renderMixer();R.updateNowPlaying();requestRender();
  }
  function localize(){
    const title=isEnglish()?'Quick Mixer':'퀵 믹서';
    const help=isEnglish()?'0% is Off. Moving above 0% turns the sound On; current-scene sounds stay at the top.':'0%는 꺼짐, 1% 이상은 켜짐입니다. 현재 씬 소리는 위에 고정됩니다.';
    $$('[data-quick-title]').forEach(el=>{if(el.textContent!==title)el.textContent=title});$$('[data-quick-help]').forEach(el=>{if(el.textContent!==help)el.textContent=help});$$('[data-quick-all-off]').forEach(el=>{const text=isEnglish()?'Turn all off':'전체 끄기';if(el.textContent!==text)el.textContent=text})
  }

  window.addEventListener('click',event=>{
    const preset=event.target.closest?.('[data-preset],[data-user-preset],[data-saved-load]');if(preset){activePreset=presetById(preset.dataset.preset||preset.dataset.userPreset||preset.dataset.savedLoad);setTimeout(render,180);return}
    const toggleButton=event.target.closest?.('[data-quick-toggle]');if(toggleButton){event.preventDefault();event.stopImmediatePropagation();toggle(toggleButton.dataset.quickToggle);return}
    if(event.target.closest?.('[data-quick-all-off]')){event.preventDefault();event.stopImmediatePropagation();turnAllOff()}
  },true);
  window.addEventListener('input',event=>{
    const input=event.target.closest?.('[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();interactionActive=true;
    const id=input.dataset.quickVolume;
    const task=setQuickVolume(id,input.value).catch(error=>console.error(error)).finally(()=>{if(volumeTasks.get(id)===task)volumeTasks.delete(id)});
    volumeTasks.set(id,task);
  },true);
  window.addEventListener('change',async event=>{
    const input=event.target.closest?.('[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();const id=input.dataset.quickVolume;
    const pending=volumeTasks.get(id);if(pending)await pending;
    interactionActive=false;R.renderMixer();R.updateNowPlaying();if(renderPending)render();else requestRender();
  },true);
  document.addEventListener('lullaby-language-changed',requestRender);document.addEventListener('lullaby-scene-mode-changed',event=>{if(event.detail?.mode==='simple')requestRender()});
  // Only watch direct Mixer row replacement. Watching class mutations caused a
  // render -> normalize -> class mutation -> render feedback loop that locked
  // the browser main thread while dragging.
  const mixer=$('#mixerGrid');if(mixer)new MutationObserver(requestRender).observe(mixer,{childList:true});
  const inspector=$('#inspectorMixerList');if(inspector)new MutationObserver(()=>{if(!inspector.querySelector('[data-quick-source]'))requestRender()}).observe(inspector,{childList:true});
  ensureMainQuickMixer();setTimeout(render,100);setTimeout(render,500);window.LullabyQuickMixer={render,turnAllOff,get activePreset(){return activePreset}};
})();
