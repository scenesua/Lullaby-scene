(()=>{
  if(window.__lullabyAndroidShellV1||!document.getElementById('webPlayer'))return;window.__lullabyAndroidShellV1=true;
  document.body.classList.add('android-shell-page');
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const L=()=>window.LullabyLocales;
  const t=(key,fallback=key)=>window.LullabyI18n?.t?.(key)||fallback;
  const term=(key,fallback=key)=>L()?.term?.(key)||fallback;
  let activeDest='scenes',lastPrimaryDest='scenes',pausedMixer=[];

  const languageLabel={ko:['언어','사이트와 플레이어 표시 언어'],en:['Language','Site and player display language'],ja:['言語','サイトとプレーヤーの表示言語'],'zh-CN':['语言','网站和播放器显示语言'],'zh-TW':['語言','網站與播放器顯示語言'],ru:['Язык','Язык сайта и плеера'],fr:['Langue','Langue du site et du lecteur'],es:['Idioma','Idioma del sitio y del reproductor'],pt:['Idioma','Idioma do site e do player'],th:['ภาษา','ภาษาที่ใช้แสดงเว็บไซต์และเพลเยอร์'],tl:['Wika','Wika ng site at player'],hi:['भाषा','साइट और प्लेयर की भाषा'],vi:['Ngôn ngữ','Ngôn ngữ hiển thị của trang và trình phát']};
  const fxCopy={ko:['FX','믹서와 준비된 장면의 음색과 공간감을 조절합니다.','기본값으로 초기화'],en:['FX','Shape tone and space for Mixer and ready-made scene audio.','Reset FX'],ja:['FX','ミキサーと用意されたシーンの音色と空間感を調整します。','FXをリセット'],'zh-CN':['FX','调整混音器和预设场景的音色与空间感。','重置FX'],'zh-TW':['FX','調整混音器與預設場景的音色與空間感。','重設FX'],ru:['FX','Настройте тембр и пространство микшера и готовых сцен.','Сбросить FX'],fr:['FX','Réglez le timbre et l’espace du mixeur et des scènes prêtes.','Réinitialiser FX'],es:['FX','Ajusta el tono y el espacio del mezclador y las escenas preparadas.','Restablecer FX'],pt:['FX','Ajuste timbre e espaço do mixer e das cenas prontas.','Redefinir FX'],th:['FX','ปรับโทนและมิติพื้นที่ของมิกเซอร์และฉากพร้อมใช้','รีเซ็ต FX'],tl:['FX','Ayusin ang tono at espasyo ng Mixer at mga nakahandang eksena.','I-reset ang FX'],hi:['FX','मिक्सर और तैयार दृश्यों का टोन और स्थान समायोजित करें।','FX रीसेट करें'],vi:['FX','Điều chỉnh sắc thái và không gian cho bộ trộn và cảnh dựng sẵn.','Đặt lại FX']};
  const copy=map=>map[L()?.language||'en']||map.en;
  const timerLabel=()=>copy({ko:'타이머',en:'Timer',ja:'タイマー','zh-CN':'定时器','zh-TW':'計時器',ru:'Таймер',fr:'Minuteur',es:'Temporizador',pt:'Timer',th:'ตั้งเวลา',tl:'Timer',hi:'टाइमर',vi:'Hẹn giờ'});
  const journeyLabel=()=>({ko:'여정',en:'Journey',ja:'旅','zh-CN':'旅程','zh-TW':'旅程',ru:'Путешествие',fr:'Voyage',es:'Viaje',pt:'Jornada',th:'การเดินทาง',tl:'Paglalakbay',hi:'यात्रा',vi:'Hành trình'}[L()?.language||'en']||'Journey');

  function ensureJourneyIcons(){
    const paths={
      passenger_aircraft_cabin:'M12 3v18m0-14L3 13v2l9-3 9 3v-2L12 7m-4 14 4-3 4 3',
      train_journey:'M6 3h12v14H6zM6 10h12M9 3v7m6-7v7M8 14h1m6 0h1M8 17l-3 4m11-4 3 4M7 20h10',
      spacecraft_journey:'M9 15c-2-5 1-10 10-12 0 9-5 13-10 12Zm0 0-4 4m3-9H4l-2 5h6m6 1v4l-5 2v-6m4-8h2',
      ferry_journey:'M3 13l9-3 9 3-3 6H6l-3-6Zm4-2V6h10v5M10 6V3h4v3M2 21l4-1 4 1 4-1 4 1 4-1',
      submarine_journey:'M6 9h11a5 5 0 0 1 0 10H7a5 5 0 0 1-1-10Zm4 0V5h4V3m6 9h3m-1 0v4M7 13v2m5-2v2m5-2v2',
      forest_temple_journey:'M3 10l9-6 9 6H3Zm2 0v10m14-10v10M2 20h20M9 20v-7h6v7M12 4V2',
      hood_journey:'M3 21V9h7v12m0-16h8v16m0-9h3v9M2 21h20M5 12h2m-2 4h2m6-8h2m-2 4h2m-2 4h2'
    };
    $$('#journeySelector button').forEach(button=>{
      const path=paths[button.dataset.journey];if(!path||button.querySelector('svg'))return;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),shape=document.createElementNS(svg.namespaceURI,'path');
      svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','journey-choice-icon');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');shape.setAttribute('d',path);svg.append(shape);
      [...button.childNodes].filter(node=>node.nodeType===3).forEach(node=>node.remove());button.prepend(svg);
    });
  }

  function ensureTopBar(){
    const root=$('.mobile-player-top');if(!root)return;
    root.innerHTML='<div class="android-top-leading"><button class="android-icon-button android-back" type="button" data-android-back hidden aria-label="Back">‹</button><div class="android-top-title"><strong data-android-title></strong><small>Lullaby Scene</small></div></div><div class="android-top-actions"><button class="android-icon-button mobile-scene-display-button" type="button" data-journey-display-button data-journey-display-placement="mobile" aria-label="Scene screen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 16l3-4 3 2 2-3"/></svg><span data-journey-display-label></span></button><button class="android-icon-button filled" type="button" data-android-play aria-label="Play"><svg viewBox="0 0 24 24" aria-hidden="true"><path data-play-symbol d="m8 5 11 7-11 7Z"/></svg><span data-play-label></span></button><button class="android-icon-button" type="button" data-android-timer aria-label="Sleep timer"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6m-3 0v3"/></svg><span data-timer-label></span></button></div>';
    $('[data-android-back]')?.addEventListener('click',()=>showDestination(lastPrimaryDest||'scenes'));
    $('[data-android-play]')?.addEventListener('click',togglePlayback);
    $('[data-journey-display-placement="mobile"]')?.addEventListener('click',()=>window.LullabyJourneyBackground?.enterDisplay?.());
    $('[data-android-timer]')?.addEventListener('click',()=>showDestination('timer'));
  }
  function ensureBottomNav(){
    const nav=$('.mobile-tabs');if(!nav)return;
    const icons={scenes:'M4 19c0-8 16-2 16-10a5 5 0 0 0-10 0c0 4 5 7 5 7s5-3 5-7M15 8h.01M4 19h.01',mixer:'M5 3v4m0 4v10M3 7h4v4H3zM12 3v10m0 4v4m-2-8h4v4h-4zM19 3v2m0 4v12m-2-16h4v4h-4z',prepared:'M3 4h18v16H3zM3 15l5-5 4 4 3-3 6 6M16 8h.01',fx:'M3 12h3l3-7 6 14 3-7h3',settings:'M4 7h9m4 0h3M4 17h3m4 0h9M13 4h4v6h-4zM7 14h4v6H7z'};
    nav.innerHTML=Object.entries(icons).map(([id,path])=>`<button class="mobile-tab" type="button" data-android-dest="${id}"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${path}"/></svg></span><b></b></button>`).join('');
    nav.addEventListener('click',event=>{const btn=event.target.closest('[data-android-dest]');if(btn)showDestination(btn.dataset.androidDest)});
  }
  function ensureFxPanel(){
    if($('[data-panel="fx"]'))return;
    const settings=$('[data-panel="settings"]'),panel=document.createElement('div');panel.className='view-panel android-fx-panel';panel.dataset.panel='fx';
    panel.innerHTML='<div class="panel-header"><div><h3 class="android-mobile-section-title" data-android-fx-title>FX</h3><p class="android-mobile-section-copy" data-android-fx-copy></p></div></div><div class="android-fx-list"><section class="android-fx-card"><h4 data-fx-section-tone>Tone</h4><p data-fx-section-tone-copy></p><label class="fx-control"><span data-fx-label="warmth">Warmth</span><output data-fx-output="warmth">50%</output><input data-fx="warmth" type="range" min="0" max="100" value="50"></label><label class="fx-control"><span data-fx-label="air">Air</span><output data-fx-output="air">50%</output><input data-fx="air" type="range" min="0" max="100" value="50"></label></section><section class="android-fx-card"><h4 data-fx-section-space>Space</h4><p data-fx-section-space-copy></p><label class="fx-control"><span data-fx-label="room">Space</span><output data-fx-output="room">18%</output><input data-fx="room" type="range" min="0" max="100" value="18"></label></section><section class="android-fx-card"><h4 data-fx-section-dynamics>Dynamics</h4><p data-fx-section-dynamics-copy></p><label class="fx-control"><span data-fx-label="glue">Glue</span><output data-fx-output="glue">22%</output><input data-fx="glue" type="range" min="0" max="100" value="22"></label></section><button class="android-fx-reset" type="button" data-android-fx-reset></button></div>';
    settings?.before(panel);$('[data-android-fx-reset]')?.addEventListener('click',()=>window.LullabyMixerFx?.reset?.());window.LullabyMixerFx?.syncUi?.();
  }
  function ensureLanguageSetting(){
    const list=$('[data-panel="settings"] .settings-list');if(!list||$('.android-language-setting'))return;
    const row=document.createElement('div');row.className='android-language-setting';row.innerHTML='<div><strong data-language-title></strong><span data-language-copy></span></div><select class="language-select" data-mobile-language aria-label="Language"></select>';list.prepend(row);L()?.apply?.();
  }
  function destinationTitle(dest){return dest==='scenes'?journeyLabel():dest==='mixer'?t('mixer','Mixer'):dest==='prepared'?t('simpleScenes','Ready-made Scenes'):dest==='fx'?term('fx','FX'):dest==='settings'?t('settings','Settings'):dest==='timer'?t('timer','Sleep Timer'):journeyLabel()}
  function updateChrome(){
    setText($('[data-android-title]'),destinationTitle(activeDest));const back=$('[data-android-back]');if(back)back.hidden=activeDest!=='timer';
    back?.setAttribute('aria-label',term('back','Back'));$('[data-android-timer]')?.setAttribute('aria-label',t('timer','Sleep timer'));setText($('[data-timer-label]'),timerLabel());setText($('[data-journey-display-label]'),L()?.t?.('sceneScreen')||'Scene Screen');
    $$('[data-android-dest]').forEach(btn=>{const id=btn.dataset.androidDest,labels={scenes:journeyLabel(),mixer:t('mixer','Mixer'),prepared:t('simpleScenes','Ready-made Scenes'),fx:term('fx','FX'),settings:t('settings','Settings')};btn.classList.toggle('active',id===activeDest);btn.setAttribute('aria-current',id===activeDest?'page':'false');setText(btn.querySelector('b'),labels[id])});
    const [langTitle,langCopy]=copy(languageLabel);setText($('[data-language-title]'),langTitle);setText($('[data-language-copy]'),langCopy);$('[data-mobile-language]')?.setAttribute('aria-label',langTitle);
    const [fxTitle,fxDescription,reset]=copy(fxCopy);setText($('[data-android-fx-title]'),fxTitle);setText($('[data-android-fx-copy]'),fxDescription);setText($('[data-android-fx-reset]'),reset);
    const fxSections={ko:['음색','따뜻함과 고역의 공기감을 조절합니다.','공간','잔향과 공간감을 조절합니다.','다이내믹','여러 소리를 자연스럽게 묶습니다.'],en:['Tone','Adjust warmth and high-frequency air.','Space','Adjust room and ambience.','Dynamics','Gently bind multiple sounds together.'],ja:['音色','暖かさと高域の空気感を調整します。','空間','残響と空間感を調整します。','ダイナミクス','複数の音を自然にまとめます。'],'zh-CN':['音色','调整温暖度和高频空气感。','空间','调整空间与残响。','动态','让多个声音更自然地融合。'],'zh-TW':['音色','調整溫暖度與高頻空氣感。','空間','調整空間與殘響。','動態','讓多個聲音更自然地融合。'],ru:['Тон','Настройте теплоту и высокочастотный воздух.','Пространство','Настройте объём и реверберацию.','Динамика','Мягко объедините несколько звуков.'],fr:['Tonalité','Réglez la chaleur et l’air dans les aigus.','Espace','Réglez l’ambiance et la réverbération.','Dynamique','Liez doucement plusieurs sons.'],es:['Tono','Ajusta la calidez y el aire de agudos.','Espacio','Ajusta ambiente y reverberación.','Dinámica','Une suavemente varios sonidos.'],pt:['Timbre','Ajuste calor e ar nos agudos.','Espaço','Ajuste ambiente e reverberação.','Dinâmica','Una suavemente vários sons.'],th:['โทน','ปรับความอุ่นและอากาศย่านสูง','มิติพื้นที่','ปรับบรรยากาศและเสียงก้อง','ไดนามิก','เชื่อมเสียงหลายแหล่งให้กลมกลืน'],tl:['Tono','Ayusin ang init at high-frequency air.','Espasyo','Ayusin ang room at ambience.','Dynamics','Dahan-dahang pagsamahin ang maraming tunog.'],hi:['टोन','गरमाहट और ऊपरी आवृत्ति की हवा समायोजित करें।','स्थान','कमरे और वातावरण को समायोजित करें।','डायनेमिक्स','कई ध्वनियों को सहज रूप से जोड़ें।'],vi:['Âm sắc','Điều chỉnh độ ấm và độ thoáng dải cao.','Không gian','Điều chỉnh phòng và độ vang.','Động học','Gắn kết nhiều âm thanh một cách nhẹ nhàng.']}[L()?.language||'en']||null;
    if(fxSections){setText($('[data-fx-section-tone]'),fxSections[0]);setText($('[data-fx-section-tone-copy]'),fxSections[1]);setText($('[data-fx-section-space]'),fxSections[2]);setText($('[data-fx-section-space-copy]'),fxSections[3]);setText($('[data-fx-section-dynamics]'),fxSections[4]);setText($('[data-fx-section-dynamics-copy]'),fxSections[5])}
    syncPlayButton();
  }
  function setText(el,value){if(el&&value!=null&&el.textContent!==String(value))el.textContent=String(value)}
  function setPanelsDirect(panel){$$('[data-panel]').forEach(p=>p.classList.toggle('active',p.dataset.panel===panel));document.dispatchEvent(new CustomEvent('lullaby-view-changed',{detail:{view:panel}}))}
  function showDestination(dest){
    if(!['scenes','mixer','prepared','fx','settings','timer'].includes(dest))dest='scenes';
    if(dest!=='timer')lastPrimaryDest=dest;activeDest=dest;
    if(dest==='scenes'){window.switchView?.('scene');window.setLullabySceneMode?.('journey')}
    else if(dest==='prepared'){window.switchView?.('scene');window.setLullabySceneMode?.('simple')}
    else if(dest==='mixer')window.switchView?.('mixer');
    else if(dest==='settings')window.switchView?.('settings');
    else if(dest==='timer')window.switchView?.('timer');
    else if(dest==='fx')setPanelsDirect('fx');
    updateChrome();window.scrollTo({top:0,behavior:'auto'});
  }
  function mixerStates(){const R=window.LullabyPlayerRuntime;if(!R)return[];return R.catalog.map(def=>({def,state:R.getMixerUiState(def.id)})).filter(x=>x.state?.on)}
  async function pauseMixer(){const R=window.LullabyPlayerRuntime;if(!R)return;pausedMixer=mixerStates().map(({def,state})=>({id:def.id,volume:Math.max(1,state.volume||def.defaultVolume||30),event:def.kind==='event'}));for(const item of pausedMixer){if(item.event){R.stopEventLayer(item.id);if(R.eventState[item.id])R.eventState[item.id].enabled=false}else{const node=R.nodes[item.id];if(node)node.el.pause()}}R.renderMixer();R.updateNowPlaying();window.LullabyQuickMixer?.render?.()}
  async function resumeMixer(){const R=window.LullabyPlayerRuntime;if(!R||!pausedMixer.length)return;R.stopJourney?.();const restore=[...pausedMixer];pausedMixer=[];await R.ensureContext();for(const item of restore){const def=R.sourceById[item.id];if(!def)continue;if(item.event){R.startEventLayer(def);if(R.eventState[item.id])R.eventState[item.id].volume=item.volume/100}else{if(!R.nodes[item.id])R.nodes[item.id]=await R.makeSourceNode(def);R.nodes[item.id].gain.gain.value=item.volume/100;await R.nodes[item.id].el.play()}}R.renderMixer();R.updateNowPlaying();window.LullabyQuickMixer?.render?.()}
  async function togglePlayback(){
    if(activeDest==='scenes'){document.getElementById('scenePlay')?.click();setTimeout(syncPlayButton,60);return}
    if(activeDest==='prepared'){await window.LullabyControls?.simple?.playPause?.();syncPlayButton();return}
    if(pausedMixer.length)await resumeMixer();else if(mixerStates().length)await pauseMixer();syncPlayButton();
  }
  function syncPlayButton(){const button=$('[data-android-play]');if(!button)return;const transport=document.getElementById(activeDest==='scenes'?'scenePlay':'simpleScenePlayPause');if(activeDest==='scenes'||activeDest==='prepared'){button.disabled=!!transport?.disabled;button.setAttribute('aria-busy',transport?.getAttribute('aria-busy')||'false')}else{button.disabled=false;button.removeAttribute('aria-busy')}const journeyRunning=(document.getElementById('scenePlay')?.textContent||'').includes('Ⅱ');const journeyPlaying=activeDest==='scenes'&&journeyRunning;const mixPlaying=activeDest!=='scenes'&&mixerStates().length>0&&!pausedMixer.length;const playing=activeDest==='prepared'?(transport?.textContent||'').includes('Ⅱ'):journeyPlaying||mixPlaying;const symbol=button.querySelector('[data-play-symbol]'),path=playing?'M8 5v14m8-14v14':'m8 5 11 7-11 7Z';if(symbol?.getAttribute('d')!==path)symbol?.setAttribute('d',path);button.setAttribute('aria-label',activeDest==='prepared'?(transport?.textContent||t('start','Play')).replace(/^[▶Ⅱ]\s*/, ''):playing?term('pause','Pause'):pausedMixer.length?term('resume','Resume'):t('start','Play'));setText(button.querySelector('[data-play-label]'),button.getAttribute('aria-label'));$('#webPlayer').dataset.journeyPlaying=String(journeyRunning);$$('.android-icon-button,.mobile-scene-display-button').forEach(control=>{control.title=control.getAttribute('aria-label')||''})}
  function inferFromEvents(){const activePanel=$('[data-panel].active')?.dataset.panel;if(activePanel==='timer'){activeDest='timer'}else if(activePanel==='mixer'){activeDest='mixer';lastPrimaryDest='mixer'}else if(activePanel==='settings'){activeDest='settings';lastPrimaryDest='settings'}else if(activePanel==='fx'){activeDest='fx';lastPrimaryDest='fx'}else if(activePanel==='scene'){const simple=$('[data-scene-content="simple"]')?.classList.contains('active');activeDest=simple?'prepared':'scenes';lastPrimaryDest=activeDest}updateChrome()}
  ensureTopBar();ensureBottomNav();ensureFxPanel();ensureLanguageSetting();ensureJourneyIcons();
  document.addEventListener('lullaby-language-changed',()=>{L()?.apply?.();updateChrome();window.LullabyCatalogI18n?.apply?.()});document.addEventListener('lullaby-locales-applied',updateChrome);document.addEventListener('lullaby-view-changed',inferFromEvents);document.addEventListener('lullaby-scene-mode-changed',inferFromEvents);
  const media=matchMedia('(max-width:900px)');media.addEventListener?.('change',event=>{if(!event.matches&&activeDest==='fx'){window.switchView?.('scene');window.setLullabySceneMode?.('simple')}});
  setInterval(syncPlayButton,700);showDestination('scenes');setTimeout(()=>{window.LullabyMixerFx?.syncUi?.();updateChrome()},250);
  window.LullabyAndroidWebShell={showDestination,get activeDestination(){return activeDest}};
})();
