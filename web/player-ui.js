(()=>{
  const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
  const lang=()=>window.LullabyI18n?.language||'ko';
  const isKo=()=>lang()==='ko';
  let activeSceneMode='journey';
  function setSceneMode(mode){
    activeSceneMode=mode==='simple'?'simple':'journey';
    $$('[data-scene-mode]').forEach(b=>b.classList.toggle('active',b.dataset.sceneMode===activeSceneMode));
    $$('[data-scene-content]').forEach(p=>p.classList.toggle('active',p.dataset.sceneContent===activeSceneMode));
    const url=new URL(location.href);url.searchParams.set('scene',activeSceneMode);history.replaceState(null,'',url);
  }
  $$('[data-scene-mode]').forEach(b=>b.addEventListener('click',()=>setSceneMode(b.dataset.sceneMode)));
  const initial=new URL(location.href).searchParams.get('scene');setSceneMode(initial==='simple'?'simple':'journey');
  window.setLullabySceneMode=setSceneMode;

  function runtimeText(){
    const activeView=$('[data-panel].active')?.dataset.panel||'scene';
    const titles={scene:isKo()?'Scenes':'Scenes',mixer:'Mixer',timer:isKo()?'취침 타이머':'Sleep Timer',settings:'Settings'};
    if($('#mobileTitle'))$('#mobileTitle').textContent=titles[activeView]||activeView;
    const direct=$('.duration-direct');
    if(direct){
      const strong=direct.querySelector('.duration-direct-copy strong');const hint=direct.querySelector('.duration-direct-copy span');const button=direct.querySelector('.duration-direct-entry button');
      if(strong)strong.textContent=isKo()?'직접 입력':'Direct input';if(hint)hint.textContent='HH:MM · 04:00–12:00';if(button)button.textContent=isKo()?'적용':'Apply';
    }
    $$('[data-filter]').forEach(b=>{const m={all:['전체','All'],nature:['자연','Nature'],indoor:['실내','Indoor'],travel:['이동','Travel'],other:['기타','Other']};const pair=m[b.dataset.filter];if(pair)b.textContent=pair[isKo()?0:1]});
    $$('.mixer-source').forEach(card=>{
      const btn=card.querySelector('[data-source-toggle]');if(btn)btn.textContent=card.classList.contains('on')?(isKo()?'켬':'On'):(isKo()?'끔':'Off');
      const meta=card.querySelector('div span');if(meta){let text=meta.textContent;text=text.replace('nature',isKo()?'자연':'Nature').replace('indoor',isKo()?'실내':'Indoor').replace('travel',isKo()?'이동':'Travel').replace('other',isKo()?'기타':'Other').replace('event layer',isKo()?'이벤트 레이어':'event layer').replace('continuous',isKo()?'연속 재생':'continuous');meta.textContent=text}
    });
    $$('.preset-card span').forEach(span=>{const m=span.textContent.match(/(\d+) sources/);if(m)span.textContent=isKo()?`${m[1]}개 소스`:`${m[1]} sources`});
    const empty=$('#userPresets .muted-copy');if(empty&&/프리셋|preset/i.test(empty.textContent))empty.textContent=isKo()?'저장한 심플 씬이 없습니다.':'No saved Simple Scenes.';
  }
  document.addEventListener('lullaby-language-changed',()=>{runtimeText();setTimeout(runtimeText,0)});
  const observer=new MutationObserver(()=>runtimeText());
  ['#mixerFilters','#mixerGrid','#builtInPresets','#userPresets','.duration-control'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})});
  setTimeout(runtimeText,0);

  document.addEventListener('click',async e=>{
    const preset=e.target.closest('[data-preset],[data-user-preset]');
    if(preset&&typeof window.applyPreset==='function'){
      e.preventDefault();e.stopImmediatePropagation();
      const id=preset.dataset.preset||preset.dataset.userPreset;
      await window.applyPreset(id);
      if(typeof window.switchView==='function')window.switchView('scene');
      setSceneMode('simple');
      if(typeof window.setStatus==='function')window.setStatus(isKo()?'심플 씬을 적용했습니다.':'Simple Scene applied.');
      return;
    }
    const save=e.target.closest('#savePreset');
    if(save&&typeof window.snapshotMix==='function'&&typeof window.loadUserPresets==='function'&&typeof window.saveUserPresets==='function'){
      e.preventDefault();e.stopImmediatePropagation();
      const name=prompt(isKo()?'심플 씬 이름을 입력하세요.':'Name this Simple Scene.');if(!name?.trim())return;
      const list=window.loadUserPresets();
      const master=Number(localStorage.getItem('lullaby-master')||70)/100;
      list.push({id:`user_${Date.now()}`,name:name.trim(),master,mix:window.snapshotMix()});window.saveUserPresets(list);
      if(typeof window.setStatus==='function')window.setStatus(isKo()?'현재 믹스를 심플 씬으로 저장했습니다.':'Current mix saved as a Simple Scene.');
    }
  },true);
})();
