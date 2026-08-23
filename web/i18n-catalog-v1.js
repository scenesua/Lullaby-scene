(()=>{
  if(window.__lullabyCatalogI18nV1)return;window.__lullabyCatalogI18nV1=true;

  const SOURCE_NAMES={
    ko:{rain:'비',thunder:'천둥',wind:'바람',ocean:'파도',stream:'시냇물',forest:'숲',bamboo_forest:'대나무숲',birds:'새소리',crickets:'귀뚜라미',fire:'벽난로',cafe:'카페',fan:'선풍기',ventilation:'환기 소리',city:'도시',train:'기차',aircraft_cabin:'비행기 객실',water:'물소리',singing_bowl:'싱잉볼',white_noise:'화이트 노이즈',pink_noise:'핑크 노이즈',brown_noise:'브라운 노이즈'},
    en:{rain:'Rain',thunder:'Thunder',wind:'Wind',ocean:'Ocean',stream:'Stream',forest:'Forest',bamboo_forest:'Bamboo Forest',birds:'Birds',crickets:'Crickets',fire:'Fireplace',cafe:'Cafe',fan:'Fan',ventilation:'Ventilation',city:'City',train:'Train',aircraft_cabin:'Aircraft Cabin',water:'Water',singing_bowl:'Singing Bowl',white_noise:'White Noise',pink_noise:'Pink Noise',brown_noise:'Brown Noise'}
  };
  const PRESET_NAMES={
    ko:{preset_rainy_cafe:'비 오는 카페',preset_forest_night:'숲의 밤',preset_beach:'해변',preset_cozy_fireplace:'포근한 벽난로',preset_train_journey:'기차 여행',preset_city_night:'도시의 밤',preset_thunderstorm:'뇌우',preset_forest_morning:'숲의 아침',preset_bamboo_meditation:'대나무숲 명상',preset_deep_focus:'깊은 집중',preset_quiet_night:'고요한 밤',preset_morning_birds:'아침 새소리',preset_ocean_waves:'파도',preset_rainy_night:'비 오는 밤',preset_fan_room:'선풍기 켠 방',preset_cafe_focus:'카페 집중'},
    en:{preset_rainy_cafe:'Rainy Cafe',preset_forest_night:'Forest Night',preset_beach:'Beach',preset_cozy_fireplace:'Cozy Fireplace',preset_train_journey:'Train Journey',preset_city_night:'City Night',preset_thunderstorm:'Thunderstorm',preset_forest_morning:'Forest Morning',preset_bamboo_meditation:'Bamboo Meditation',preset_deep_focus:'Deep Focus',preset_quiet_night:'Quiet Night',preset_morning_birds:'Morning Birds',preset_ocean_waves:'Ocean Waves',preset_rainy_night:'Rainy Night',preset_fan_room:'Fan Room',preset_cafe_focus:'Cafe Focus'}
  };
  const CATEGORY_NAMES={ko:{nature:'자연',indoor:'실내',travel:'이동',other:'기타'},en:{nature:'Nature',indoor:'Indoor',travel:'Travel',other:'Other'}};
  const FILTER_NAMES={ko:{all:'전체',nature:'자연',indoor:'실내',travel:'이동',other:'기타'},en:{all:'All',nature:'Nature',indoor:'Indoor',travel:'Travel',other:'Other'}};
  const KO_COPY={
    simpleEyebrow:'준비된 장면',
    simpleTitle:'고르고 바로 잠드는 준비된 장면.',
    simpleBody:'비 오는 카페, 숲의 밤처럼 여러 환경음을 미리 조합한 장면은 복잡한 시간표 없이 바로 재생할 수 있습니다.',
    simpleScenes:'준비된 장면',
    simpleTitlePlayer:'준비된 장면',
    simpleBodyPlayer:'미리 조합해 둔 환경음 장면입니다. 하나를 고르면 바로 재생됩니다.',
    builtIn:'기본 준비된 장면',
    mine:'내 준비된 장면',
    saveSimple:'현재 믹스를 준비된 장면으로 저장'
  };

  const language=()=>window.LullabyI18n?.language==='en'?'en':'ko';
  const sourceName=(id,fallback=id)=>SOURCE_NAMES[language()]?.[id]||fallback;
  const presetName=(id,fallback=id)=>PRESET_NAMES[language()]?.[id]||fallback;
  const setText=(element,value)=>{if(element&&element.textContent!==value)element.textContent=value};
  let domQueued=false;

  function patchKoreanCopy(){
    if(language()!=='ko')return;
    Object.entries(KO_COPY).forEach(([key,value])=>document.querySelectorAll(`[data-i18n="${key}"]`).forEach(el=>setText(el,value)));
    setText(document.getElementById('saveSceneButton'),'장면 저장');
    document.querySelectorAll('[data-quick-help]').forEach(el=>setText(el,'0%는 꺼짐, 1% 이상은 켜짐입니다. 현재 장면의 소리는 위에 고정됩니다.'));
  }

  function patchRuntimeNames(){
    const R=window.LullabyPlayerRuntime;if(!R)return;
    R.catalog?.forEach(def=>{const value=SOURCE_NAMES[language()]?.[def.id];if(value)def.name=value});
    R.presets?.forEach(preset=>{const value=PRESET_NAMES[language()]?.[preset.id];if(value)preset.name=value});
  }

  function patchDom(){
    domQueued=false;const lang=language(),ko=lang==='ko';patchKoreanCopy();
    document.querySelectorAll('[data-filter]').forEach(button=>{const value=FILTER_NAMES[lang]?.[button.dataset.filter];if(value)setText(button,value)});
    document.querySelectorAll('#mixerGrid [data-source]').forEach(row=>{
      const id=row.dataset.source,name=sourceName(id,id),def=window.LullabyPlayerRuntime?.sourceById?.[id];
      setText(row.querySelector('strong'),name);
      const meta=row.querySelector('span');if(meta&&def){const category=CATEGORY_NAMES[lang]?.[def.category]||def.category;const kind=def.kind==='event'?(ko?'이벤트':'event layer'):(ko?'연속 재생':'continuous');setText(meta,`${category} · ${kind}`)}
      const toggle=row.querySelector('[data-source-toggle]');if(toggle)setText(toggle,row.classList.contains('on')?(ko?'켬':'On'):(ko?'끔':'Off'));
      const volume=row.querySelector('[data-source-volume]');if(volume)volume.setAttribute('aria-label',ko?`${name} 음량`:`${name} volume`);
    });
    document.querySelectorAll('[data-quick-source]').forEach(row=>{
      const id=row.dataset.quickSource,name=sourceName(id,id),strong=row.querySelector('.quick-mixer-copy strong');
      if(strong){setText(strong,name);if(strong.title!==name)strong.title=name}
      const volume=row.querySelector('[data-quick-volume]');if(volume)volume.setAttribute('aria-label',ko?`${name} 음량`:`${name} volume`);
      const status=row.querySelector('.quick-mixer-copy span');if(status){const preferred=row.classList.contains('is-preset-source'),on=row.classList.contains('is-on');setText(status,preferred?(ko?'현재 장면':'Current scene'):on?(ko?'켜짐':'On'):(ko?'꺼짐':'Off'))}
      const toggle=row.querySelector('[data-quick-toggle]');if(toggle)setText(toggle,row.classList.contains('is-on')?(ko?'끔':'Off'):(ko?'켬':'On'));
    });
    document.querySelectorAll('#builtInPresets [data-preset]').forEach(button=>{
      const id=button.dataset.preset,strong=button.querySelector('strong'),span=button.querySelector('span');
      if(strong)setText(strong,presetName(id,strong.textContent||id));
      if(span){const preset=window.LullabyPlayerRuntime?.presets?.find(p=>p.id===id);const n=preset?Object.keys(preset.mix||{}).length:Number((span.textContent||'').match(/\d+/)?.[0]||0);setText(span,ko?`${n}개 소스`:`${n} sources`)}
    });
    const aircraft=ko?'여객기 객실':'Passenger Aircraft Cabin';
    document.querySelectorAll('.aircraft-title-row h3,[data-inspector-mode="journey"] .inspector-section h3').forEach(el=>setText(el,aircraft));
  }

  function queuePatch(){if(domQueued)return;domQueued=true;queueMicrotask(patchDom)}
  function apply({rerender=true}={}){
    patchRuntimeNames();
    const R=window.LullabyPlayerRuntime;
    if(rerender&&R?.catalog?.length){R.renderMixer?.();window.LullabyQuickMixer?.render?.()}
    queuePatch();
  }

  document.addEventListener('lullaby-language-changed',()=>{apply({rerender:true});queueMicrotask(queuePatch)});
  const host=document.getElementById('webPlayer')||document.body;
  new MutationObserver(queuePatch).observe(host,{childList:true,subtree:true});
  apply({rerender:false});setTimeout(()=>apply({rerender:true}),120);setTimeout(()=>apply({rerender:true}),600);
  window.LullabyCatalogI18n={sourceName,presetName,apply};
})();
