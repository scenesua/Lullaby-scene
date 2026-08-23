(()=>{
  if(window.__lullabyI18nRuntimeV3)return;window.__lullabyI18nRuntimeV3=true;
  const L=()=>window.LullabyLocales;
  const language=()=>L()?.language||'en';
  const term=(key,fallback=key)=>L()?.term?.(key)||fallback;
  const sourceName=(id,fallback=id)=>L()?.sourceName?.(id,fallback)||fallback;
  const presetName=(id,fallback=id)=>L()?.presetName?.(id,fallback)||fallback;
  const setText=(el,value)=>{if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)};

  const COPY={
    ko:{save:'장면 저장',load:'불러오기',rename:'이름 변경',overwrite:'현재 설정 저장',empty:'저장한 준비된 장면이 없습니다.',quickHelp:'0%는 꺼짐, 1% 이상은 켜짐입니다. 현재 장면의 소리는 위에 고정됩니다.',volume:'음량'},
    en:{save:'Save scene',load:'Load',rename:'Rename',overwrite:'Save current',empty:'No saved ready-made scenes.',quickHelp:'0% is Off. Moving above 0% turns the sound On; current-scene sounds stay at the top.',volume:'volume'},
    ja:{save:'シーンを保存',load:'読み込む',rename:'名前変更',overwrite:'現在設定を保存',empty:'保存した用意されたシーンはありません。',quickHelp:'0%でオフ、1%以上でオンになります。現在のシーンの音源は上部に固定されます。',volume:'音量'},
    'zh-CN':{save:'保存场景',load:'加载',rename:'重命名',overwrite:'保存当前设置',empty:'没有已保存的预设场景。',quickHelp:'0%为关闭，超过0%即开启；当前场景的声音会固定在顶部。',volume:'音量'},
    'zh-TW':{save:'儲存場景',load:'載入',rename:'重新命名',overwrite:'儲存目前設定',empty:'沒有已儲存的預設場景。',quickHelp:'0%為關閉，超過0%即開啟；目前場景的聲音會固定在上方。',volume:'音量'},
    ru:{save:'Сохранить сцену',load:'Загрузить',rename:'Переименовать',overwrite:'Сохранить текущее',empty:'Нет сохранённых готовых сцен.',quickHelp:'0% — выключено. Значение выше 0% включает звук; источники текущей сцены остаются сверху.',volume:'громкость'},
    fr:{save:'Enregistrer la scène',load:'Charger',rename:'Renommer',overwrite:'Enregistrer l’actuel',empty:'Aucune scène prête enregistrée.',quickHelp:'0% coupe le son. Au-dessus de 0%, il est activé ; les sons de la scène actuelle restent en haut.',volume:'volume'},
    es:{save:'Guardar escena',load:'Cargar',rename:'Renombrar',overwrite:'Guardar actual',empty:'No hay escenas preparadas guardadas.',quickHelp:'0% apaga el sonido. Por encima de 0% se enciende; los sonidos de la escena actual quedan arriba.',volume:'volumen'},
    pt:{save:'Salvar cena',load:'Carregar',rename:'Renomear',overwrite:'Salvar atual',empty:'Nenhuma cena pronta salva.',quickHelp:'0% desliga o som. Acima de 0% ele liga; os sons da cena atual ficam no topo.',volume:'volume'},
    th:{save:'บันทึกฉาก',load:'โหลด',rename:'เปลี่ยนชื่อ',overwrite:'บันทึกค่าปัจจุบัน',empty:'ยังไม่มีฉากพร้อมใช้ที่บันทึกไว้',quickHelp:'0% คือปิด มากกว่า 0% คือเปิด และเสียงของฉากปัจจุบันจะอยู่ด้านบน',volume:'ระดับเสียง'},
    tl:{save:'I-save ang eksena',load:'I-load',rename:'Palitan ang pangalan',overwrite:'I-save ang kasalukuyan',empty:'Walang naka-save na nakahandang eksena.',quickHelp:'0% ay Off. Higit sa 0% ay On; mananatili sa itaas ang mga tunog ng kasalukuyang eksena.',volume:'lakas'},
    hi:{save:'दृश्य सहेजें',load:'लोड करें',rename:'नाम बदलें',overwrite:'मौजूदा सहेजें',empty:'कोई सहेजा हुआ तैयार दृश्य नहीं है।',quickHelp:'0% पर बंद। 0% से ऊपर ध्वनि चालू होती है; मौजूदा दृश्य की ध्वनियाँ ऊपर रहती हैं।',volume:'आवाज़'},
    vi:{save:'Lưu cảnh',load:'Tải',rename:'Đổi tên',overwrite:'Lưu hiện tại',empty:'Chưa có cảnh dựng sẵn đã lưu.',quickHelp:'0% là Tắt. Trên 0% sẽ Bật; âm thanh của cảnh hiện tại luôn nằm trên cùng.',volume:'âm lượng'}
  };
  const copy=key=>COPY[language()]?.[key]??COPY.en[key]??key;

  const PHASES={
    ko:{'Taxi out':'지상 이동','Takeoff':'이륙','Climb':'상승','Cruise':'순항','Descent':'하강','Approach':'접근','Touchdown':'착륙','Taxi in':'도착 지상 이동','Arrived':'도착','Ready':'준비'},
    en:{'Taxi out':'Taxi out','Takeoff':'Takeoff','Climb':'Climb','Cruise':'Cruise','Descent':'Descent','Approach':'Approach','Touchdown':'Touchdown','Taxi in':'Taxi in','Arrived':'Arrived','Ready':'Ready'},
    ja:{'Taxi out':'地上走行','Takeoff':'離陸','Climb':'上昇','Cruise':'巡航','Descent':'降下','Approach':'進入','Touchdown':'着陸','Taxi in':'到着後の地上走行','Arrived':'到着','Ready':'準備完了'},
    'zh-CN':{'Taxi out':'滑出','Takeoff':'起飞','Climb':'爬升','Cruise':'巡航','Descent':'下降','Approach':'进近','Touchdown':'着陆','Taxi in':'滑入','Arrived':'已抵达','Ready':'就绪'},
    'zh-TW':{'Taxi out':'滑出','Takeoff':'起飛','Climb':'爬升','Cruise':'巡航','Descent':'下降','Approach':'進場','Touchdown':'著陸','Taxi in':'滑入','Arrived':'已抵達','Ready':'就緒'},
    ru:{'Taxi out':'Руление к взлёту','Takeoff':'Взлёт','Climb':'Набор высоты','Cruise':'Крейсерский полёт','Descent':'Снижение','Approach':'Заход на посадку','Touchdown':'Посадка','Taxi in':'Руление после посадки','Arrived':'Прибытие','Ready':'Готово'},
    fr:{'Taxi out':'Roulage départ','Takeoff':'Décollage','Climb':'Montée','Cruise':'Croisière','Descent':'Descente','Approach':'Approche','Touchdown':'Atterrissage','Taxi in':'Roulage arrivée','Arrived':'Arrivé','Ready':'Prêt'},
    es:{'Taxi out':'Rodaje de salida','Takeoff':'Despegue','Climb':'Ascenso','Cruise':'Crucero','Descent':'Descenso','Approach':'Aproximación','Touchdown':'Aterrizaje','Taxi in':'Rodaje de llegada','Arrived':'Llegada','Ready':'Listo'},
    pt:{'Taxi out':'Táxi de saída','Takeoff':'Decolagem','Climb':'Subida','Cruise':'Cruzeiro','Descent':'Descida','Approach':'Aproximação','Touchdown':'Pouso','Taxi in':'Táxi de chegada','Arrived':'Chegou','Ready':'Pronto'},
    th:{'Taxi out':'แท็กซี่ออก','Takeoff':'ขึ้นบิน','Climb':'ไต่ระดับ','Cruise':'บินระดับ','Descent':'ลดระดับ','Approach':'เข้าใกล้สนามบิน','Touchdown':'แตะพื้น','Taxi in':'แท็กซี่เข้า','Arrived':'ถึงแล้ว','Ready':'พร้อม'},
    tl:{'Taxi out':'Taxi palabas','Takeoff':'Takeoff','Climb':'Pag-akyat','Cruise':'Cruise','Descent':'Pagbaba','Approach':'Approach','Touchdown':'Paglapag','Taxi in':'Taxi papasok','Arrived':'Dumating','Ready':'Handa'},
    hi:{'Taxi out':'टैक्सी आउट','Takeoff':'टेकऑफ़','Climb':'चढ़ाई','Cruise':'क्रूज़','Descent':'अवरोह','Approach':'एप्रोच','Touchdown':'लैंडिंग','Taxi in':'टैक्सी इन','Arrived':'पहुँच गया','Ready':'तैयार'},
    vi:{'Taxi out':'Lăn bánh ra','Takeoff':'Cất cánh','Climb':'Lấy độ cao','Cruise':'Bay hành trình','Descent':'Hạ độ cao','Approach':'Tiếp cận','Touchdown':'Chạm đất','Taxi in':'Lăn bánh vào','Arrived':'Đã đến','Ready':'Sẵn sàng'}
  };

  function localizeRuntimeData(){
    const R=window.LullabyPlayerRuntime;if(!R)return;
    R.catalog?.forEach(def=>{def.name=sourceName(def.id,def.name||def.id)});
    R.presets?.forEach(preset=>{preset.name=presetName(preset.id,preset.name||preset.id)});
  }
  function localizeMixer(){
    const R=window.LullabyPlayerRuntime;
    document.querySelectorAll('[data-filter]').forEach(btn=>setText(btn,term(btn.dataset.filter,btn.textContent)));
    document.querySelectorAll('#mixerGrid [data-source]').forEach(row=>{
      const id=row.dataset.source,def=R?.sourceById?.[id],name=sourceName(id,id),on=row.classList.contains('on');
      setText(row.querySelector('strong'),name);
      const meta=row.querySelector('span');if(meta&&def)setText(meta,`${term(def.category,def.category)} · ${def.kind==='event'?term('event','event'):term('continuous','continuous')}`);
      setText(row.querySelector('[data-source-toggle]'),on?term('on','On'):term('off','Off'));
      row.querySelector('[data-source-volume]')?.setAttribute('aria-label',`${name} ${copy('volume')}`);
    });
  }
  function localizeQuickMixer(){
    document.querySelectorAll('[data-quick-title],[data-quick-mixer-title]').forEach(el=>setText(el,term('quickMixer','Quick Mixer')));
    document.querySelectorAll('[data-quick-help]').forEach(el=>setText(el,copy('quickHelp')));
    document.querySelectorAll('[data-quick-source]').forEach(row=>{
      const id=row.dataset.quickSource,name=sourceName(id,id),on=row.classList.contains('is-on'),preferred=row.classList.contains('is-preset-source');
      setText(row.querySelector('.quick-mixer-copy strong'),name);
      const strong=row.querySelector('.quick-mixer-copy strong');if(strong)strong.title=name;
      setText(row.querySelector('.quick-mixer-copy span'),preferred?term('currentScene','Current scene'):on?term('on','On'):term('off','Off'));
      setText(row.querySelector('[data-quick-toggle]'),on?term('off','Off'):term('on','On'));
      row.querySelector('[data-quick-volume]')?.setAttribute('aria-label',`${name} ${copy('volume')}`);
    });
  }
  function localizePresets(){
    const R=window.LullabyPlayerRuntime;
    document.querySelectorAll('#builtInPresets [data-preset]').forEach(button=>{
      const id=button.dataset.preset,preset=R?.presets?.find(item=>item.id===id),count=preset?Object.keys(preset.mix||{}).length:Number(button.querySelector('span')?.textContent?.match(/\d+/)?.[0]||0);
      setText(button.querySelector('strong'),presetName(id,id));setText(button.querySelector('span'),`${count} ${term('sources','sources')}`);
    });
    const empty=document.querySelector('#userPresets .muted-copy');if(empty)setText(empty,copy('empty'));
    document.querySelectorAll('[data-saved-load]').forEach(el=>setText(el,copy('load')));
    document.querySelectorAll('[data-saved-rename]').forEach(el=>setText(el,copy('rename')));
    document.querySelectorAll('[data-saved-overwrite]').forEach(el=>setText(el,copy('overwrite')));
    setText(document.getElementById('saveSceneButton'),copy('save'));
  }
  function rawPhase(value){
    const text=String(value||'').trim();
    if(PHASES.en[text])return text;
    for(const map of Object.values(PHASES))for(const [raw,label] of Object.entries(map))if(label===text)return raw;
    return text;
  }
  function localizeJourney(){
    const phase=document.getElementById('phaseLabel');if(phase){const raw=rawPhase(phase.textContent);phase.dataset.phaseKey=raw;setText(phase,PHASES[language()]?.[raw]||PHASES.en[raw]||raw)}
    const currentRemaining=window.LullabyRemainingJourneys?.configs?.[window.LullabyRemainingJourneys.active];
    if(!currentRemaining&&!window.LullabyTrainJourney?.active){const aircraft=sourceName('aircraft_cabin','Passenger Aircraft Cabin');document.querySelectorAll('.aircraft-title-row h3,[data-inspector-mode="journey"] .inspector-section h3').forEach(el=>setText(el,aircraft))}
    setText(document.getElementById('journeyPrevPhase'),term('previousPhase','◀ Previous phase'));setText(document.getElementById('journeyNextPhase'),term('nextPhase','Next phase ▶'));document.querySelector('.journey-track')?.setAttribute('aria-label',term('journeyPosition','Journey position'));
    const event=document.getElementById('eventLabel');if(event&&['None','없음','なし','无','無','Нет','Aucun','Ninguno','Nenhum','ไม่มี','Wala','कोई नहीं','Không có'].includes(event.textContent.trim()))setText(event,term('none','None'));
  }

  let queued=false;
  function apply(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;localizeRuntimeData();localizeMixer();localizeQuickMixer();localizePresets();localizeJourney()})}
  function watchDirect(selector){const root=document.querySelector(selector);if(!root)return;new MutationObserver(apply).observe(root,{childList:true})}

  document.addEventListener('lullaby-language-changed',apply);document.addEventListener('lullaby-locales-applied',apply);document.addEventListener('lullaby-view-changed',apply);document.addEventListener('lullaby-scene-mode-changed',apply);
  ['#mixerGrid','#builtInPresets','#userPresets','#simpleQuickMixerList','#inspectorMixerList'].forEach(watchDirect);
  const phaseTimer=setInterval(localizeJourney,1000);window.addEventListener('pagehide',()=>clearInterval(phaseTimer),{once:true});
  apply();setTimeout(apply,120);setTimeout(apply,650);
  window.LullabyCatalogI18n={sourceName,presetName,apply,phaseName:key=>PHASES[language()]?.[key]||PHASES.en[key]||key};
})();
