// Visitor counter v4 uses only the same-origin Worker endpoint from the browser.
(()=>{
  const footer=document.querySelector('.site-footer');if(!footer)return;
  let root=footer.querySelector('[data-visitor-stats]');
  if(!root){
    root=document.createElement('div');root.className='visitor-stats';root.dataset.visitorStats='';
    root.innerHTML='<span class="visitor-stat"><span data-visitor-today-label></span><strong data-visitor-today>—</strong></span><span class="visitor-stat"><span data-visitor-total-label></span><strong data-visitor-total>—</strong></span>';
    const copyright=footer.querySelector('.copyright');if(copyright)copyright.insertAdjacentElement('beforebegin',root);else footer.appendChild(root);
  }

  const english=()=>window.LullabyI18n?.language==='en';
  const storage={
    get(key){try{return localStorage.getItem(key)}catch{return null}},
    set(key,value){try{localStorage.setItem(key,value);return true}catch{return false}},
  };
  const TOTAL_MARKER='lullaby-visitor-total-counted-v2';
  const DAY_MARKER='lullaby-visitor-day-counted-v2';
  const TOTAL_LAST='lullaby-visitor-total-last-v2';
  const DAY_LAST='lullaby-visitor-day-last-v2';
  // Removed legacy browser backend: https://api.counterapi.dev/v1

  function localize(){
    const today=root.querySelector('[data-visitor-today-label]'),total=root.querySelector('[data-visitor-total-label]');
    if(today)today.textContent=english()?'Today':'오늘 방문자';
    if(total)total.textContent=english()?'All time':'총 방문자';
  }
  function seoulDay(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }
  function visitorId(){
    const key='lullaby-visitor-id';let value=storage.get(key);
    if(!value){value=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;storage.set(key,value)}
    return value;
  }
  function render(today,total,backend){
    const todayNode=root.querySelector('[data-visitor-today]'),totalNode=root.querySelector('[data-visitor-total]');
    if(todayNode)todayNode.textContent=Number(today||0).toLocaleString();
    if(totalNode)totalNode.textContent=Number(total||0).toLocaleString();
    root.dataset.unavailable='false';root.dataset.backend=backend||'unknown';root.removeAttribute('title');
  }
  function lastNumber(key){const value=Number(storage.get(key));return Number.isFinite(value)&&value>=0?value:0}

  async function load(){
    const day=seoulDay();
    const countTotal=storage.get(TOTAL_MARKER)!=='1';
    const countDay=storage.get(DAY_MARKER)!==day;
    try{
      const response=await fetch('/api/visitors',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({visitorId:visitorId(),countTotal,countDay}),
        cache:'no-store',
      });
      if(!response.ok)throw new Error(`visitor api ${response.status}`);
      const data=await response.json();if(!data.available)throw new Error('visitor counter unavailable');
      let today=Number(data.today||0),total=Number(data.total||0);
      if(data.backend==='counterapi.com'){
        today=Math.max(today,lastNumber(DAY_LAST));
        total=Math.max(total,lastNumber(TOTAL_LAST));
        storage.set(DAY_LAST,String(today));storage.set(TOTAL_LAST,String(total));
        if(countTotal&&data.countedTotal===true)storage.set(TOTAL_MARKER,'1');
        if(countDay&&data.countedDay===true)storage.set(DAY_MARKER,day);
      }
      render(today,total,data.backend);
    }catch(error){
      root.dataset.unavailable='true';
      root.title=english()?'Visitor counter is temporarily unavailable.':'방문자 카운터를 일시적으로 불러올 수 없습니다.';
      console.warn('Visitor counter unavailable',error);
    }
  }

  document.addEventListener('lullaby-language-changed',localize);localize();load();
})();
