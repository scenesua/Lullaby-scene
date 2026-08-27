import {createHash} from 'node:crypto';
import {existsSync,readFileSync,statSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const text=path=>read(path).toString('utf8');
const sha256=path=>createHash('sha256').update(read(path)).digest('hex');
const manifest=JSON.parse(text('app/src/main/assets/ambience/manifest/scene_sources.json'));
const expected={
  train_journey_departure_001:['train_journey','continuous',35183,'9a9a32c8d61819e7cf56ba15892042f151e27e0106b7bc517d41176bf0bae7ed'],train_journey_bed_001:['train_journey','continuous',234671,'eb19517370cebb7921a15bd29764f16406cc442f011fa14ce01940312e743a72'],train_journey_arrival_001:['train_journey','continuous',32236,'4ded52057adf0fee21bc94e32160a45347080420018427ff747b6ce49ee28b48'],
  ferry_journey_departure_001:['ferry_journey','continuous',128667,'9f14fd2d9a0a8c1aebdb0f2744a72883a74e61d11d9b41224de7f175da9db7b1'],ferry_journey_bed_001:['ferry_journey','continuous',120666,'5583c17eaffda0255f70a12be33634bd0a3e11c05274b203d9e5eb62f958a211'],ferry_journey_arrival_001:['ferry_journey','continuous',98065,'6439ec0e9029126670bcf94b576261e0dbf40e304300b27221e6268b58a51932'],
  spacecraft_journey_transition_001:['spacecraft_journey','continuous',17824,'b0eacd4243ab44f934c14884750b021dea9beb891bdf456a7b3c14ae3d1b19b0'],spacecraft_journey_bed_001:['spacecraft_journey','continuous',154007,'b55c5511952c239e60135f0864a565a8960ae9ddb1f18cb319e20524ed7af708'],
  submarine_journey_departure_001:['submarine_journey','continuous',47282,'d7f144e939704f9088960898d3e1fb975d4d4f138e246c2e490956d7593f10ef'],submarine_journey_engine_bed_001:['submarine_journey','continuous',127038,'85a095094428d6bc60c20f3011ecf2998056c7fc18d05c5606623cb738f6af58'],submarine_journey_water_bed_001:['submarine_journey','continuous',114006,'2bd2695e488c348714bc17127ab37bfba657f4f0b824f9c3c127a0f2812ed2b9'],submarine_journey_arrival_001:['submarine_journey','continuous',54232,'f657b2d2bb6777dd751bb48486a57bcaf7a99b9f7b3994307205e5d7d5b19dee'],submarine_sonar_event_001:['submarine_journey','events',5006,'2b2c9089ce20af23fae721d5b3007c5e579f26b5f3c1623df1b9329d020c41f7']
};

for(const [assetId,[scene,kind,duration,hash]] of Object.entries(expected)){
  const source=manifest.sources.find(item=>item[kind]?.some(asset=>asset.asset_id===assetId));
  if(!source)throw new Error(`Android manifest missing ${assetId}`);
  const asset=source[kind].find(item=>item.asset_id===assetId);
  if(asset.duration_ms!==duration)throw new Error(`${assetId} duration mismatch: ${asset.duration_ms}`);
  const name=`${assetId}.ogg`;
  const android=`app/src/main/assets/ambience/${scene}/${kind}/${name}`;
  const web=`web/audio/scenes/${scene}/${name}`;
  const androidHash=sha256(android),webHash=sha256(web);
  if(androidHash!==hash||webHash!==hash||androidHash!==webHash)throw new Error(`${assetId} platform hash mismatch`);
}

const hoodAssets={
  hood_journey_bed_001:['continuous',106652],hood_gunshot_event_001:['events',3324],hood_siren_event_001:['events',15000],hood_glass_event_001:['events',817],hood_shout_event_001:['events',3207],hood_footsteps_event_001:['events',9007],hood_car_pass_event_001:['events',6477],hood_car_door_event_001:['events',9007],hood_helicopter_event_001:['events',9007],hood_dog_event_001:['events',10119],
};
for(const [assetId,[kind,duration]] of Object.entries(hoodAssets)){
  const source=manifest.sources.find(item=>item[kind]?.some(asset=>asset.asset_id===assetId));
  if(!source)throw new Error(`Android HOOD manifest missing ${assetId}`);
  const asset=source[kind].find(item=>item.asset_id===assetId);
  if(asset.duration_ms!==duration)throw new Error(`${assetId} duration mismatch: ${asset.duration_ms}`);
  const android=`app/src/main/assets/${asset.path}`;
  const web=`web/audio/scenes/hood_journey/${assetId}.ogg`;
  if(!existsSync(android)||statSync(android).size<4000)throw new Error(`Android HOOD asset missing or empty: ${android}`);
  if(!existsSync(web)||statSync(web).size<8000)throw new Error(`Web HOOD asset missing or empty: ${web}`);
}

const kotlin=text('app/src/main/java/com/scene/ambience/media/TrainJourneyTimeline.kt');
const web=text('web/train-journey-v1.js');
for(const marker of ['35183','32236','480000'])if(!web.includes(marker))throw new Error(`Web timeline missing ${marker}`);
for(const marker of ['35_183L','32_236L','8 * MINUTE_MS'])if(!kotlin.includes(marker))throw new Error(`Android timeline missing ${marker}`);
for(const phase of ['train_departure','train_leaving_city','train_night_run','train_approach','train_arrival']){
  if(!text('app/src/main/java/com/scene/ambience/media/SceneOrchestrator.kt').includes(phase))throw new Error(`Android phase missing ${phase}`);
}
if(!text('web/player/index.html').includes('/train-journey-v1.js?v=11'))throw new Error('Web player does not load Train Journey runtime');
if(!text('web/player/index.html').includes('/remaining-journeys-v1.js?v=23'))throw new Error('Web player does not load remaining Journey runtime');
for(const file of['web/audio/scenes/aircraft_cabin/aircraft_chime_event_001.ogg','web/audio/scenes/train_journey/train_rail_event_001.ogg','web/audio/scenes/ferry_journey/ferry_wave_event_001.ogg','web/audio/scenes/spacecraft_journey/spacecraft_servo_event_001.ogg','web/audio/scenes/submarine_journey/submarine_sonar_event_001.ogg'])if(!existsSync(file)||statSync(file).size<8000)throw new Error(`Journey random-event asset missing or empty: ${file}`);
if(!text('web/player/index.html').includes('/journey-background-v1.js?v=14'))throw new Error('Web player does not load Journey backgrounds');
if(!text('web/journey-background-v1.js').includes("screen.orientation.lock('landscape')"))throw new Error('Mobile Journey display does not request landscape orientation');
if(!text('web/journey-background-v1.js').includes('const motionVideoEnabled=false'))throw new Error('Journey backgrounds must remain still-only until approved motion assets exist');
for(const scene of['aircraft','train','spacecraft','ferry','submarine','forest-temple','hood']){
  const poster=read(`web/assets/journeys/${scene}.webp`);
  if(poster.length<10000||poster.subarray(0,4).toString()!=='RIFF')throw new Error(`${scene} Journey poster is invalid`);
}
const orchestrator=text('app/src/main/java/com/scene/ambience/media/SceneOrchestrator.kt'),engine=text('app/src/main/java/com/scene/ambience/media/AmbienceEngine.kt'),remaining=text('web/remaining-journeys-v1.js'),i18n=text('web/i18n-runtime-v3.js'),strings=text('app/src/main/res/values/scene_strings.xml'),sw=text('web/sw.js');
for(const [id,title] of Object.entries({ferry_journey:'Night Ferry Journey',spacecraft_journey:'Spacecraft Drift',submarine_journey:'Submarine Voyage',forest_temple_journey:'Forest Temple',hood_journey:'HOOD Night'})){
  if(!orchestrator.includes(`"${id}"`)||!remaining.includes(`${id}:`)||!strings.includes(title))throw new Error(`${id} platform definition mismatch`);
}
for(const marker of ['SOURCE_HOOD_GUNSHOT','SOURCE_HOOD_SIREN','SOURCE_HOOD_CAR_PASS','EVENT_HOOD_SHOUT','setRandomEventsEnabled'])if(!orchestrator.includes(marker))throw new Error(`Android HOOD runtime missing ${marker}`);
for(const marker of ["hoodGuns=['gunshot'","hoodVoices=['shout'","hoodSirens=['siren'","playHoodEvent('carPass'",'lullaby-hood-siren'])if(!remaining.includes(marker)&&!text('web/journey-background-v1.js').includes(marker))throw new Error(`Web HOOD runtime missing ${marker}`);
for(const phase of ['Departing','Leaving city','Night run','Casting off','Leaving harbor','Night crossing','Harbor approach','Reaching shore','Leaving orbit','Cabin settling','Deep-space drift','Destination approach','Quiet docking','Diving','Settling at depth','Deep-water cruise','Ascending','Reaching surface','Street quieting down','After hours','Deep night','Street stirring','First light'])if(i18n.split(`'${phase}':`).length-1!==13)throw new Error(`Journey phase is not translated in all 13 locales: ${phase}`);
for(const marker of ["minimumDistance=sirenType?.62:gun?.70:type==='glass'?.68","farAt=duration*.78","responseAt=lastGunshotMs+random(18000,115001)","convoyOffset+=random(900,2601)","gain:.14"])if(!remaining.includes(marker))throw new Error(`Web spatial mix missing ${marker}`);
for(const marker of ["dog:.18","dog:.22","type==='dog'?.45","type==='dog'?.96"])if(!remaining.includes(marker))throw new Error(`Web distant dog mix missing ${marker}`);
for(const marker of ['SOURCE_HOOD_GLASS -> .68f','SOURCE_HOOD_GUNSHOT -> .70f','eventVolume = .14f'])if(!orchestrator.includes(marker))throw new Error(`Android spatial mix missing ${marker}`);
for(const marker of ['triggerPassingEventNow','responseAtMs = lastGunshotMs + random.nextLong(18_000L, 115_001L)','convoyOffsetMs += random.nextLong(900L, 2_601L)'])if(!engine.includes(marker)&&!orchestrator.includes(marker))throw new Error(`Android siren convoy path is missing ${marker}`);
for(const marker of ['preservesPitch=false','playbackRate=1.08','playbackRate=.93'])if(!remaining.includes(marker))throw new Error(`Web siren Doppler path missing ${marker}`);
for(const marker of ['playNow(startVolumeScale, startPan, 1.08f)','soundPool.setRate(streamId, rate)'])if(!text('app/src/main/java/com/scene/ambience/media/EventSourcePlayer.kt').includes(marker))throw new Error(`Android siren Doppler path missing ${marker}`);
for(const marker of ['SOURCE_FOREST_TEMPLE_BOWL','SOURCE_FOREST_TEMPLE_MOKTAK','SOURCE_FOREST_TEMPLE_GRAVEL','SOURCE_FOREST_TEMPLE_HEART_SUTRA','startTempleEvents'])if(!orchestrator.includes(marker))throw new Error(`Android Forest Temple runtime missing ${marker}`);
for(const marker of ["const templeEventTypes=['moktak','gravel','moktak','gravel','heartSutra']","delete configs.hood_journey;configs.hood_journey=hoodConfig","'forest_temple_journey','hood_journey'"])if(!remaining.includes(marker))throw new Error(`Web Forest Temple order/runtime missing ${marker}`);
if(!sw.includes("event.request.destination==='audio'"))throw new Error('Web audio is not isolated from service-worker shell caching');
console.log('All seven Journey Android/Web asset and timeline parity passed');
