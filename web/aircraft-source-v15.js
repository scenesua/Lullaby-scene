(()=>{
  if(!document.getElementById('webPlayer'))return;
  const CRUISE_URL='/audio/aircraft_cabin_cruise_v2.ogg';
  const TAXI_URL='/audio/aircraft_cabin_taxi_627056_v1.ogg';

  // Cruise stays on the existing 853735-derived bed for now. Taxi uses the
  // separately supplied Freesound 627056 field recording so the old long-loop
  // overlap cannot surface during taxi-out/taxi-in.
  getAircraftUrl=async function(){return CRUISE_URL};
  getAircraftTaxiUrl=async function(){return TAXI_URL};
  try{aircraftObjectUrl=null}catch{}
  window.LullabyAircraftSource={
    url:CRUISE_URL,
    sourceId:'freesound_jasonm911_853735',
    durationSeconds:105,
    channels:2,
    sampleRate:48000,
    loop:'circular-crossfade'
  };
  window.LullabyAircraftTaxiSource={
    url:TAXI_URL,
    sourceId:'freesound_mar_sounds_627056',
    sourceTitle:'Airplane_Cabine ambiance (during flight).wav',
    durationSeconds:180,
    channels:2,
    sampleRate:48000,
    license:'CC0-1.0',
    loop:'short-circular-bridge',
    bridgeMs:180
  };
})();
