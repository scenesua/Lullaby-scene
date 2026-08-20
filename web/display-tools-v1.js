(()=>{
  if(window.__lullabyDisplayToolsV1)return;window.__lullabyDisplayToolsV1=true;
  const CHANNEL='lullaby-blackout-v1';
  const isSlave=location.pathname.replace(/\/+$/,'')==='/blackout';
  const $=s=>document.querySelector(s);
  const language=()=>window.LullabyLocales?.language||window.LullabyI18n?.language||'en';
  const copy=()=>language()==='ko'?{screen:'화면 검게',slider:'밀어서 검은 화면 끄기',desktop:'Black Screen'}:{screen:'Black screen',slider:'Slide to exit black screen',desktop:'Black Screen'};
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
    const rail=$('[data-blackout-rail-label]');if(rail)rail.textContent=c.desktop;
  }
  function showControls(){
    if(!overlay)return;overlay.classList.add('show-controls');clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!overlay?.querySelector('.blackout-slider-knob.is-dragging'))overlay.classList.remove('show-controls')},5000);
  }
  function bindOverlay(){
    const track=overlay.querySelector('.blackout-slider'),knob=overlay.querySelector('.blackout-slider-knob');let progress=0,dragging=false;
    const setProgress=value=>{progress=Math.max(0,Math.min(1,value));const travel=Math.max(0,track.clientWidth-knob.offsetWidth-10);track.style.setProperty('--blackout-slide',`${travel*progress}px`)};
    const finish=()=>{dragging=false;knob.classList.remove('is-dragging');if(progress>=.84){exitEverywhere()}else setProgress(0)};
    knob.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();dragging=true;knob.classList.add('is-dragging');knob.setPointerCapture?.(e.pointerId);showControls()});
    knob.addEventListener('pointermove',e=>{if(!dragging)return;const rect=track.getBoundingClientRect(),travel=Math.max(1,rect.width-knob.offsetWidth-10);setProgress((e.clientX-rect.left-knob.offsetWidth/2-5)/travel)});
    knob.addEventListener('pointerup',e=>{if(!dragging)return;knob.releasePointerCapture?.(e.pointerId);finish()});knob.addEventListener('pointercancel',finish);
    overlay.addEventListener('pointerup',e=>{if(e.target.closest('.blackout-slider'))return;if(isSlave&&!document.fullscreenElement)tryFullscreen();showControls()});
    window.addEventListener('resize',()=>setProgress(progress));
  }
  async function tryFullscreen(screenTarget=null){
    if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;
    try{await document.documentElement.requestFullscreen(screenTarget?{navigationUI:'hide',screen:screenTarget}:{navigationUI:'hide'})}
    catch{try{await document.documentElement.requestFullscreen()}catch{}}
  }
  function activateLocal(){ensureOverlay();active=true;document.body.classList.add('blackout-lock');overlay.classList.add('is-active');overlay.classList.remove('show-controls');overlay.setAttribute('aria-hidden','false')}
  async function deactivateLocal(closeSlave=false){
    active=false;clearTimeout(hideTimer);overlay?.classList.remove('is-active','show-controls');overlay?.setAttribute('aria-hidden','true');document.body.classList.remove('blackout-lock');
    if(document.fullscreenElement){try{await document.exitFullscreen()}catch{}}
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
    details.screens.forEach((screen,index)=>{if(sameScreen(screen,current))return;const left=screen.availLeft??screen.left??0,top=screen.availTop??screen.top??0,width=screen.availWidth??screen.width,height=screen.availHeight??screen.height;const features=`popup=yes,left=${left},top=${top},width=${width},height=${height},toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no`;let child=null;try{child=window.open(`/blackout/?display=${index}` ,`lullaby_blackout_${index}`,features)}catch{}if(child){children.push(child);setTimeout(()=>{try{child.moveTo(left,top);child.resizeTo(width,height)}catch{}},80)}})
  }
  async function enterBlackout(){
    activateLocal();channel?.postMessage({type:'enter'});
    let details=null;
    if('getScreenDetails'in window&&window.screen&&'isExtended'in window.screen&&window.screen.isExtended){try{details=await window.getScreenDetails();openOtherDisplays(details)}catch{}}
    await tryFullscreen(details?.currentScreen||null);
  }
  function injectButtons(){
    if(isSlave||!document.getElementById('webPlayer'))return;
    const actions=$('.android-top-actions');if(actions&&!actions.querySelector('[data-blackout-button]')){const timer=actions.querySelector('[data-android-timer]');const button=document.createElement('button');button.className='android-icon-button';button.type='button';button.dataset.blackoutButton='';button.innerHTML='<span aria-hidden="true">■</span>';button.addEventListener('click',enterBlackout);timer?.after(button)||actions.appendChild(button)}
    const rail=$('.desktop-rail');if(rail&&!rail.querySelector('[data-blackout-button]')){const timer=rail.querySelector('[data-view="timer"]');const button=document.createElement('button');button.className='rail-item blackout-rail-item';button.type='button';button.dataset.blackoutButton='';button.innerHTML='<span class="blackout-rail-glyph" aria-hidden="true">■</span><span data-blackout-rail-label>Black Screen</span>';button.addEventListener('click',enterBlackout);timer?.after(button)||rail.appendChild(button)}
    localize();
  }
  function resolvedLight(){const value=document.documentElement.dataset.theme||'system';return value==='light'||(value==='system'&&matchMedia('(prefers-color-scheme: light)').matches)}
  function syncThemeColor(){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',resolvedLight()?'#e9e4da':'#11131a')}
  new MutationObserver(syncThemeColor).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',syncThemeColor)}catch{}
  document.addEventListener('lullaby-language-changed',localize);

  if(isSlave){document.documentElement.classList.add('blackout-slave');activateLocal();tryFullscreen();window.addEventListener('beforeunload',()=>notifyExit());return}
  injectButtons();setTimeout(injectButtons,250);setTimeout(injectButtons,900);syncThemeColor();
  window.LullabyBlackout={enter:enterBlackout,exit:exitEverywhere,get active(){return active}};
})();
