(()=>{
'use strict';
const open=document.getElementById('openStillwater');
const layer=document.getElementById('stillwaterOverlay');
const frame=document.getElementById('stillwaterFrame');
const close=document.getElementById('closeStillwater');
if(!open||!layer||!frame||!close)return;
let previousOverflow='',lastFocus=null;
function sendMixerControl(){
 try{frame.contentWindow?.postMessage({source:'lullaby-scene',type:'ambient-control',enabled:true},location.origin)}catch(e){console.warn('Stillwater ambience handshake:',e)}
}
frame.addEventListener('load',sendMixerControl);
function show(event){
 if(event){event.preventDefault();}
 if(!layer.hidden)return;
 lastFocus=document.activeElement;previousOverflow=document.body.style.overflow;
 layer.hidden=false;document.body.style.overflow='hidden';
 frame.src='/stillwater/';
 close.focus({preventScroll:true});
}
function hide(){
 if(layer.hidden)return;
 layer.hidden=true;document.body.style.overflow=previousOverflow;
 frame.src='about:blank';lastFocus?.focus?.({preventScroll:true});
}
open.addEventListener('click',show);
close.addEventListener('click',hide);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!layer.hidden&&document.activeElement!==frame){e.stopPropagation();hide()}},true);
})();