(()=>{
  if(!document.getElementById('webPlayer'))return;
  window.LullabyPlayerRuntime={
    get catalog(){return catalog},
    get sourceById(){return sourceById},
    get nodes(){return nodes},
    get eventState(){return eventState},
    get presets(){return builtinPresets},
    get masterValue(){return masterValue},
    getMixerUiState,
    loadUserPresets,
    saveUserPresets,
    renderUserPresets,
    snapshotMix,
    applyPreset,
    setMaster,
    setStatus,
    startEventLayer,
    stopEventLayer,
    ensureContext,
    makeSourceNode,
    renderMixer,
    updateNowPlaying,
    stopJourney:stopJourneyPlayback
  };
})();
