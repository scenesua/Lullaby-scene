(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const R=window.LullabyPlayerRuntime;
  if(!R){console.error('LullabyPlayerRuntime is unavailable');return}
  const isEnglish=()=>window.LullabyI18n?.language==='en';
  let activePreset=null,interactionActive=false,renderPending=false;
  const starting=new Map(),volumeTasks=new Map();
  const sourceDef=id=>R.sourceById[id]||R.catalog.find(source=>source.id===id)||null;
  const stateFor=id=>R.getMixerUiState(id)||{on:false,volume:0};
  const presetById=id=>R.presets.find(item=>item.id===id)||(R.loadUserPresets()||[]).find(item=>item.id===id)||null;
  const presetIds=()=>activePreset?Object.keys(activePreset.mix||{}):[];
  const escapeText=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function ensureMainQuickMixer(){
    const host=$('[data-scene-content="simple"]');if(!host)return null;
    let section=$('#simpleQuickMixerSection');if(section)return section.querySelector('#simpleQuickMixerList');
    section=document.createElement('section');section.id='simpleQuickMixerSection';section.className='simple-quick-mixer-main';
    section.innerHTML='<div class="quick-mixer-heading"><div><p class="eyebrow" data-quick-title></p><p class="muted-copy" data-quick-help></p></div><button type="button" class="small-action" data-quick-all-off></button></div><div id="simpleQuickMixerList" class="quick-mixer-list"></div>';
    const transport=$('#simpleSceneTransport');if(transport)transport.insertAdjacentElement('afterend',section);else host.querySelector('.simple-scene-header')?.insertAdjacentElement('afterend',section);
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
    const status=preferred?(isEnglish()?'Current scene':'현재 씬'):on?(isEnglish()?'Added':'추가됨'):(isEnglish()?'Available':'추가 가능');
    const action=on?(isEnglish()?'Turn off':'끔'):(isEnglish()?'Add':'추가');
    return `<div class="quick-mixer-row ${on?'is-on':'is-off'} ${preferred?'is-preset-source':''}" data-quick-source="${def.id}"><div class="quick-mixer-copy"><strong title="${escapeText(def.name||def.id)}">${escapeText(def.name||def.id)}</strong><span>${status}</span></div><button type="button" data-quick-toggle="${def.id}" aria-pressed="${on}">${action}</button><label class="quick-mixer-volume"><output data-quick-output="${def.id}">${volume}%</output><input data-quick-volume="${def.id}" type="range" min="0" max="100" value="${volume}" aria-label="${escapeText(def.name||def.id)} volume"></label></div>`;
  }

  function render(){
    if(interactionActive){renderPending=true;return}
    renderPending=false;const list=orderedSources();if(!list.length){setTimeout(render,150);return}
    const html=list.map(rowMarkup).join('');roots().forEach(root=>root.innerHTML=html);localize();
  }
  function requestRender(){if(interactionActive){renderPending=true;return}queueMicrotask(render)}

  async function ensureEnabled(id,volume){
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

  function disable(id){
    const def=sourceDef(id);if(!def)return;
    if(def.kind==='event'){R.stopEventLayer(id);if(R.eventState[id])R.eventState[id].volume=0;return}
    const nodes=R.nodes;if(nodes[id]){nodes[id].el.pause();nodes[id].el.currentTime=0;nodes[id].gain.gain.value=0}
  }

  function preferredVolume(id){const presetValue=activePreset?.mix?.[id];if(Number(presetValue)>0)return Number(presetValue);const def=sourceDef(id);return Math.max(.01,Math.min(1,Number(def?.defaultVolume||30)/100))}

  function updateRowDuringInput(id,value){
    $$(`[data-quick-source="${id}"]`).forEach(row=>{
      const on=value>0;row.classList.toggle('is-on',on);row.classList.toggle('is-off',!on);
      const output=row.querySelector(`[data-quick-output="${id}"]`);if(output)output.textContent=`${Math.round(value*100)}%`;
      const button=row.querySelector(`[data-quick-toggle="${id}"]`);if(button){button.textContent=on?(isEnglish()?'Turn off':'끔'):(isEnglish()?'Add':'추가');button.setAttribute('aria-pressed',String(on))}
      row.querySelectorAll(`[data-quick-volume="${id}"]`).forEach(input=>{if(document.activeElement!==input)input.value=String(Math.round(value*100))});
    });
  }

  async function setQuickVolume(id,percent){const value=Math.max(0,Math.min(100,Number(percent)||0))/100;updateRowDuringInput(id,value);if(value===0)disable(id);else await ensureEnabled(id,value);R.updateNowPlaying()}
  async function toggle(id){if(stateFor(id).on)disable(id);else await ensureEnabled(id,preferredVolume(id));R.renderMixer();R.updateNowPlaying();requestRender()}
  function turnAllOff(){R.catalog.forEach(def=>disable(def.id));R.renderMixer();R.updateNowPlaying();requestRender()}
  function localize(){const title=isEnglish()?'Quick Mixer':'퀵 믹서',help=isEnglish()?'Scene sounds stay at the top. Move a 0% slider to add another sound.':'현재 씬 소리는 위에 고정됩니다. 0% 슬라이더를 움직이면 다른 소리가 추가됩니다.';$$('[data-quick-title]').forEach(el=>el.textContent=title);$$('[data-quick-help]').forEach(el=>el.textContent=help);$$('[data-quick-all-off]').forEach(el=>el.textContent=isEnglish()?'Turn all off':'전체 끄기')}

  window.addEventListener('click',event=>{
    const preset=event.target.closest?.('[data-preset],[data-user-preset]');if(preset){activePreset=presetById(preset.dataset.preset||preset.dataset.userPreset);setTimeout(render,180);return}
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
  const mixer=$('#mixerGrid');if(mixer)new MutationObserver(requestRender).observe(mixer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const inspector=$('#inspectorMixerList');if(inspector)new MutationObserver(()=>{if(!inspector.querySelector('[data-quick-source]'))requestRender()}).observe(inspector,{childList:true});
  ensureMainQuickMixer();setTimeout(render,100);setTimeout(render,500);window.LullabyQuickMixer={render,turnAllOff,get activePreset(){return activePreset}};
})();
