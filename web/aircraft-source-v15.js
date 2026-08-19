(()=>{
  if(!document.getElementById('webPlayer'))return;
  const AIRCRAFT_URL='/audio/aircraft_cabin_cruise_v2.ogg';
  // Override the legacy four-part 20 second payload. Callers resolve this
  // function at playback time, so Mixer and Passenger Aircraft Cabin both use
  // the same verified long stereo bed without reconstructing the old mono blob.
  getAircraftUrl=async function(){return AIRCRAFT_URL};
  try{aircraftObjectUrl=null}catch{}
  window.LullabyAircraftSource={url:AIRCRAFT_URL,sourceId:'freesound_jasonm911_853736',durationSeconds:79,channels:2,sampleRate:48000};
})();
