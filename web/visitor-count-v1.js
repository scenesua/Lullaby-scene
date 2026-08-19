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

  async function loadD1(){
    const response=await fetch('/api/visitors',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({visitorId:visitorId()}),cache:'no-store'});
    if(!response.ok)throw new Error(`visitor api ${response.status}`);
    const data=await response.json();if(!data.available)throw new Error('visitor counter unavailable');
    return{today:Number(data.today||0),total:Number(data.total||0),backend:'d1'};
  }

  // Cloudflare Pages can serve this site fully statically. When a VISITOR_DB
  // binding is not configured, use a small public counter service as a
  // no-backend fallback. It keeps the same browser-level semantics as the D1
  // path: total increments once per browser, today once per Seoul calendar day.
  const FALLBACK_BASE='https://api.counterapi.dev/v1';
  const FALLBACK_NAMESPACE='lullaby-scene-site';
  const TOTAL_MARKER='lullaby-counterapi-total-counted-v1';
  const DAY_MARKER='lullaby-counterapi-day-counted-v1';
  function counterValue(data){
    const candidates=[data?.value,data?.data?.value,data?.data,data?.count];
    for(const candidate of candidates){const value=Number(candidate);if(Number.isFinite(value))return value}
    throw new Error('counter response has no numeric value');
  }
  async function counterRequest(name,increment){
    const path=`${FALLBACK_BASE}/${encodeURIComponent(FALLBACK_NAMESPACE)}/${encodeURIComponent(name)}${increment?'/up':''}`;
    const response=await fetch(path,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',mode:'cors'});
    if(!response.ok)throw new Error(`public counter ${response.status}`);
    return counterValue(await response.json());
  }
  async function countedValue(name,markerKey,markerValue){
    if(storage.get(markerKey)===markerValue)return counterRequest(name,false);
    const value=await counterRequest(name,true);storage.set(markerKey,markerValue);return value;
  }
  async function loadStaticFallback(){
    visitorId();
    const day=seoulDay();
    const [today,total]=await Promise.all([
      countedValue(`visitors-${day}`,DAY_MARKER,day),
      countedValue('visitors-total-v1',TOTAL_MARKER,'1'),
    ]);
    return{today,total,backend:'counterapi'};
  }

  async function load(){
    let primaryError=null;
    try{const data=await loadD1();render(data.today,data.total,data.backend);return}catch(error){primaryError=error}
    try{const data=await loadStaticFallback();render(data.today,data.total,data.backend);return}catch(error){
      root.dataset.unavailable='true';
      root.title=english()?'Visitor counter is temporarily unavailable.':'방문자 카운터를 일시적으로 불러올 수 없습니다.';
      console.warn('Visitor counter unavailable',primaryError,error);
    }
  }
  document.addEventListener('lullaby-language-changed',localize);localize();load();
})();
