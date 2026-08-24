(()=>{
  const R=window.LullabyPlayerRuntime;
  if(!R||!document.getElementById('webPlayer'))return;
  const SCHEMA='lullaby.scene.recipe';
  const VERSION=1;
  const ko=()=>(window.LullabyI18n?.language||document.documentElement.lang)==='ko';
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  const source=id=>R.sourceById[id]||R.catalog.find(item=>item.id===id)||null;
  const text={
    ko:{share:'씬 링크 복사',copied:'씬 공유 링크를 복사했습니다.',invalid:'씬 공유 링크를 읽지 못했습니다.',loaded:'공유 씬을 불러왔습니다.'},
    en:{share:'Copy scene link',copied:'Copied the scene share link.',invalid:'Could not read this scene link.',loaded:'Loaded the shared scene.'}
  };
  const words=()=>ko()?text.ko:text.en;

  function encodeUtf8(value){
    const bytes=new TextEncoder().encode(value);let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function decodeUtf8(value){
    const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
    const padded=normalized+'='.repeat((4-normalized.length%4)%4);
    const binary=atob(padded),bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function cleanMix(input){
    const out={};
    if(!input||typeof input!=='object')return out;
    Object.entries(input).forEach(([id,raw])=>{if(source(id)){const value=clamp(raw);if(value>0)out[id]=Math.round(value*1000)/1000}});
    return out;
  }
  function cleanFx(input){
    if(!input||typeof input!=='object')return null;
    const out={};
    ['warmth','air','room','body','glue','loudness'].forEach(key=>{if(Number.isFinite(Number(input[key])))out[key]=Math.max(0,Math.min(100,Math.round(Number(input[key]))))});
    return Object.keys(out).length?out:null;
  }
  function snapshot(name){
    const fx=window.LullabyMixerFx?.snapshot?.()||null;
    return {
      schema:SCHEMA,
      version:VERSION,
      name:String(name||'Shared Scene').trim().slice(0,80)||'Shared Scene',
      master:Math.round(clamp(R.masterValue)*1000)/1000,
      mix:cleanMix(R.snapshotMix()),
      fx:cleanFx(fx),
      seed:null
    };
  }
  function encode(recipe){return encodeUtf8(JSON.stringify(recipe))}
  function decode(encoded){
    const parsed=JSON.parse(decodeUtf8(encoded));
    if(parsed?.schema!==SCHEMA||Number(parsed.version)!==VERSION)throw new Error('unsupported recipe');
    return {schema:SCHEMA,version:VERSION,name:String(parsed.name||'Shared Scene').slice(0,80),master:clamp(parsed.master??.7),mix:cleanMix(parsed.mix),fx:cleanFx(parsed.fx),seed:parsed.seed??null};
  }

  function disable(id){
    const def=source(id);if(!def)return;
    if(def.kind==='event'){R.stopEventLayer(id);if(R.eventState[id])R.eventState[id].volume=0;return}
    const node=R.nodes[id];if(node){node.el.pause();node.el.currentTime=0;node.gain.gain.value=0}
  }
  async function enable(id,volume){
    const def=source(id);if(!def)return;const value=Math.max(.001,clamp(volume));
    if(def.kind==='event'){
      if(!R.eventState[id]?.enabled)R.startEventLayer(def);
      if(R.eventState[id]){R.eventState[id].enabled=true;R.eventState[id].volume=value}
      return;
    }
    await R.ensureContext();if(!R.nodes[id])R.nodes[id]=await R.makeSourceNode(def);
    R.nodes[id].gain.gain.value=value;if(R.nodes[id].el.paused)await R.nodes[id].el.play();
  }
  async function apply(recipe){
    R.catalog.forEach(item=>disable(item.id));
    R.setMaster(recipe.master);
    for(const [id,volume] of Object.entries(recipe.mix))await enable(id,volume);
    if(recipe.fx&&window.LullabyMixerFx){
      const current=window.LullabyMixerFx.snapshot();
      window.LullabyMixerFx.apply({...current,...recipe.fx});
    }
    R.renderMixer();R.updateNowPlaying();window.LullabyQuickMixer?.render?.();
    window.switchView?.('scene');window.setLullabySceneMode?.('simple');
    R.setStatus?.(words().loaded);
  }
  function activeName(){
    const id=window.LullabySavedScenes?.activeId;
    return window.LullabySavedScenes?.list?.().find(scene=>scene.id===id)?.name||'Shared Scene';
  }
  async function share(){
    const url=new URL(location.href);url.searchParams.set('scene','simple');url.searchParams.set('recipe',encode(snapshot(activeName())));
    const value=url.toString();
    try{await navigator.clipboard.writeText(value);R.setStatus?.(words().copied)}catch{prompt(words().share,value)}
    return value;
  }
  function ensureButton(){
    const header=document.querySelector('[data-scene-content="simple"] .simple-scene-header');if(!header)return;
    let button=document.getElementById('shareSceneRecipe');
    if(!button){button=document.createElement('button');button.id='shareSceneRecipe';button.className='small-action';button.type='button';button.addEventListener('click',share);header.appendChild(button)}
    button.textContent=words().share;
  }
  async function importFromUrl(){
    const encoded=new URL(location.href).searchParams.get('recipe');if(!encoded)return;
    try{await apply(decode(encoded))}catch(error){console.error(error);R.setStatus?.(words().invalid)}
  }
  document.addEventListener('lullaby-language-changed',ensureButton);
  ensureButton();setTimeout(importFromUrl,350);
  window.LullabySceneRecipe={SCHEMA,VERSION,snapshot,encode,decode,apply,share};
})();
