(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const isEnglish=()=>window.LullabyI18n?.language==='en';
  const runtime=name=>{try{return eval(name)}catch{return undefined}};
  const invoke=(name,...args)=>{const fn=window[name]||runtime(name);if(typeof fn==='function')return fn(...args)};
  let activePreset=null;
  let interactionActive=false;
  let renderPending=false;
  const starting=new Map();

  const catalogList=()=>{const value=runtime('catalog');return Array.isArray(value)?value:[]};
  const sourceMap=()=>runtime('sourceById')||{};
  const runtimeNodes=()=>runtime('nodes')||{};
  const runtimeEvents=()=>runtime('eventState')||{};
  const sourceDef=id=>sourceMap()[id]||catalogList().find(source=>source.id===id)||null;
  const stateFor=id=>{try{const value=invoke('getMixerUiState',id);return value||{on:false,volume:0}}catch{return{on:false,volume:0}}};
  const presetById=id=>{
    try{
      const builtIn=runtime('builtinPresets')||[];
      const users=invoke('loadUserPresets')||[];
      return builtIn.find(item=>item.id===id)||users.find(item=>item.id===id)||null;
    }catch{return null}
  };
  const presetIds=()=>activePreset?Object.keys(activePreset.mix||{}):[];

  function ensureMainQuickMixer(){
    const host=$('[data-scene-content="simple"]');
    if(!host)return null;
    let section=$('#simpleQuickMixerSection');
    if(section)return section.querySelector('#simpleQuickMixerList');
    section=document.createElement('section');
    section.id='simpleQuickMixerSection';
    section.className='simple-quick-mixer-main';
    section.innerHTML=`<div class="quick-mixer-heading"><div><p class="eyebrow" data-quick-title></p><p class="muted-copy" data-quick-help></p></div><button type="button" class="small-action" data-quick-all-off></button></div><div id="simpleQuickMixerList" class="quick-mixer-list"></div>`;
    const transport=$('#simpleSceneTransport');
    if(transport)transport.insertAdjacentElement('afterend',section);else host.querySelector('.simple-scene-header')?.insertAdjacentElement('afterend',section);
    localize();
    return section.querySelector('#simpleQuickMixerList');
  }

  function roots(){
    const main=ensureMainQuickMixer();
    const inspector=$('#inspectorMixerList');
    return [main,inspector].filter(Boolean);
  }

  function orderedSources(){
    const list=catalogList();
    const preferred=presetIds();
    const preferredSet=new Set(preferred);
    const byId=new Map(list.map(item=>[item.id,item]));
    const presetSources=preferred.map(id=>byId.get(id)).filter(Boolean);
    const extras=list.filter(item=>!preferredSet.has(item.id)&&stateFor(item.id).on);
    const inactive=list.filter(item=>!preferredSet.has(item.id)&&!stateFor(item.id).on);
    return [...presetSources,...extras,...inactive];
  }

  function rowMarkup(def){
    const state=stateFor(def.id);
    const on=!!state.on;
    const preferred=presetIds().includes(def.id);
    const volume=on?Math.max(0,Math.min(100,Number(state.volume)||0)):0;
    const status=preferred
      ?(isEnglish()?'Current scene':'현재 씬')
      :on
        ?(isEnglish()?'Added':'추가됨')
        :(isEnglish()?'Available':'추가 가능');
    const action=on?(isEnglish()?'Turn off':'끔'):(isEnglish()?'Add':'추가');
    return `<div class="quick-mixer-row ${on?'is-on':'is-off'} ${preferred?'is-preset-source':''}" data-quick-source="${def.id}">
      <div class="quick-mixer-copy"><strong title="${escapeText(def.name||def.id)}">${escapeText(def.name||def.id)}</strong><span>${status}</span></div>
      <button type="button" data-quick-toggle="${def.id}" aria-pressed="${on}">${action}</button>
      <label class="quick-mixer-volume"><output data-quick-output="${def.id}">${volume}%</output><input data-quick-volume="${def.id}" type="range" min="0" max="100" value="${volume}" aria-label="${escapeText(def.name||def.id)} volume"></label>
    </div>`;
  }

  function escapeText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]))}

  function render(){
    if(interactionActive){renderPending=true;return}
    renderPending=false;
    const list=orderedSources();
    if(!list.length){setTimeout(render,150);return}
    const html=list.map(rowMarkup).join('');
    roots().forEach(root=>{root.innerHTML=html});
    localize();
  }

  function requestRender(){
    if(interactionActive){renderPending=true;return}
    queueMicrotask(render);
  }

  async function ensureEnabled(id,volume){
    const def=sourceDef(id);if(!def)return;
    const value=Math.max(.001,Math.min(1,Number(volume)||0));
    const events=runtimeEvents();
    if(def.kind==='event'){
      if(!events[id]?.enabled)invoke('startEventLayer',def);
      const current=runtimeEvents()[id];
      if(current){current.enabled=true;current.volume=value}
      return;
    }
    if(starting.has(id)){await starting.get(id);const node=runtimeNodes()[id];if(node)node.gain.gain.value=value;return}
    const task=(async()=>{
      await invoke('ensureContext');
      const nodes=runtimeNodes();
      if(!nodes[id])nodes[id]=await invoke('makeSourceNode',def);
      const node=nodes[id];
      if(!node)return;
      node.gain.gain.value=value;
      if(node.el.paused)await node.el.play();
    })().finally(()=>starting.delete(id));
    starting.set(id,task);
    await task;
  }

  function disable(id){
    const def=sourceDef(id);if(!def)return;
    if(def.kind==='event'){
      invoke('stopEventLayer',id);
      const current=runtimeEvents()[id];if(current)current.volume=0;
      return;
    }
    const nodes=runtimeNodes();
    if(nodes[id]){
      nodes[id].el.pause();
      nodes[id].el.currentTime=0;
      nodes[id].gain.gain.value=0;
    }
  }

  function preferredVolume(id){
    const fromPreset=activePreset?.mix?.[id];
    if(Number(fromPreset)>0)return Number(fromPreset);
    const def=sourceDef(id);
    return Math.max(.01,Math.min(1,Number(def?.defaultVolume||30)/100));
  }

  function updateRowDuringInput(id,value){
    $$(`[data-quick-source="${id}"]`).forEach(row=>{
      const on=value>0;
      row.classList.toggle('is-on',on);
      row.classList.toggle('is-off',!on);
      const output=row.querySelector(`[data-quick-output="${id}"]`);if(output)output.textContent=`${Math.round(value*100)}%`;
      const button=row.querySelector(`[data-quick-toggle="${id}"]`);if(button){button.textContent=on?(isEnglish()?'Turn off':'끔'):(isEnglish()?'Add':'추가');button.setAttribute('aria-pressed',String(on))}
      row.querySelectorAll(`[data-quick-volume="${id}"]`).forEach(input=>{if(document.activeElement!==input)input.value=String(Math.round(value*100))});
    });
  }

  async function setQuickVolume(id,percent){
    const value=Math.max(0,Math.min(100,Number(percent)||0))/100;
    updateRowDuringInput(id,value);
    if(value===0)disable(id);else await ensureEnabled(id,value);
    invoke('updateNowPlaying');
  }

  async function toggle(id){
    const on=!!stateFor(id).on;
    if(on)disable(id);else await ensureEnabled(id,preferredVolume(id));
    invoke('renderMixer');invoke('updateNowPlaying');requestRender();
  }

  function turnAllOff(){
    catalogList().forEach(def=>disable(def.id));
    invoke('renderMixer');invoke('updateNowPlaying');requestRender();
  }

  function localize(){
    const title=isEnglish()?'Quick Mixer':'퀵 믹서';
    const help=isEnglish()?'Scene sounds stay at the top. Move a 0% slider to add another sound.':'현재 씬 소리는 위에 고정됩니다. 0% 슬라이더를 움직이면 다른 소리가 추가됩니다.';
    $$('[data-quick-title]').forEach(el=>el.textContent=title);
    $$('[data-quick-help]').forEach(el=>el.textContent=help);
    $$('[data-quick-all-off]').forEach(el=>el.textContent=isEnglish()?'Turn all off':'전체 끄기');
  }

  window.addEventListener('click',event=>{
    const preset=event.target.closest?.('[data-preset],[data-user-preset]');
    if(preset){activePreset=presetById(preset.dataset.preset||preset.dataset.userPreset);setTimeout(render,180);return}
    const toggleButton=event.target.closest?.('[data-quick-toggle]');
    if(toggleButton){event.preventDefault();event.stopImmediatePropagation();toggle(toggleButton.dataset.quickToggle);return}
    if(event.target.closest?.('[data-quick-all-off]')){event.preventDefault();event.stopImmediatePropagation();turnAllOff()}
  },true);

  window.addEventListener('input',event=>{
    const input=event.target.closest?.('[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();interactionActive=true;setQuickVolume(input.dataset.quickVolume,input.value);
  },true);

  window.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-quick-volume]');if(!input)return;
    event.stopImmediatePropagation();interactionActive=false;invoke('renderMixer');if(renderPending)render();else requestRender();
  },true);

  document.addEventListener('lullaby-language-changed',requestRender);
  document.addEventListener('lullaby-scene-mode-changed',event=>{if(event.detail?.mode==='simple')requestRender()});
  const mixer=$('#mixerGrid');if(mixer)new MutationObserver(requestRender).observe(mixer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  ensureMainQuickMixer();setTimeout(render,100);setTimeout(render,500);
  window.LullabyQuickMixer={render,turnAllOff,get activePreset(){return activePreset}};
})();
