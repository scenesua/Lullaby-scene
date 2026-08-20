// Page-view counter Worker v7.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const PUBLIC_COUNTER_BASE='https://countapi.mileshilliard.com/api/v1';
const DAY_RE=/^\d{4}-\d{2}-\d{2}$/;

function utcDay(){
  const now=new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
}

async function requestDay(request){
  if(request.method==='POST'){
    let body={};
    try{body=await request.json()}catch{}
    const day=String(body?.day||'').trim();
    return DAY_RE.test(day)?day:utcDay();
  }
  const day=new URL(request.url).searchParams.get('day')||'';
  return DAY_RE.test(day)?day:utcDay();
}

async function pageviewsD1(request,env){
  const day=await requestDay(request),dayKey=`day:${day}`;
  await env.VISITOR_DB.exec('CREATE TABLE IF NOT EXISTS pageview_counts (counter_key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0);');
  if(request.method==='POST'){
    await env.VISITOR_DB.batch([
      env.VISITOR_DB.prepare("INSERT INTO pageview_counts(counter_key,value) VALUES('total',1) ON CONFLICT(counter_key) DO UPDATE SET value=value+1"),
      env.VISITOR_DB.prepare('INSERT INTO pageview_counts(counter_key,value) VALUES(?,1) ON CONFLICT(counter_key) DO UPDATE SET value=value+1').bind(dayKey),
    ]);
  }
  const [today,total]=await env.VISITOR_DB.batch([
    env.VISITOR_DB.prepare('SELECT value FROM pageview_counts WHERE counter_key=?').bind(dayKey),
    env.VISITOR_DB.prepare("SELECT value FROM pageview_counts WHERE counter_key='total'"),
  ]);
  return json({
    available:true,
    backend:'d1',
    mode:'pageviews',
    version:7,
    day,
    today:Number(today.results?.[0]?.value||0),
    total:Number(total.results?.[0]?.value||0),
    incremented:request.method==='POST',
  });
}

async function counterFetch(name,increment){
  const action=increment?'hit':'get';
  const response=await fetch(`${PUBLIC_COUNTER_BASE}/${action}/${encodeURIComponent(name)}?ts=${Date.now()}`,{
    method:'GET',headers:{Accept:'application/json','Cache-Control':'no-cache'},
  });
  if(!response.ok)throw new Error(`CountAPI ${response.status}`);
  const data=await response.json(),value=Number(data?.value);
  if(!Number.isFinite(value)||value<0)throw new Error('CountAPI returned no numeric value');
  return value;
}

async function pageviewsPublic(request){
  const day=await requestDay(request),increment=request.method==='POST';
  try{
    const [today,total]=await Promise.all([
      counterFetch(`lullaby-scene-pageviews-day-${day}-v1`,increment),
      counterFetch('lullaby-scene-pageviews-total-v1',increment),
    ]);
    if(increment&&(today<1||total<1))throw new Error('CountAPI page-view increment was not confirmed');
    return json({available:true,backend:'countapi.mileshilliard-v1',mode:'pageviews',version:7,day,today,total,incremented:increment});
  }catch(error){
    return json({available:false,error:'Page-view counter backend unavailable',detail:String(error?.message||error)},503);
  }
}

async function pageviews(request,env){
  if(request.method!=='POST'&&request.method!=='GET')return json({available:false,error:'Method not allowed'},405);
  if(env.VISITOR_DB)return pageviewsD1(request,env);
  return pageviewsPublic(request);
}

class HeadInjector{element(element){element.append('<link rel="stylesheet" href="/site-runtime-v12.css?v=12"><link rel="stylesheet" href="/mixer-controls-v14.css?v=14">',{html:true})}}
class BodyInjector{element(element){element.append('<script src="/visitor-count-v1.js?v=7"></script><script src="/player-runtime-bridge-v12.js?v=12"></script><script src="/aircraft-source-v15.js?v=15"></script><script src="/mixer-interaction-v14.js?v=14"></script><script src="/simple-scene-quick-mixer-v12.js?v=12"></script><script src="/saved-scenes-v13.js?v=13"></script><script src="/scene-recipe-v1.js?v=1"></script>',{html:true})}}

export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/visitors')return pageviews(request,env);
    const response=await env.ASSETS.fetch(request);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('head',new HeadInjector()).on('body',new BodyInjector()).transform(response);
  }
};
