(()=>{
  if(window.__lullabyDisplayToolsV1)return;window.__lullabyDisplayToolsV1=true;
  const CHANNEL='lullaby-blackout-v1';
  const isSlave=location.pathname.replace(/\/+$/,'')==='/blackout';
  const $=s=>document.querySelector(s);
  const language=()=>window.LullabyLocales?.language||window.LullabyI18n?.language||'en';
  const copy=()=>language()==='ko'?{screen:'화면 검게',slider:'밀어서 검은 화면 끄기',desktop:'화면 검게'}:{screen:'Black screen',slider:'Slide to exit black screen',desktop:'Black Screen'};
  const channel='BroadcastChannel'in window?new BroadcastChannel(CHANNEL):null;
  let overlay=null,hideTimer=null,active=false,children=[];

  function ensureOverlay(){
    if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='lullabyBlackoutOverlay';overlay.className='blackout-overlay';overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="blackout-exit-shell"><div class="blackout-slider" role="group"><div class="blackout-slider-fill"></div><span class="blackout-slider-label"></span><button class="blackout-slider-knob" type="button" aria-label="Exit black screen">›</button></div></div>';
    document.body.appendChild(overlay);
    bindOverlay();localize();return overlay;
  }
  function localize(){
    const c=copy();const label=overlay?.querySelector('.blackout-slider-label');if(label)label.textContent=c.slider;
    overlay?.querySelector('.blackout-slider-knob')?.setAttribute('aria-label',c.slider);
    document.querySelectorAll('[data-blackout-button]').forEach(btn=>{btn.setAttribute('aria-label',c.screen);btn.title=c.screen});
    document.querySelectorAll('[data-blackout-label]').forEach(el=>el.textContent=c.desktop);
  }
  function showControls(){
    if(!overlay)return;overlay.classList.add('show-controls');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!overlay?.querySelector('.blackout-slider-knob.is-dragging'))overlay.classList.remove('show-controls')},5000);
  }
  function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement||null}
  function requestFullscreenImmediate(){
    if(fullscreenElement())return Promise.resolve(true);
    const root=document.documentElement;
    if(typeof root.requestFullscreen==='function'){
      try{return Promise.resolve(root.requestFullscreen()).then(()=>true).catch(()=>false)}catch{return Promise.resolve(false)}
    }
    if(typeof root.webkitRequestFullscreen==='function'){
      try{root.webkitRequestFullscreen();return Promise.resolve(true)}catch{return Promise.resolve(false)}
    }
    return Promise.resolve(false);
  }
  function bindOverlay(){
    const track=overlay.querySelector('.blackout-slider'),knob=overlay.querySelector('.blackout-slider-knob');let progress=0,dragging=false;
    const setProgress=value=>{progress=Math.max(0,Math.min(1,value));const travel=Math.max(0,track.clientWidth-knob.offsetWidth-10);track.style.setProperty('--blackout-slide',`${travel*progress}px`)};
    const finish=()=>{dragging=false;knob.classList.remove('is-dragging');if(progress>=.84){exitEverywhere()}else setProgress(0)};
    knob.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dragging=true;knob.classList.add('is-dragging');knob.setPointerCapture?.(e.pointerId);showControls()});
    knob.addEventListener('pointermove',e=>{if(!dragging)return;const rect=track.getBoundingClientRect(),travel=Math.max(1,rect.width-knob.offsetWidth-10);setProgress((e.clientX-rect.left-knob.offsetWidth/2-5)/travel)});
    knob.addEventListener('pointerup',e=>{if(!dragging)return;knob.releasePointerCapture?.(e.pointerId);finish()});knob.addEventListener('pointercancel',finish);
    overlay.addEventListener('pointerup',e=>{if(e.target.closest('.blackout-slider'))return;if(!fullscreenElement())requestFullscreenImmediate();showControls()});
    window.addEventListener('resize',()=>setProgress(progress));
  }
  function activateLocal(){ensureOverlay();active=true;document.body.classList.add('blackout-lock');overlay.classList.add('is-active');overlay.classList.remove('show-controls');overlay.setAttribute('aria-hidden','false')}
  async function deactivateLocal(closeSlave=false){
    active=false;clearTimeout(hideTimer);overlay?.classList.remove('is-active','show-controls');overlay?.setAttribute('aria-hidden','true');document.body.classList.remove('blackout-lock');
    if(fullscreenElement()){
      try{if(typeof document.exitFullscreen==='function')await document.exitFullscreen();else if(typeof document.webkitExitFullscreen==='function')document.webkitExitFullscreen()}catch{}
    }
    if(closeSlave)setTimeout(()=>{try{window.close()}catch{}},30);
  }
  function notifyExit(){channel?.postMessage({type:'exit'});if(window.opener&&window.opener!==window){try{window.opener.postMessage({type:'lullaby-blackout-exit'},location.origin)}catch{}}}
  async function exitEverywhere(){
    notifyExit();for(const child of children){try{child.postMessage({type:'lullaby-blackout-exit'},location.origin);child.close()}catch{}}children=[];await deactivateLocal(isSlave);
  }
  function receiveExit(){for(const child of children){try{child.close()}catch{}}children=[];deactivateLocal(isSlave)}
  channel?.addEventListener('message',e=>{if(e.data?.type==='exit')receiveExit();if(e.data?.type==='enter'&&isSlave)activateLocal()});
  window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='lullaby-blackout-exit')receiveExit()});

  function sameScreen(a,b){return a===b||!!(a&&b&&a.left===b.left&&a.top===b.top&&a.width===b.width&&a.height===b.height)}
  function openOtherDisplays(details){
    if(!details?.screens?.length)return;const current=details.currentScreen;
    details.screens.forEach((screen,index)=>{if(sameScreen(screen,current))return;const left=screen.availLeft??screen.left??0,top=screen.availTop??screen.top??0,width=screen.availWidth??screen.width,height=screen.availHeight??screen.height;const features=`popup=yes,left=${left},top=${top},width=${width},height=${height},toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no`;let child=null;try{child=window.open(`/blackout/?display=${index}`,`lullaby_blackout_${index}`,features)}catch{}if(child){children.push(child);setTimeout(()=>{try{child.moveTo(left,top);child.resizeTo(width,height)}catch{}},80)}})
  }
  async function enterBlackout(){
    activateLocal();channel?.postMessage({type:'enter'});
    // Fullscreen must be requested synchronously from the user's click. Waiting for
    // Window Management permission first consumes the browser's user activation.
    const fullscreenAttempt=requestFullscreenImmediate();
    if('getScreenDetails'in window&&window.screen&&'isExtended'in window.screen&&window.screen.isExtended){try{const details=await window.getScreenDetails();openOtherDisplays(details)}catch{}}
    await fullscreenAttempt;
  }
  function bindBlackoutButton(button){
    if(!button||button.dataset.blackoutBound==='1')return;button.dataset.blackoutBound='1';button.addEventListener('click',enterBlackout);
  }
  function injectButtons(){
    if(isSlave||!document.getElementById('webPlayer'))return;

    const rail=$('.desktop-rail');
    if(rail&&!rail.querySelector('[data-blackout-placement="rail"]')){
      const settings=rail.querySelector('[data-view="settings"]'),button=document.createElement('button');
      button.className='rail-item blackout-rail-item';button.type='button';button.dataset.blackoutButton='';button.dataset.blackoutPlacement='rail';
      button.innerHTML='<span class="blackout-rail-glyph" aria-hidden="true">■</span><span data-blackout-label>Black Screen</span>';
      if(settings)settings.after(button);else rail.insertBefore(button,rail.querySelector('.rail-spacer'));
    }

    const inspector=$('.desktop-inspector');
    if(inspector&&!inspector.querySelector('[data-blackout-placement="inspector"]')){
      const sticky=document.createElement('div');sticky.className='blackout-inspector-sticky';
      sticky.innerHTML='<button class="blackout-inspector-button" type="button" data-blackout-button data-blackout-placement="inspector"><span aria-hidden="true">■</span><strong data-blackout-label>Black Screen</strong></button>';
      inspector.prepend(sticky);
    }

    const top=$('.mobile-player-top'),actions=top?.querySelector('.android-top-actions');
    if(top&&actions&&!top.querySelector('[data-blackout-placement="mobile"]')){
      const button=document.createElement('button');button.className='android-top-blackout';button.type='button';button.dataset.blackoutButton='';button.dataset.blackoutPlacement='mobile';
      button.innerHTML='<span aria-hidden="true">■</span>';
      actions.before(button);
    }

    document.querySelectorAll('[data-blackout-button]').forEach(bindBlackoutButton);localize();
  }
  function resolvedLight(){const value=document.documentElement.dataset.theme||'system';return value==='light'||(value==='system'&&matchMedia('(prefers-color-scheme: light)').matches)}
  function syncThemeColor(){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',resolvedLight()?'#e9e4da':'#11131a')}
  new MutationObserver(syncThemeColor).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',syncThemeColor)}catch{}
  document.addEventListener('lullaby-language-changed',localize);

  if(isSlave){document.documentElement.classList.add('blackout-slave');activateLocal();requestFullscreenImmediate();window.addEventListener('beforeunload',()=>notifyExit());return}
  injectButtons();setTimeout(injectButtons,250);setTimeout(injectButtons,900);syncThemeColor();
  window.LullabyBlackout={enter:enterBlackout,exit:exitEverywhere,get active(){return active}};
})();
