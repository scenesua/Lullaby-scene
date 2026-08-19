(()=>{
  if(!document.getElementById('webPlayer'))return;
  const AIRCRAFT_URL='/audio/aircraft_cabin_cruise_v2.ogg';
  // The same long stereo bed is used by the full Mixer and Passenger Aircraft
  // Cabin. It is materialized from Freesound 853735 with the processing profile
  // derived from the WAV supplied to this project: no loudness boost, only two
  // narrow whistle notches, and a circular 5-second loop bridge.
  getAircraftUrl=async function(){return AIRCRAFT_URL};
  try{aircraftObjectUrl=null}catch{}
  window.LullabyAircraftSource={url:AIRCRAFT_URL,sourceId:'freesound_jasonm911_853735',durationSeconds:105,channels:2,sampleRate:48000,loop:'circular-crossfade'};
})();
