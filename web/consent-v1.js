(()=>{
  const enabled=document.querySelector('meta[name="lullaby-ads-enabled"]')?.content==='true';
  const key='lullaby-cookie-consent-v1';
  let choice=null;try{choice=localStorage.getItem(key)}catch{}
  function emit(value){choice=value;try{localStorage.setItem(key,value)}catch{}document.dispatchEvent(new CustomEvent('lullaby-consent-changed',{detail:{choice:value}}))}
  function text(ko,en){return document.documentElement.lang==='ko'?ko:en}
  function mount(){
    if(!enabled)return;
    const panel=document.createElement('section');panel.className='consent-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','consentTitle');
    panel.innerHTML='<div><strong id="consentTitle"></strong><p data-consent-copy></p><a href="/privacy/" data-consent-more></a></div><div class="consent-actions"><button class="button ghost" type="button" data-consent-reject></button><button class="button primary" type="button" data-consent-accept></button></div>';
    const localize=()=>{panel.querySelector('#consentTitle').textContent=text('쿠키 및 광고 설정','Cookie and advertising choices');panel.querySelector('[data-consent-copy]').textContent=text('필수 저장 기능은 항상 사용되며, 선택한 경우에만 광고 목적의 저장 기술을 허용합니다.','Essential storage remains available. Advertising storage is allowed only if you choose it.');panel.querySelector('[data-consent-more]').textContent=text('개인정보 처리방침','Privacy Policy');panel.querySelector('[data-consent-reject]').textContent=text('선택 항목 거부','Reject optional');panel.querySelector('[data-consent-accept]').textContent=text('모두 허용','Allow all')};
    panel.querySelector('[data-consent-reject]').addEventListener('click',()=>{emit('rejected');panel.hidden=true});
    panel.querySelector('[data-consent-accept]').addEventListener('click',()=>{emit('accepted');panel.hidden=true});
    document.addEventListener('lullaby-language-changed',localize);localize();document.body.append(panel);panel.hidden=choice==='accepted'||choice==='rejected';
    document.querySelectorAll('[data-consent-settings]').forEach(link=>{link.hidden=false;link.addEventListener('click',event=>{event.preventDefault();panel.hidden=false;panel.querySelector('button').focus()})});
  }
  window.LullabyConsent={get enabled(){return enabled},get choice(){return choice},open(){document.querySelector('.consent-panel')?.removeAttribute('hidden')}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
