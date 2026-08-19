(()=>{
  const R=window.LullabyPlayerRuntime;
  if(!R||!document.getElementById('webPlayer'))return;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const ko=()=>window.LullabyI18n?.language!=='en';
  let activeId=null;

  const copy=()=>ko()?{
    save:'씬 저장',load:'불러오기',rename:'이름 변경',overwrite:'현재 설정 저장',
    savePrompt:'저장할 씬 이름을 입력하세요.',renamePrompt:'새 씬 이름을 입력하세요.',
    overwriteConfirm:'현재 믹스와 FX로 이 저장 씬을 덮어쓸까요?',
    saved:'현재 믹스와 FX를 새 씬으로 저장했습니다.',loaded:'저장 씬을 불러왔습니다.',
    renamed:'저장 씬 이름을 변경했습니다.',overwritten:'현재 믹스와 FX를 저장 씬에 반영했습니다.'
  }:{
    save:'Save scene',load:'Load',rename:'Rename',overwrite:'Save current',
    savePrompt:'Name this saved scene.',renamePrompt:'Enter a new scene name.',
    overwriteConfirm:'Overwrite this saved scene with the current mix and FX?',
    saved:'Saved the current mix and FX as a new scene.',loaded:'Loaded the saved scene.',
    renamed:'Renamed the saved scene.',overwritten:'Updated the saved scene with the current mix and FX.'
  };
  const cleanName=value=>String(value??'').trim().replace(/\s+/g,' ').slice(0,60);
  const find=id=>R.loadUserPresets().find(scene=>scene.id===id)||null;
  const fxSnapshot=()=>window.LullabyMixerFx?.snapshot?.()||null;
  const setText=(element,value)=>{if(element&&element.textContent!==value)element.textContent=value};
  const sceneSnapshot=(id,name,previous={})=>({
    ...previous,
    id,
    name,
    master:R.masterValue,
    mix:R.snapshotMix(),
    fx:fxSnapshot(),
    createdAt:previous.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  const setStatus=message=>R.setStatus?.(message);

  function persist(list){
    R.saveUserPresets(list);
    queueMicrotask(enhance);
  }

  function create(name){
    const safe=cleanName(name);if(!safe)return null;
    const list=R.loadUserPresets();
    const id=`user_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    list.push(sceneSnapshot(id,safe));persist(list);activeId=id;setStatus(copy().saved);markActive();return id;
  }

  function rename(id,name){
    const safe=cleanName(name);if(!safe)return false;
    const list=R.loadUserPresets(),index=list.findIndex(scene=>scene.id===id);if(index<0)return false;
    list[index]={...list[index],name:safe,updatedAt:new Date().toISOString()};persist(list);setStatus(copy().renamed);return true;
  }

  function overwrite(id){
    const list=R.loadUserPresets(),index=list.findIndex(scene=>scene.id===id);if(index<0)return false;
    const previous=list[index];list[index]=sceneSnapshot(id,previous.name,previous);persist(list);activeId=id;setStatus(copy().overwritten);markActive();return true;
  }

  async function load(id){
    const scene=find(id);if(!scene)return false;
    await R.applyPreset(id);
    if(scene.fx&&window.LullabyMixerFx)window.LullabyMixerFx.apply(scene.fx);else window.LullabyMixerFx?.reset?.();
    window.switchView?.('scene');
    window.setLullabySceneMode?.('simple');
    activeId=id;markActive();setStatus(copy().loaded);return true;
  }

  function markActive(){
    $$('.preset-card.user').forEach(card=>{
      const id=card.querySelector('[data-user-preset]')?.dataset.userPreset;
      card.classList.toggle('is-active-saved-scene',!!activeId&&id===activeId);
    });
  }

  function replaceLegacySaveButton(){
    const old=$('#savePreset');if(!old)return;
    const button=old.cloneNode(true);button.id='saveSceneButton';button.removeAttribute('data-bound');button.textContent=copy().save;
    old.replaceWith(button);
    button.addEventListener('click',()=>{const name=prompt(copy().savePrompt);if(name!==null)create(name)});
  }

  function enhance(){
    const labels=copy();
    const save=$('#saveSceneButton');if(save)setText(save,labels.save);else replaceLegacySaveButton();
    $$('#userPresets .preset-card.user').forEach(card=>{
      const source=card.querySelector('[data-user-preset]'),id=source?.dataset.userPreset;if(!id)return;
      source.setAttribute('title',ko()?'클릭하여 불러오기':'Click to load');
      let actions=card.querySelector('.saved-scene-actions');
      if(!actions){
        actions=document.createElement('div');actions.className='saved-scene-actions';
        actions.innerHTML=`<button type="button" data-saved-load="${id}"></button><button type="button" data-saved-rename="${id}"></button><button type="button" data-saved-overwrite="${id}"></button>`;
        card.appendChild(actions);
      }
      setText(actions.querySelector('[data-saved-load]'),labels.load);
      setText(actions.querySelector('[data-saved-rename]'),labels.rename);
      setText(actions.querySelector('[data-saved-overwrite]'),labels.overwrite);
    });
    markActive();
  }

  document.addEventListener('click',event=>{
    const original=event.target.closest?.('[data-user-preset]');if(original){activeId=original.dataset.userPreset;setTimeout(markActive,0);return}
    const loadButton=event.target.closest?.('[data-saved-load]');if(loadButton){event.preventDefault();event.stopPropagation();load(loadButton.dataset.savedLoad);return}
    const renameButton=event.target.closest?.('[data-saved-rename]');if(renameButton){event.preventDefault();event.stopPropagation();const scene=find(renameButton.dataset.savedRename);if(!scene)return;const value=prompt(copy().renamePrompt,scene.name);if(value!==null)rename(scene.id,value);return}
    const overwriteButton=event.target.closest?.('[data-saved-overwrite]');if(overwriteButton){event.preventDefault();event.stopPropagation();if(confirm(copy().overwriteConfirm))overwrite(overwriteButton.dataset.savedOverwrite)}
  });
  document.addEventListener('lullaby-language-changed',enhance);
  const root=$('#userPresets');if(root)new MutationObserver(()=>queueMicrotask(enhance)).observe(root,{childList:true});
  replaceLegacySaveButton();enhance();
  window.LullabySavedScenes={create,load,rename,overwrite,list:()=>R.loadUserPresets(),get activeId(){return activeId}};
})();
