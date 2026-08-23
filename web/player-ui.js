(()=>{
  const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
  const lang=()=>window.LullabyI18n?.language||'ko';
  const isKo=()=>lang()==='ko';
  const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text};
  let activeSceneMode='journey';
  let translating=false,translateQueued=false;

  function setSceneMode(mode){
    activeSceneMode=mode==='simple'?'simple':'journey';
    $$('[data-scene-mode]').forEach(b=>b.classList.toggle('active',b.dataset.sceneMode===activeSceneMode));
    $$('[data-scene-content]').forEach(p=>p.classList.toggle('active',p.dataset.sceneContent===activeSceneMode));
    const url=new URL(location.href);url.searchParams.set('scene',activeSceneMode);history.replaceState(null,'',url);
  }
  $$('[data-scene-mode]').forEach(b=>b.addEventListener('click',()=>setSceneMode(b.dataset.sceneMode)));
  const initial=new URL(location.href).searchParams.get('scene');setSceneMode(initial==='simple'?'simple':'journey');
  window.setLullabySceneMode=setSceneMode;

  function translateMeta(raw){
    const categoryMap={nature:['nature','Nature','자연'],indoor:['indoor','Indoor','실내'],travel:['travel','Travel','이동'],other:['other','Other','기타']};
    let category=null;
    for(const [id,variants] of Object.entries(categoryMap)){if(variants.some(v=>raw.includes(v))){category=id;break}}
    const event=/event layer|이벤트 레이어/i.test(raw);
    const type=event?(isKo()?'이벤트 레이어':'event layer'):(isKo()?'연속 재생':'continuous');
    const labels={nature:isKo()?'자연':'Nature',indoor:isKo()?'실내':'Indoor',travel:isKo()?'이동':'Travel',other:isKo()?'기타':'Other'};
    return category?`${labels[category]} · ${type}`:raw;
  }

  function runtimeText(){
    if(translating)return;
    translating=true;
    try{
      const activeView=$('[data-panel].active')?.dataset.panel||'scene';
      const titles={scene:'Scenes',mixer:'Mixer',timer:isKo()?'취침 타이머':'Sleep Timer',settings:'Settings'};
      setText($('#mobileTitle'),titles[activeView]||activeView);
      const direct=$('.duration-direct');
      if(direct){
        setText(direct.querySelector('.duration-direct-copy strong'),isKo()?'직접 입력':'Direct input');
        setText(direct.querySelector('.duration-direct-copy span'),'HH:MM · 04:00–12:00');
        setText(direct.querySelector('.duration-direct-entry button'),isKo()?'적용':'Apply');
      }
      const filterLabels={all:['전체','All'],nature:['자연','Nature'],indoor:['실내','Indoor'],travel:['이동','Travel'],other:['기타','Other']};
      $$('[data-filter]').forEach(b=>{const pair=filterLabels[b.dataset.filter];if(pair)setText(b,pair[isKo()?0:1])});
      $$('.mixer-source').forEach(card=>{
        const btn=card.querySelector('[data-source-toggle]');
        setText(btn,card.classList.contains('on')?(isKo()?'켬':'On'):(isKo()?'끔':'Off'));
        const meta=card.querySelector('div span');if(meta)setText(meta,translateMeta(meta.textContent));
      });
      $$('.preset-card span').forEach(span=>{const m=span.textContent.match(/(\d+)\s*(?:sources|개\s*소스)/i);if(m)setText(span,isKo()?`${m[1]}개 소스`:`${m[1]} sources`)});
      const empty=$('#userPresets .muted-copy');if(empty)setText(empty,isKo()?'저장한 심플 씬이 없습니다.':'No saved Simple Scenes.');
    }finally{translating=false}
  }

  function queueRuntimeText(){
    if(translateQueued)return;translateQueued=true;
    requestAnimationFrame(()=>{translateQueued=false;runtimeText()});
  }
  document.addEventListener('lullaby-language-changed',queueRuntimeText);
  const observer=new MutationObserver(queueRuntimeText);
  ['#mixerFilters','#mixerGrid','#builtInPresets','#userPresets','.duration-control'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class']})});
  queueRuntimeText();

  document.addEventListener('click',async e=>{
    const preset=e.target.closest('[data-preset],[data-user-preset]');
    if(preset&&typeof window.applyPreset==='function'){
      e.preventDefault();e.stopImmediatePropagation();
      const id=preset.dataset.preset||preset.dataset.userPreset;
      await window.applyPreset(id);
      if(typeof window.switchView==='function')window.switchView('scene');
      setSceneMode('simple');
      if(typeof window.setStatus==='function')window.setStatus(isKo()?'심플 씬을 적용했습니다.':'Simple Scene applied.');
      queueRuntimeText();
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
      queueRuntimeText();
    }
  },true);
})();
