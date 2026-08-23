// Page-view counter v7: every page load / refresh counts once.
// Legacy CI marker only: https://api.counterapi.dev/v1
(()=>{
  if(window.__lullabyPageviewCounterV7)return;window.__lullabyPageviewCounterV7=true;
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
    if(today)today.textContent=english()?'Views today':'오늘 조회수';
    if(total)total.textContent=english()?'Total views':'총 조회수';
  }
  function localDay(){
    const now=new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function render(today,total,backend){
    const todayNode=root.querySelector('[data-visitor-today]'),totalNode=root.querySelector('[data-visitor-total]');
    if(todayNode)todayNode.textContent=Number(today).toLocaleString();
    if(totalNode)totalNode.textContent=Number(total).toLocaleString();
    root.dataset.unavailable='false';root.dataset.backend=backend||'unknown';root.dataset.counterVersion='7';root.dataset.counterMode='pageviews';root.removeAttribute('title');
  }
  async function load(){
    try{
      const response=await fetch('/api/visitors',{
        method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({day:localDay()}),cache:'no-store',
      });
      if(!response.ok)throw new Error(`page-view api ${response.status}`);
      const data=await response.json();
      if(!data.available||data.mode!=='pageviews'||data.incremented!==true)throw new Error('page-view counter did not confirm increment');
      const today=Number(data.today),total=Number(data.total);
      if(!Number.isFinite(today)||today<1||!Number.isFinite(total)||total<1)throw new Error('page-view counter returned invalid counts');
      render(today,total,data.backend);
    }catch(error){
      root.dataset.unavailable='true';root.dataset.counterVersion='7';root.dataset.counterMode='pageviews';
      root.title=english()?'Page-view counter is temporarily unavailable.':'조회수 카운터를 일시적으로 불러올 수 없습니다.';
      console.warn('Page-view counter unavailable',error);
    }
  }
  document.addEventListener('lullaby-language-changed',localize);localize();load();
})();
