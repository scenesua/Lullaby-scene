(()=>{
  'use strict';
  const host=document.querySelector('[data-scene-content="journey"]');
  if(!host)return;

  const scenes={
    passenger_aircraft_cabin:'aircraft',
    train_journey:'train',
    spacecraft_journey:'spacecraft',
    ferry_journey:'ferry',
    submarine_journey:'submarine',
    hood_journey:'hood',
    forest_temple_journey:'forest-temple'
  };
  const presetScenes=window.LullabyPresetVisuals||{};
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=Boolean(navigator.connection?.saveData);
  // Keep the generated stills crisp until true motion loops replace the rejected pan/zoom drafts.
  const motionVideoEnabled=false;
  const visual=host.querySelector('.journey-visual');
  const layers=[...visual.querySelectorAll('.journey-visual-layer')];
  const exit=document.createElement('div');
  const siren=document.createElement('div');siren.className='hood-siren-light';siren.innerHTML='<i class="hood-siren-red"></i><i class="hood-siren-blue"></i>';visual.appendChild(siren);
  let activeIndex=-1,generation=0,currentId='',currentKey='',currentImage='',currentPreset='preset_rainy_cafe',sceneMode='journey',controlsTimer=null,ambientEnabled=true,userBrightness=1,orientationLocked=false,orientationTimer=null,frame=0,lastFrame=0,envelope=0,energy=0;
  try{ambientEnabled=localStorage.getItem('lullabyJourneyBackground')!=='off';const saved=Number(localStorage.getItem('lullabySceneBrightness'));if(Number.isFinite(saved))userBrightness=Math.max(.35,Math.min(1.45,saved))}catch{}
  document.body.prepend(visual);document.body.classList.add('journey-ambient');
  document.body.classList.toggle('journey-ambient-off',!ambientEnabled);
  exit.className='journey-display-exit';exit.innerHTML='<div class="journey-display-brightness"><label><span></span><output></output></label><input type="range" min="35" max="145" step="1" aria-label="Scene brightness"></div><button type="button"></button>';visual.appendChild(exit);
  const brightnessInput=exit.querySelector('input'),brightnessOutput=exit.querySelector('output');brightnessInput.value=String(Math.round(userBrightness*100));visual.style.setProperty('--scene-user-brightness',userBrightness.toFixed(2));

  function journeyId(){
    return document.querySelector('#journeySelector [data-journey].active')?.dataset.journey||'passenger_aircraft_cabin';
  }
  function asset(id,extension){return `/assets/journeys/${scenes[id]||scenes.passenger_aircraft_cabin}.${extension}`}
  function clearLayer(layer){layer.pause();layer.removeAttribute('src');layer.load()}
  async function showAsset(key,image,id=''){
    if(!image||key===currentKey)return;
    currentKey=key;currentImage=image;if(id)currentId=id;const token=++generation,nextIndex=(activeIndex+1)%layers.length,next=layers[nextIndex],old=layers[activeIndex];
    next.poster=image;next.dataset.journey=id;visual.style.setProperty('--scene-image',`url("${image}")`);
    if(motionVideoEnabled&&(ambientEnabled||document.body.classList.contains('journey-display-mode'))&&!reduceMotion.matches&&!saveData){
      next.src=asset(id,'mp4');next.load();
      try{await next.play()}catch{}
    }
    if(token!==generation){clearLayer(next);return}
    next.classList.add('active');old?.classList.remove('active');activeIndex=nextIndex;
    setTimeout(()=>{if(old&&!old.classList.contains('active'))clearLayer(old)},1400);
  }
  function show(id=journeyId()){if(!scenes[id])return Promise.resolve();return showAsset(`journey:${id}`,asset(id,'webp'),id)}
  function showPreset(id=currentPreset,image=presetScenes[id]){if(!image)return Promise.resolve();currentPreset=id;try{localStorage.setItem('lullabyLastPresetVisual',id)}catch{}return showAsset(`preset:${id}`,image)}
  function refresh(){void show(journeyId())}
  function copy(){const ko=(window.LullabyI18n?.language||document.documentElement.lang||'ko')==='ko';return ko?{open:'장면 화면',exit:'장면 화면 닫기',brightness:'밝기',on:'배경 끄기',off:'배경 켜기'}:{open:'Scene Screen',exit:'Exit Scene Screen',brightness:'Brightness',on:'Background off',off:'Background on'}}
  function localize(){const text=copy();exit.querySelector('button').textContent=text.exit;exit.querySelector('label span').textContent=text.brightness;brightnessInput.setAttribute('aria-label',text.brightness);brightnessOutput.textContent=`${Math.round(userBrightness*100)}%`;document.querySelectorAll('[data-journey-display-label]').forEach(label=>label.textContent=text.open);document.querySelectorAll('[data-journey-display-button]').forEach(button=>{button.title=text.open;button.setAttribute('aria-label',text.open)});const toggle=document.querySelector('[data-journey-background-toggle]');if(toggle){toggle.innerHTML=`${ambientEnabled?'◐':'○'} <span>${ambientEnabled?text.on:text.off}</span>`;toggle.setAttribute('aria-pressed',String(ambientEnabled))}}
  function setDisplayBrightness(value){userBrightness=Math.max(.35,Math.min(1.45,Number(value)/100||1));visual.style.setProperty('--scene-user-brightness',userBrightness.toFixed(2));brightnessOutput.textContent=`${Math.round(userBrightness*100)}%`;try{localStorage.setItem('lullabySceneBrightness',userBrightness.toFixed(2))}catch{}showControls()}
  let brightnessDragging=false;
  function setRotatedBrightness(event){if(!document.body.classList.contains('journey-display-landscape-fallback'))return;event.preventDefault();const rect=brightnessInput.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(event.clientY-rect.top)/Math.max(1,rect.height))),min=Number(brightnessInput.min),max=Number(brightnessInput.max),value=Math.round(min+ratio*(max-min));brightnessInput.value=String(value);setDisplayBrightness(value)}
  async function ensureActiveVideo(){if(!motionVideoEnabled)return;const layer=layers[activeIndex];if(!layer||reduceMotion.matches||saveData)return;if(!layer.getAttribute('src')){layer.src=asset(currentId,'mp4');layer.load()}try{await layer.play()}catch{}}
  function toggleAmbient(){ambientEnabled=!ambientEnabled;try{localStorage.setItem('lullabyJourneyBackground',ambientEnabled?'on':'off')}catch{}document.body.classList.toggle('journey-ambient-off',!ambientEnabled);if(ambientEnabled)void ensureActiveVideo();else layers.forEach(layer=>clearLayer(layer));localize()}
  function showControls(){if(!document.body.classList.contains('journey-display-mode'))return;document.body.classList.add('journey-display-controls');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('journey-display-controls'),4000)}
  function syncDisplayOrientation(){const fallback=document.body.classList.contains('journey-display-mode')&&matchMedia('(max-width:900px)').matches&&innerHeight>innerWidth;document.body.classList.toggle('journey-display-landscape-fallback',fallback)}
  async function enterDisplay(){document.body.classList.add('journey-display-mode');void ensureActiveVideo();showControls();const root=document.documentElement;try{if(!document.fullscreenElement)await(root.requestFullscreen?.({navigationUI:'hide'})||root.webkitRequestFullscreen?.())}catch{}if(matchMedia('(max-width:900px)').matches&&screen.orientation?.lock){try{await screen.orientation.lock('landscape');orientationLocked=true}catch{}}clearTimeout(orientationTimer);orientationTimer=setTimeout(syncDisplayOrientation,350)}
  async function exitDisplay(){clearTimeout(controlsTimer);clearTimeout(orientationTimer);document.body.classList.remove('journey-display-mode','journey-display-controls','journey-display-landscape-fallback');if(!ambientEnabled)layers.forEach(layer=>clearLayer(layer));if(orientationLocked){try{screen.orientation.unlock()}catch{}orientationLocked=false}try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}}
  function makeButton(className,placement){const button=document.createElement('button');button.type='button';button.className=className;button.dataset.journeyDisplayButton='';button.dataset.journeyDisplayPlacement=placement;button.innerHTML='<span aria-hidden="true">◉</span><span data-journey-display-label>Scene Screen</span>';button.addEventListener('click',enterDisplay);return button}
  function viewActions(){const selector=document.getElementById('journeySelector');if(!selector)return null;let actions=document.querySelector('.journey-view-actions');if(!actions){actions=document.createElement('div');actions.className='journey-view-actions';selector.insertAdjacentElement('afterend',actions)}return actions}
  function injectDisplayButtons(){
    const rail=document.querySelector('[data-blackout-placement="rail"]')||document.querySelector('.desktop-rail [data-view="settings"]');if(rail&&!document.querySelector('[data-journey-display-placement="rail"]'))rail.after(makeButton('rail-item journey-display-rail','rail'));
    let inspector=document.querySelector('.blackout-inspector-sticky,.journey-display-sticky');if(!inspector){const host=document.querySelector('.desktop-inspector');if(host){inspector=document.createElement('div');inspector.className='journey-display-sticky';host.prepend(inspector)}}if(inspector&&!document.querySelector('[data-journey-display-placement="inspector"]'))inspector.appendChild(makeButton('journey-display-inspector','inspector'));
    const mobile=document.querySelector('.android-top-actions')||document.querySelector('.mobile-player-top');if(mobile&&!document.querySelector('[data-journey-display-placement="mobile"]')){const button=makeButton('android-icon-button mobile-scene-display-button','mobile');button.innerHTML='<span aria-hidden="true">▣</span>';mobile.prepend(button)}
    localize();
  }
  function injectAmbientToggle(){const actions=viewActions();if(!actions||actions.querySelector('[data-journey-background-toggle]'))return;const button=document.createElement('button');button.type='button';button.className='journey-background-toggle';button.dataset.journeyBackgroundToggle='';button.addEventListener('click',toggleAmbient);actions.appendChild(button);localize()}
  function flashSiren(detail={}){if(journeyId()!=='hood_journey'||!ambientEnabled)return;const distance=Math.max(0,Math.min(1,Number(detail.distance)||0)),duration=Math.max(3000,Number(detail.durationMs)||12000),direction=Number(detail.direction)<0?-1:1;siren.style.setProperty('--hood-siren-strength',(1-distance*.58).toFixed(3));siren.style.setProperty('--hood-siren-blur',`${Math.round(46+distance*72)}px`);siren.style.setProperty('--hood-siren-duration',`${duration}ms`);siren.classList.remove('active');siren.classList.toggle('reverse',direction<0);void siren.offsetWidth;siren.classList.add('active');setTimeout(()=>siren.classList.remove('active'),duration+250)}
  function animate(now){frame=requestAnimationFrame(animate);if(document.hidden||!ambientEnabled)return;if(now-lastFrame<33)return;const dt=Math.min(.12,Math.max(.016,(now-lastFrame)/1000||.033));lastFrame=now;const analyser=window.LullabyAudioReactive?.analyser,context=window.LullabyAudioReactive?.context;let target=0;if(analyser&&context?.state==='running'){const bins=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(bins);let total=0,count=Math.min(28,bins.length);for(let i=1;i<count;i++)total+=bins[i];energy=total/Math.max(1,count-1)/255;target=Math.min(1,Math.max(0,(energy-.008)*7))}else energy=0;const seconds=target>envelope?1.35:3.2;envelope+=(target-envelope)*(1-Math.exp(-dt/seconds));const breath=(Math.sin(now/1900)+1)/2,scale=reduceMotion.matches?.85:1;const light=Math.min(1,.08+envelope*.68+breath*(.44+envelope*.24)*scale);visual.style.setProperty('--scene-light',light.toFixed(3))}
  document.addEventListener('click',event=>{if(event.target.closest('#journeySelector [data-journey]'))setTimeout(refresh)},true);
  document.addEventListener('lullaby-journey-changed',event=>void show(event.detail?.id));
  document.addEventListener('lullaby-preset-applied',event=>void showPreset(event.detail?.id,event.detail?.image));
  document.addEventListener('lullaby-scene-mode-changed',event=>{sceneMode=event.detail?.mode==='simple'?'simple':'journey';if(sceneMode==='simple')void showPreset();else void show(journeyId())});
  document.addEventListener('lullaby-language-changed',localize);
  document.addEventListener('lullaby-hood-siren',event=>flashSiren(event.detail));
  document.addEventListener('pointerdown',event=>{if(document.body.classList.contains('journey-display-mode')&&!event.target.closest('.journey-display-exit'))showControls()});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('journey-display-mode'))exitDisplay()});
  addEventListener('resize',syncDisplayOrientation);
  exit.querySelector('button').addEventListener('click',exitDisplay);
  brightnessInput.addEventListener('input',event=>setDisplayBrightness(event.target.value));brightnessInput.addEventListener('pointerdown',event=>{brightnessDragging=true;brightnessInput.setPointerCapture?.(event.pointerId);setRotatedBrightness(event)});brightnessInput.addEventListener('pointermove',event=>{if(brightnessDragging)setRotatedBrightness(event)});const stopBrightnessDrag=event=>{if(!brightnessDragging)return;brightnessDragging=false;brightnessInput.releasePointerCapture?.(event.pointerId)};brightnessInput.addEventListener('pointerup',stopBrightnessDrag);brightnessInput.addEventListener('pointercancel',stopBrightnessDrag);exit.addEventListener('pointerdown',showControls);
  document.addEventListener('visibilitychange',()=>{const active=layers[activeIndex];if(!active)return;if(document.hidden)active.pause();else if(motionVideoEnabled&&(ambientEnabled||document.body.classList.contains('journey-display-mode'))&&!reduceMotion.matches&&!saveData)void active.play().catch(()=>{})});
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);layers.forEach(layer=>layer.pause())});
  try{const saved=localStorage.getItem('lullabyLastPresetVisual');if(presetScenes[saved])currentPreset=saved}catch{}
  window.LullabyJourneyBackground={show,showPreset,enterDisplay,exitDisplay,toggleAmbient,flashSiren,setDisplayBrightness,get active(){return currentKey},get image(){return currentImage},get audioEnergy(){return energy},get audioEnvelope(){return envelope},get brightness(){return userBrightness},get ambientEnabled(){return ambientEnabled},get displayMode(){return document.body.classList.contains('journey-display-mode')}};
  visual.style.setProperty('--scene-light','.08');frame=requestAnimationFrame(animate);show();injectAmbientToggle();localize();setTimeout(injectDisplayButtons,300);setTimeout(injectDisplayButtons,1000);setTimeout(injectDisplayButtons,1800);
})();
