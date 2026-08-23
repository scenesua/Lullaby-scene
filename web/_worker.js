// Page-view counter Worker v10. Blackout multiscreen release v4. Audio stability v1. Legacy CI marker only: /visitor-count-v1.js?v=2
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const PUBLIC_COUNTER_BASE='https://countapi.mileshilliard.com/api/v1';
const DAY_RE=/^\d{4}-\d{2}-\d{2}$/;
const MAX_PAGEVIEW_BODY=128;
const SECURITY_HEADERS={
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' https://api.github.com; manifest-src 'self'; worker-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests",
  'X-Frame-Options':'DENY',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), bluetooth=(), browsing-topics=(), accelerometer=(), gyroscope=(), magnetometer=(), window-management=(self)',
  'Cross-Origin-Opener-Policy':'same-origin',
  'Cross-Origin-Resource-Policy':'same-origin',
  'Origin-Agent-Cluster':'?1',
  'X-Permitted-Cross-Domain-Policies':'none',
  'Strict-Transport-Security':'max-age=31536000'
};

function secureResponse(response,request){
  const headers=new Headers(response.headers);
  Object.entries(SECURITY_HEADERS).forEach(([name,value])=>headers.set(name,value));
  if(new URL(request.url).pathname.startsWith('/api/'))headers.set('X-Robots-Tag','noindex, nofollow');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
function utcDay(){
  const now=new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-${String(now.getUTCDate()).padStart(2,'0')}`;
}
function boundedDay(value){
  const day=String(value||'').trim();if(!DAY_RE.test(day))return null;
  const parsed=Date.parse(`${day}T00:00:00Z`),today=Date.parse(`${utcDay()}T00:00:00Z`);
  if(!Number.isFinite(parsed)||Math.abs(parsed-today)>86400000)return null;
  return day;
}
function pageviewMutationAllowed(request){
  if(request.method!=='POST')return true;
  const type=(request.headers.get('content-type')||'').toLowerCase();if(!type.startsWith('application/json'))return false;
  const length=Number(request.headers.get('content-length')||0);if(Number.isFinite(length)&&length>MAX_PAGEVIEW_BODY)return false;
  const ownOrigin=new URL(request.url).origin,origin=request.headers.get('origin');if(origin&&origin!==ownOrigin)return false;
  const fetchSite=(request.headers.get('sec-fetch-site')||'').toLowerCase();if(fetchSite==='cross-site')return false;
  return true;
}
async function requestDay(request){
  if(request.method==='POST'){
    let body;try{body=await request.json()}catch{return null}
    return boundedDay(body?.day);
  }
  const requested=new URL(request.url).searchParams.get('day');return requested?boundedDay(requested):utcDay();
}

async function pageviewsD1(request,env,day){
  const dayKey=`day:${day}`;
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
  return json({available:true,backend:'d1',mode:'pageviews',version:10,day,today:Number(today.results?.[0]?.value||0),total:Number(total.results?.[0]?.value||0),incremented:request.method==='POST'});
}

async function counterFetch(name,increment){
  const action=increment?'hit':'get';
  const response=await fetch(`${PUBLIC_COUNTER_BASE}/${action}/${encodeURIComponent(name)}?ts=${Date.now()}`,{method:'GET',headers:{Accept:'application/json','Cache-Control':'no-cache'}});
  if(!response.ok)throw new Error(`CountAPI ${response.status}`);
  const data=await response.json(),value=Number(data?.value);
  if(!Number.isFinite(value)||value<0)throw new Error('CountAPI returned no numeric value');
  return value;
}
async function pageviewsPublic(request,day){
  const increment=request.method==='POST';
  try{
    const [today,total]=await Promise.all([
      counterFetch(`lullaby-scene-pageviews-day-${day}-v1`,increment),
      counterFetch('lullaby-scene-pageviews-total-v1',increment),
    ]);
    if(increment&&(today<1||total<1))throw new Error('CountAPI page-view increment was not confirmed');
    return json({available:true,backend:'countapi.mileshilliard-v1',mode:'pageviews',version:10,day,today,total,incremented:increment});
  }catch(error){return json({available:false,error:'Page-view counter backend unavailable',detail:String(error?.message||error)},503)}
}
async function pageviews(request,env){
  if(request.method!=='POST'&&request.method!=='GET')return json({available:false,error:'Method not allowed'},405);
  if(!pageviewMutationAllowed(request))return json({available:false,error:'Cross-site or invalid page-view request'},403);
  const day=await requestDay(request);if(!day)return json({available:false,error:'Invalid page-view day'},400);
  if(env.VISITOR_DB)return pageviewsD1(request,env,day);
  return pageviewsPublic(request,day);
}

class HeadInjector{element(element){element.append('<link rel="stylesheet" href="/site-runtime-v12.css?v=12"><link rel="stylesheet" href="/mixer-controls-v14.css?v=14"><link rel="stylesheet" href="/mobile-android-shell-v1.css?v=3"><link rel="stylesheet" href="/display-tools-v1.css?v=3"><link rel="icon" href="/assets/icon-webapp-192.png" type="image/png" sizes="192x192"><link rel="apple-touch-icon" href="/assets/icon-webapp-192.png"><meta name="application-name" content="Lullaby Scene"><meta name="apple-mobile-web-app-title" content="Lullaby Scene">',{html:true})}}
class BodyInjector{element(element){element.append('<script src="/site-locales-v10.js?v=11"></script><script src="/visitor-count-v1.js?v=7"></script><script src="/player-runtime-bridge-v12.js?v=12"></script><script src="/aircraft-source-v15.js?v=15"></script><script src="/mixer-interaction-v14.js?v=14"></script><script src="/simple-scene-quick-mixer-v12.js?v=12"></script><script src="/saved-scenes-v13.js?v=13"></script><script src="/scene-recipe-v1.js?v=1"></script><script src="/i18n-runtime-v3.js?v=4"></script><script src="/mobile-android-shell-v1.js?v=2"></script><script src="/display-tools-v1.js?v=4"></script><script src="/audio-stability-v1.js?v=1"></script>',{html:true})}}
export default{
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/visitors')return secureResponse(await pageviews(request,env),request);
    const asset=await env.ASSETS.fetch(request),type=asset.headers.get('content-type')||'';
    if(!type.includes('text/html'))return secureResponse(asset,request);
    const transformed=new HTMLRewriter().on('head',new HeadInjector()).on('body',new BodyInjector()).transform(asset);
    return secureResponse(transformed,request);
  }
};
