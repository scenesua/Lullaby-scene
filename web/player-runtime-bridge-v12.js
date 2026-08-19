(()=>{
  if(!document.getElementById('webPlayer'))return;
  window.LullabyPlayerRuntime={
    get catalog(){return catalog},
    get sourceById(){return sourceById},
    get nodes(){return nodes},
    get eventState(){return eventState},
    get presets(){return builtinPresets},
    getMixerUiState,
    loadUserPresets,
    startEventLayer,
    stopEventLayer,
    ensureContext,
    makeSourceNode,
    renderMixer,
    updateNowPlaying
  };
})();
