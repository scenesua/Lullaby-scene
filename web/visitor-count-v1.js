// Visitor counter v5 uses only the same-origin Worker endpoint from the browser.
// Verified server fallback: https://countapi.mileshilliard.com/api/v1
// Legacy endpoint https://api.counterapi.dev/v1 returned HTTP 410 in CI and is not used.
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
  // v3 marker keys deliberately invalidate the broken v2 0/0 counted state.
  const TOTAL_MARKER='lullaby-visitor-total-counted-v3';
  const DAY_MARKER='lullaby-visitor-day-counted-v3';
  const TOTAL_LAST='lullaby-visitor-total-last-v3';
  const DAY_LAST='lullaby-visitor-day-last-v3';

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
    if(todayNode)todayNode.textContent=Number(today).toLocaleString();
    if(totalNode)totalNode.textContent=Number(total).toLocaleString();
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
      let today=Number(data.today),total=Number(data.total);
      if(!Number.isFinite(today)||today<0||!Number.isFinite(total)||total<0)throw new Error('visitor counter returned invalid counts');

      // A first-time increment that comes back as zero is not success. Never
      // persist the counted markers in that state, otherwise the browser can
      // get stuck at 0/0 forever.
      if(countDay&&today<1)throw new Error('today visitor increment was not confirmed');
      if(countTotal&&total<1)throw new Error('total visitor increment was not confirmed');

      if(data.backend==='countapi.mileshilliard-v1'){
        today=Math.max(today,lastNumber(DAY_LAST));
        total=Math.max(total,lastNumber(TOTAL_LAST));
        storage.set(DAY_LAST,String(today));storage.set(TOTAL_LAST,String(total));
        if(countTotal&&data.countedTotal===true&&total>0)storage.set(TOTAL_MARKER,'1');
        if(countDay&&data.countedDay===true&&today>0)storage.set(DAY_MARKER,day);
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
