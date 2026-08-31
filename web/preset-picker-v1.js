(()=>{
  const picker=document.getElementById('presetPicker'),R=window.LullabyPlayerRuntime;
  if(!picker||!R)return;
  const summary=picker.querySelector('summary'),label=summary.querySelector('strong'),meta=summary.querySelector('small');
  const transport=document.getElementById('simpleSceneTransport'),mixer=document.getElementById('simpleQuickMixerSection');
  if(transport)picker.after(transport);if(mixer)(transport||picker).after(mixer);
  let selectedId=null;
  const preset=id=>R.presets.find(p=>p.id===id)||R.loadUserPresets().find(p=>p.id===id);
  const imageFor=p=>window.LullabyPresetVisuals?.[p?.id]||window.LullabyPresetVisuals?.[R.presets.find(candidate=>Object.keys(p?.mix||{}).some(id=>candidate.mix[id]))?.id];
  function refresh(){
    const p=preset(selectedId),L=window.LullabyLocales;
    label.textContent=p?(L?.presetName?.(p.id,p.name)||p.name):(L?.term?.('presets')||'Ready-made scenes');
    meta.textContent=p?`${Object.keys(p.mix).length} ${L?.term?.('sources')||'sources'}`:(L?.t?.('chooseScene')||'Choose a ready-made scene first.');
    const image=imageFor(p);summary.style.setProperty('--preset-image',image?`url("${image}")`:'none');
    picker.querySelectorAll('[data-preset],[data-user-preset]').forEach(button=>{
      const id=button.dataset.preset||button.dataset.userPreset;
      button.setAttribute('aria-pressed',String(id===selectedId));
      if(button.dataset.userPreset){const photo=imageFor(preset(id));button.classList.add('preset-card-visual');button.style.setProperty('--preset-image',photo?`url("${photo}")`:'none')}
    });
  }
  function close(restoreFocus=false){picker.open=false;if(restoreFocus)summary.focus({preventScroll:true})}
  // Capture before the existing player shell consumes preset clicks. Retain its
  // playback/FX handlers and the original buttons, including saved-scene actions.
  window.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-preset],[data-user-preset],[data-saved-load]');
    if(button&&picker.contains(button)){selectedId=button.dataset.preset||button.dataset.userPreset||button.dataset.savedLoad;refresh();close(true)}
    else if(!picker.contains(event.target))close();
  },true);
  picker.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();close(true);return}
    if(!picker.open||!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=[...picker.querySelectorAll('[data-preset],[data-user-preset]')],index=buttons.indexOf(document.activeElement);
    if(!buttons.length)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowDown'?Math.min(index+1,buttons.length-1):Math.max(index-1,0);
    buttons[next].focus();
  });
  for(const id of ['builtInPresets','userPresets'])new MutationObserver(refresh).observe(document.getElementById(id),{childList:true});
  document.addEventListener('lullaby-language-changed',refresh);
  document.addEventListener('lullaby-locales-applied',refresh);
  document.addEventListener('lullaby-preset-applied',event=>{selectedId=event.detail.id;refresh()});
  refresh();
})();
