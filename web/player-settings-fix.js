(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ko=()=>window.LullabyI18n?.language!=='en';
function applyTheme(value){document.documentElement.dataset.theme=value;localStorage.setItem('lullaby-theme',value);const select=$('#themeSelect');if(select&&select.value!==value)select.value=value}
applyTheme(localStorage.getItem('lullaby-theme')||'system');
$('#themeSelect')?.addEventListener('change',e=>applyTheme(e.target.value));
function relayMaster(value){let target=$('#masterPlugin');let temporary=false;if(!target){target=document.createElement('input');target.type='range';target.id='masterPlugin';target.hidden=true;document.body.appendChild(target);temporary=true}target.value=value;target.dispatchEvent(new Event('input',{bubbles:true}));$$('.master-volume').forEach(x=>{if(x.value!==String(value))x.value=value});if(temporary)queueMicrotask(()=>target.remove())}
$$('.master-volume').forEach(x=>x.addEventListener('input',e=>relayMaster(e.target.value)));
$('#mobileTimerShortcut')?.addEventListener('click',()=>document.querySelector('[data-view="timer"]')?.click());
function localizeDirect(){const title=$('[data-direct-title]')||$('.duration-direct-copy strong');const button=$('#durationDirectApply');if(title)title.textContent=ko()?'직접 입력':'Direct input';if(button)button.textContent=ko()?'적용':'Apply'}
document.addEventListener('lullaby-language-changed',localizeDirect);localizeDirect();
window.addEventListener('pageshow',()=>{const select=$('#themeSelect');if(select)select.value=localStorage.getItem('lullaby-theme')||'system'});
})();
