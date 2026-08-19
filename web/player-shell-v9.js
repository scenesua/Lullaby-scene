(()=>{
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const ko=()=>window.LullabyI18n?.language!=='en';
  let activeView='scene',activeSceneMode='journey';

  function switchPanel(view){
    if(!['scene','mixer','timer','settings'].includes(view))view='scene';
    activeView=view;
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    $$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===view));
    const title=$('#mobileTitle');if(title)title.textContent=view==='timer'?(ko()?'취침 타이머':'Sleep Timer'):view.charAt(0).toUpperCase()+view.slice(1);
    document.dispatchEvent(new CustomEvent('lullaby-view-changed',{detail:{view}}));
  }
  function setSceneMode(mode){
    activeSceneMode=mode==='simple'?'simple':'journey';
    $$('[data-scene-mode]').forEach(b=>b.classList.toggle('active',b.dataset.sceneMode===activeSceneMode));
    $$('[data-scene-content]').forEach(p=>p.classList.toggle('active',p.dataset.sceneContent===activeSceneMode));
    $$('[data-inspector-mode]').forEach(p=>p.classList.toggle('active',p.dataset.inspectorMode===activeSceneMode));
    const url=new URL(location.href);url.searchParams.set('scene',activeSceneMode);history.replaceState(null,'',url);
    refreshInspectorMixer();
    document.dispatchEvent(new CustomEvent('lullaby-scene-mode-changed',{detail:{mode:activeSceneMode}}));
  }
  window.switchView=switchPanel;window.setLullabySceneMode=setSceneMode;

  function ensureDirectDuration(){
    const control=$('.duration-control');if(!control)return;
    let row=$('#durationDirectRow');
    if(!row){
      row=document.createElement('div');row.id='durationDirectRow';row.className='duration-direct';
      row.innerHTML='<div class="duration-direct-copy"><strong data-direct-title>직접 입력</strong><span>HH:MM · 04:00–12:00</span></div><div class="duration-direct-entry"><input id="durationDirect" type="text" inputmode="numeric" autocomplete="off" maxlength="5" value="08:00" aria-label="HH:MM"><button id="durationDirectApply" type="button">적용</button></div><p id="durationDirectError" class="duration-direct-error" role="alert" hidden></p>';
      control.appendChild(row);
    }
    const input=$('#durationDirect'),apply=$('#durationDirectApply'),error=$('#durationDirectError'),slider=$('#durationSlider');
    if(!input||input.dataset.bound)return;input.dataset.bound='1';
    const format=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(Math.round(minutes)%60).padStart(2,'0')}`;
    const parse=value=>{const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(value).trim());if(!m)return null;const n=+m[1]*60 + +m[2];return n>=240&&n<=720?n:null};
    const doApply=()=>{const minutes=parse(input.value);if(minutes===null){error.textContent=ko()?'04:00~12:00 사이의 HH:MM 형식으로 입력해 주세요.':'Enter HH:MM between 04:00 and 12:00.';error.hidden=false;input.setAttribute('aria-invalid','true');return}error.hidden=true;input.removeAttribute('aria-invalid');if(typeof window.setDuration==='function')window.setDuration(minutes);else if(typeof setDuration==='function')setDuration(minutes);input.value=format(minutes)};
    input.addEventListener('input',()=>{const d=input.value.replace(/\D/g,'').slice(0,4);input.value=d.length>=3?`${d.slice(0,-2)}:${d.slice(-2)}`:d;error.hidden=true;input.removeAttribute('aria-invalid')});
    input.addEventListener('keydown',e=>{if(e.key==='Enter')doApply()});apply.addEventListener('click',doApply);
    slider?.addEventListener('input',()=>input.value=format(+slider.value));
    $$('[data-duration]').forEach(b=>b.addEventListener('click',()=>setTimeout(()=>{if(slider)input.value=format(+slider.value)},0)));
  }

  function refreshInspectorMixer(){
    const root=$('#inspectorMixerList');if(!root)return;
    const cards=$$('#mixerGrid .mixer-source');
    if(!cards.length){root.innerHTML=`<p class="inspector-mixer-empty">${ko()?'Mixer를 불러오는 중…':'Loading mixer…'}</p>`;return}
    root.innerHTML=cards.map(card=>{
      const id=card.dataset.source,name=card.querySelector('strong')?.textContent||id,range=card.querySelector('[data-source-volume]'),on=card.classList.contains('on');
      return `<div class="inspector-mixer-row ${on?'on':''}" data-inspector-source="${id}"><strong title="${name}">${name}</strong><button type="button" data-inspector-toggle="${id}">${on?(ko()?'켬':'On'):(ko()?'끔':'Off')}</button><input type="range" min="0" max="100" value="${range?.value||30}" data-inspector-volume="${id}" aria-label="${name}"></div>`;
    }).join('');
  }

  function localizeRuntimeMixer(){
    const filters={all:['전체','All'],nature:['자연','Nature'],indoor:['실내','Indoor'],travel:['이동','Travel'],other:['기타','Other']};
    $$('[data-filter]').forEach(b=>{const p=filters[b.dataset.filter];if(p)b.textContent=p[ko()?0:1]});
    $$('#mixerGrid .mixer-source').forEach(card=>{
      const on=card.classList.contains('on'),button=card.querySelector('[data-source-toggle]'),meta=card.querySelector('div span');
      if(button)button.textContent=on?(ko()?'켬':'On'):(ko()?'끔':'Off');
      if(meta){const raw=meta.textContent.toLowerCase();const cat=raw.includes('nature')||raw.includes('자연')?(ko()?'자연':'Nature'):raw.includes('indoor')||raw.includes('실내')?(ko()?'실내':'Indoor'):raw.includes('travel')||raw.includes('이동')?(ko()?'이동':'Travel'):raw.includes('other')||raw.includes('기타')?(ko()?'기타':'Other'):meta.textContent.split('·')[0].trim();const kind=raw.includes('event')||raw.includes('이벤트')?(ko()?'이벤트 레이어':'event layer'):(ko()?'연속 재생':'continuous');meta.textContent=`${cat} · ${kind}`}
    });
    $$('.preset-card span').forEach(span=>{const m=span.textContent.match(/(\d+)\s*(sources|개 소스)/i);if(m)span.textContent=ko()?`${m[1]}개 소스`:`${m[1]} sources`});
    const empty=$('#userPresets .muted-copy');if(empty)empty.textContent=ko()?'저장한 심플 씬이 없습니다.':'No saved Simple Scenes.';
  }

  function localizeShell(){
    const directTitle=$('[data-direct-title]'),directApply=$('#durationDirectApply');if(directTitle)directTitle.textContent=ko()?'직접 입력':'Direct input';if(directApply)directApply.textContent=ko()?'적용':'Apply';
    const fxLabels={warmth:['따뜻함','Warmth'],air:['공기감','Air'],room:['공간감','Room'],glue:['글루 컴프','Glue']};
    Object.entries(fxLabels).forEach(([key,pair])=>{document.querySelectorAll(`[data-fx-label="${key}"]`).forEach(el=>el.textContent=pair[ko()?0:1])});
    const quick=$('[data-quick-mixer-title]');if(quick)quick.textContent=ko()?'퀵 믹서':'Quick Mixer';
    const fxTitle=$('[data-scene-fx-title]');if(fxTitle)fxTitle.textContent=ko()?'씬 FX':'Scene FX';
    const fxHelp=$('[data-scene-fx-help]');if(fxHelp)fxHelp.textContent=ko()?'심플 씬과 Mixer에만 적용되는 Web Audio 내부 플러그인입니다. 잠의 여정 오디오는 이 체인을 우회합니다.':'These Web Audio effects apply only to Simple Scenes and Mixer audio. Sleep Journey audio bypasses this chain.';
    localizeRuntimeMixer();refreshInspectorMixer();
  }

  async function applySimpleScene(id){
    if(typeof window.applyPreset!=='function'&&typeof applyPreset!=='function')return;
    const fn=window.applyPreset||applyPreset;await fn(id);
    let preset=null;try{if(typeof builtinPresets!=='undefined')preset=builtinPresets.find(p=>p.id===id)||null;if(!preset&&typeof window.loadUserPresets==='function')preset=window.loadUserPresets().find(p=>p.id===id)||null;else if(!preset&&typeof loadUserPresets==='function')preset=loadUserPresets().find(p=>p.id===id)||null}catch{}
    if(window.LullabyMixerFx){if(preset?.fx)window.LullabyMixerFx.apply(preset.fx);else window.LullabyMixerFx.reset()}
    switchPanel('scene');setSceneMode('simple');setTimeout(()=>{localizeRuntimeMixer();refreshInspectorMixer()},0);
    if(typeof window.setStatus==='function')window.setStatus(ko()?'심플 씬을 적용했습니다.':'Simple Scene applied.');
  }

  function saveSimpleScene(){
    const snap=typeof window.snapshotMix==='function'?window.snapshotMix():typeof snapshotMix==='function'?snapshotMix():null;
    const load=typeof window.loadUserPresets==='function'?window.loadUserPresets:typeof loadUserPresets==='function'?loadUserPresets:null;
    const save=typeof window.saveUserPresets==='function'?window.saveUserPresets:typeof saveUserPresets==='function'?saveUserPresets:null;
    if(!snap||!load||!save)return;
    const name=prompt(ko()?'심플 씬 이름을 입력하세요.':'Name this Simple Scene.');if(!name?.trim())return;
    const list=load();list.push({id:`user_${Date.now()}`,name:name.trim(),master:Number(localStorage.getItem('lullaby-master')||70)/100,mix:snap,fx:window.LullabyMixerFx?.snapshot?.()||null});save(list);setTimeout(()=>{localizeRuntimeMixer();refreshInspectorMixer()},0);
    if(typeof window.setStatus==='function')window.setStatus(ko()?'현재 믹스와 FX를 심플 씬으로 저장했습니다.':'Current mix and FX saved as a Simple Scene.');
  }

  document.addEventListener('click',async e=>{
    const view=e.target.closest?.('[data-view]');if(view){e.preventDefault();switchPanel(view.dataset.view);return}
    const mode=e.target.closest?.('[data-scene-mode]');if(mode){e.preventDefault();setSceneMode(mode.dataset.sceneMode);return}
    const toggle=e.target.closest?.('[data-inspector-toggle]');if(toggle){e.preventDefault();const fn=typeof window.toggleMixer==='function'?window.toggleMixer:typeof toggleMixer==='function'?toggleMixer:null;if(fn){await fn(toggle.dataset.inspectorToggle);setTimeout(()=>{localizeRuntimeMixer();refreshInspectorMixer()},0)}return}
    const preset=e.target.closest?.('[data-preset],[data-user-preset]');if(preset){e.preventDefault();e.stopImmediatePropagation();await applySimpleScene(preset.dataset.preset||preset.dataset.userPreset);return}
    if(e.target.closest?.('#savePreset')){e.preventDefault();e.stopImmediatePropagation();saveSimpleScene()}
  },true);

  document.addEventListener('input',e=>{
    const inspector=e.target.closest?.('[data-inspector-volume]');if(inspector){const id=inspector.dataset.inspectorVolume,value=+inspector.value/100;const fn=typeof window.setSourceVolume==='function'?window.setSourceVolume:typeof setSourceVolume==='function'?setSourceVolume:null;if(fn)fn(id,value);const main=document.querySelector(`[data-source-volume="${id}"]`);if(main)main.value=inspector.value;return}
    const main=e.target.closest?.('[data-source-volume]');if(main){const mirror=document.querySelector(`[data-inspector-volume="${main.dataset.sourceVolume}"]`);if(mirror)mirror.value=main.value}
  });

  const mixer=$('#mixerGrid');if(mixer)new MutationObserver(()=>{localizeRuntimeMixer();if(activeSceneMode==='simple')refreshInspectorMixer()}).observe(mixer,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const presets=$('#builtInPresets');if(presets)new MutationObserver(()=>localizeRuntimeMixer()).observe(presets,{childList:true,subtree:true});
  const users=$('#userPresets');if(users)new MutationObserver(()=>localizeRuntimeMixer()).observe(users,{childList:true,subtree:true});
  document.addEventListener('lullaby-language-changed',localizeShell);
  ensureDirectDuration();
  const initial=new URL(location.href).searchParams.get('scene');setSceneMode(initial==='simple'?'simple':'journey');switchPanel('scene');localizeShell();setTimeout(()=>{ensureDirectDuration();localizeShell();window.LullabyMixerFx?.syncUi?.()},250);
})();
