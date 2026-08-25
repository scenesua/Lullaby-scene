(()=>{
  const R=window.LullabyPlayerRuntime;
  if(!R||!document.getElementById('webPlayer'))return;
  const SCHEMA='lullaby.scene.recipe';
  const VERSION=1;
  const IMPORT_SOURCE_LIMIT=8;
  const IMPORT_GAIN_LIMIT=1.2;
  const IMPORT_MASTER_LIMIT=.85;
  const ko=()=>(window.LullabyI18n?.language||document.documentElement.lang)==='ko';
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  const source=id=>R.sourceById[id]||R.catalog.find(item=>item.id===id)||null;
  const text={
    ko:{share:'씬 링크 복사',copied:'씬 공유 링크를 복사했습니다.',invalid:'씬 공유 링크를 읽지 못했습니다.',loaded:'공유 씬을 불러왔습니다.',preview:'공유 씬 설정 미리보기',load:'불러와 재생',safe:'공유 링크는 최대 8개 소스와 합산 음량 120%로 제한됩니다.'},
    en:{share:'Copy scene link',copied:'Copied the scene share link.',invalid:'Could not read this scene link.',loaded:'Loaded the shared scene.',preview:'Shared Scene settings preview',load:'Load and play',safe:'Shared links are limited to 8 sources and 120% combined source gain.'}
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
  function cleanImportedMix(input){
    const entries=Object.entries(cleanMix(input)).sort((a,b)=>b[1]-a[1]).slice(0,IMPORT_SOURCE_LIMIT);
    const total=entries.reduce((sum,[,value])=>sum+value,0),scale=total>IMPORT_GAIN_LIMIT?IMPORT_GAIN_LIMIT/total:1;
    return Object.fromEntries(entries.map(([id,value])=>[id,Math.floor(value*scale*1000)/1000]).filter(([,value])=>value>0));
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
    return {schema:SCHEMA,version:VERSION,name:String(parsed.name||'Shared Scene').slice(0,80),master:Math.min(IMPORT_MASTER_LIMIT,clamp(parsed.master??.7)),mix:cleanImportedMix(parsed.mix),fx:cleanFx(parsed.fx),seed:parsed.seed??null};
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
  let pendingRecipe=null;
  function ensurePreview(){
    const host=document.querySelector('[data-scene-content="simple"]');if(!host)return null;
    let root=document.getElementById('sceneRecipePreview');if(root)return root;
    root=document.createElement('section');root.id='sceneRecipePreview';root.className='scene-recipe-preview';root.hidden=true;
    const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.dataset.recipePreviewLabel='';
    const title=document.createElement('h4');title.dataset.recipePreviewName='';
    const summary=document.createElement('p');summary.className='muted-copy';summary.dataset.recipePreviewSummary='';
    const list=document.createElement('ul');list.dataset.recipePreviewSources='';
    const safe=document.createElement('p');safe.className='scene-recipe-safe';safe.dataset.recipePreviewSafe='';
    const button=document.createElement('button');button.type='button';button.className='button primary';button.dataset.recipeLoad='';
    button.addEventListener('click',async()=>{const recipe=pendingRecipe;if(!recipe)return;button.disabled=true;try{await apply(recipe);pendingRecipe=null;root.hidden=true;const url=new URL(location.href);url.searchParams.delete('recipe');history.replaceState(null,'',url)}finally{button.disabled=false}});
    root.append(eyebrow,title,summary,list,safe,button);host.querySelector('.simple-scene-header')?.after(root);return root;
  }
  function preview(recipe){
    const root=ensurePreview();if(!root)return false;pendingRecipe=recipe;
    root.querySelector('[data-recipe-preview-label]').textContent=words().preview;
    root.querySelector('[data-recipe-preview-name]').textContent=recipe.name||'Shared Scene';
    const entries=Object.entries(recipe.mix),total=entries.reduce((sum,[,value])=>sum+value,0);
    root.querySelector('[data-recipe-preview-summary]').textContent=ko()?`소스 ${entries.length}개 · 마스터 ${Math.round(recipe.master*100)}% · 합산 음량 ${Math.round(total*100)}%`:`${entries.length} sources · Master ${Math.round(recipe.master*100)}% · Combined gain ${Math.round(total*100)}%`;
    const list=root.querySelector('[data-recipe-preview-sources]');list.replaceChildren(...entries.map(([id,value])=>{const item=document.createElement('li');item.textContent=`${source(id)?.name||id} · ${Math.round(value*100)}%`;return item}));
    root.querySelector('[data-recipe-preview-safe]').textContent=words().safe;
    root.querySelector('[data-recipe-load]').textContent=words().load;
    root.hidden=false;window.switchView?.('scene');window.setLullabySceneMode?.('simple');root.scrollIntoView({block:'nearest'});return true;
  }
  function ensureButton(){
    const header=document.querySelector('[data-scene-content="simple"] .simple-scene-header');if(!header)return;
    let button=document.getElementById('shareSceneRecipe');
    if(!button){button=document.createElement('button');button.id='shareSceneRecipe';button.className='small-action';button.type='button';button.addEventListener('click',share);header.appendChild(button)}
    button.textContent=words().share;
  }
  async function importFromUrl(attempt=0){
    const encoded=new URL(location.href).searchParams.get('recipe');if(!encoded)return;
    if(!R.catalog.length&&attempt<20){setTimeout(()=>importFromUrl(attempt+1),100);return}
    try{preview(decode(encoded))}catch(error){console.error(error);R.setStatus?.(words().invalid)}
  }
  document.addEventListener('lullaby-language-changed',()=>{ensureButton();if(pendingRecipe)preview(pendingRecipe)});
  ensureButton();setTimeout(importFromUrl,350);
  window.LullabySceneRecipe={SCHEMA,VERSION,IMPORT_SOURCE_LIMIT,IMPORT_GAIN_LIMIT,IMPORT_MASTER_LIMIT,snapshot,encode,decode,apply,preview,share,get pending(){return pendingRecipe}};
})();
