(()=>{
  const footer=document.querySelector('.site-footer');if(!footer)return;
  let root=footer.querySelector('[data-visitor-stats]');
  if(!root){
    root=document.createElement('div');root.className='visitor-stats';root.dataset.visitorStats='';
    root.innerHTML='<span class="visitor-stat"><span data-visitor-today-label></span><strong data-visitor-today>—</strong></span><span class="visitor-stat"><span data-visitor-total-label></span><strong data-visitor-total>—</strong></span>';
    const copyright=footer.querySelector('.copyright');if(copyright)copyright.insertAdjacentElement('beforebegin',root);else footer.appendChild(root);
  }
  const english=()=>window.LullabyI18n?.language==='en';
  function localize(){
    const today=root.querySelector('[data-visitor-today-label]'),total=root.querySelector('[data-visitor-total-label]');
    if(today)today.textContent=english()?'Today':'오늘 방문자';
    if(total)total.textContent=english()?'All time':'총 방문자';
  }
  function visitorId(){
    const key='lullaby-visitor-id';let value=localStorage.getItem(key);
    if(!value){value=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;localStorage.setItem(key,value)}
    return value;
  }
  async function load(){
    try{
      const response=await fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({visitorId:visitorId()}),cache:'no-store'});
      if(!response.ok)throw new Error(`visitor api ${response.status}`);
      const data=await response.json();if(!data.available)throw new Error('visitor counter unavailable');
      root.querySelector('[data-visitor-today]').textContent=Number(data.today||0).toLocaleString();
      root.querySelector('[data-visitor-total]').textContent=Number(data.total||0).toLocaleString();
      root.dataset.unavailable='false';
    }catch(error){
      root.dataset.unavailable='true';
      root.title=english()?'Visitor counter is not connected yet.':'방문자 카운터가 아직 연결되지 않았습니다.';
      console.warn('Visitor counter unavailable',error);
    }
  }
  document.addEventListener('lullaby-language-changed',localize);localize();load();
})();
