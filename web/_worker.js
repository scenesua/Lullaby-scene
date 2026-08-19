const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});

function seoulDay(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const value=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

async function hashVisitor(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

async function parseVisitorPost(request){
  let body;try{body=await request.json()}catch{return{error:json({available:false,error:'Invalid JSON'},400)}}
  const visitorId=String(body?.visitorId||'').trim();
  if(visitorId.length<12||visitorId.length>160)return{error:json({available:false,error:'Invalid visitor id'},400)};
  return{visitorId,countTotal:body?.countTotal===true,countDay:body?.countDay===true};
}

async function visitorsD1(request,env){
  await env.VISITOR_DB.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      visitor_hash TEXT PRIMARY KEY,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_visitors (
      day TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      PRIMARY KEY (day, visitor_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_visitors_day ON daily_visitors(day);
  `);
  if(request.method==='POST'){
    const parsed=await parseVisitorPost(request);if(parsed.error)return parsed.error;
    const hash=await hashVisitor(parsed.visitorId),now=new Date().toISOString(),day=seoulDay();
    await env.VISITOR_DB.batch([
      env.VISITOR_DB.prepare('INSERT INTO visitors(visitor_hash,first_seen,last_seen) VALUES(?,?,?) ON CONFLICT(visitor_hash) DO UPDATE SET last_seen=excluded.last_seen').bind(hash,now,now),
      env.VISITOR_DB.prepare('INSERT OR IGNORE INTO daily_visitors(day,visitor_hash,first_seen) VALUES(?,?,?)').bind(day,hash,now)
    ]);
  }
  const day=seoulDay();
  const [today,total]=await env.VISITOR_DB.batch([
    env.VISITOR_DB.prepare('SELECT COUNT(*) AS count FROM daily_visitors WHERE day=?').bind(day),
    env.VISITOR_DB.prepare('SELECT COUNT(*) AS count FROM visitors')
  ]);
  return json({available:true,backend:'d1',day,today:Number(today.results?.[0]?.count||0),total:Number(total.results?.[0]?.count||0)});
}

const PUBLIC_COUNTER_BASE='https://counterapi.com/api/lullabyscene.com/visitor';
async function publicCounter(name,increment){
  const url=`${PUBLIC_COUNTER_BASE}/${encodeURIComponent(name)}?readOnly=${increment?'false':'true'}&noFormatting=true`;
  const response=await fetch(url,{method:'GET',headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error(`counterapi.com ${response.status}`);
  const data=await response.json(),value=Number(data?.value);
  if(!Number.isFinite(value))throw new Error('counterapi.com returned no numeric value');
  return value;
}

async function visitorsPublic(request){
  let countTotal=false,countDay=false;
  if(request.method==='POST'){
    const parsed=await parseVisitorPost(request);if(parsed.error)return parsed.error;
    countTotal=parsed.countTotal;countDay=parsed.countDay;
  }
  const day=seoulDay();
  try{
    const [today,total]=await Promise.all([
      publicCounter(`day-${day}`,countDay),
      publicCounter('total-v2',countTotal),
    ]);
    return json({available:true,backend:'counterapi.com',day,today,total});
  }catch(error){
    return json({available:false,error:'Visitor counter backend unavailable',detail:String(error?.message||error)},503);
  }
}

async function visitors(request,env){
  if(request.method!=='POST'&&request.method!=='GET')return json({available:false,error:'Method not allowed'},405);
  if(env.VISITOR_DB)return visitorsD1(request,env);
  return visitorsPublic(request);
}

class HeadInjector{element(element){element.append('<link rel="stylesheet" href="/site-runtime-v12.css?v=12"><link rel="stylesheet" href="/mixer-controls-v14.css?v=14">',{html:true})}}
class BodyInjector{element(element){element.append('<script src="/visitor-count-v1.js?v=3"></script><script src="/player-runtime-bridge-v12.js?v=12"></script><script src="/aircraft-source-v15.js?v=15"></script><script src="/mixer-interaction-v14.js?v=14"></script><script src="/simple-scene-quick-mixer-v12.js?v=12"></script><script src="/saved-scenes-v13.js?v=13"></script><script src="/scene-recipe-v1.js?v=1"></script>',{html:true})}}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/visitors')return visitors(request,env);
    const response=await env.ASSETS.fetch(request);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html'))return response;
    return new HTMLRewriter().on('head',new HeadInjector()).on('body',new BodyInjector()).transform(response);
  }
};
