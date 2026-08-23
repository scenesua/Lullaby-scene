import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const text=path=>read(path).toString('utf8');
const sha256=path=>createHash('sha256').update(read(path)).digest('hex');
const manifest=JSON.parse(text('app/src/main/assets/ambience/manifest/scene_sources.json'));
const expected={
  train_journey_departure_001:['train_journey','continuous',35183,'9a9a32c8d61819e7cf56ba15892042f151e27e0106b7bc517d41176bf0bae7ed'],train_journey_bed_001:['train_journey','continuous',240673,'3f4bfe13db2e8a74a6313defb4aee67fab6240a309d0a568f03c1be9ff5d309f'],train_journey_arrival_001:['train_journey','continuous',32236,'4ded52057adf0fee21bc94e32160a45347080420018427ff747b6ce49ee28b48'],
  ferry_journey_departure_001:['ferry_journey','continuous',128667,'6a97869104c2470f2ad93433d935d55ef5d60470f312ad2398cfcd8de3550186'],ferry_journey_bed_001:['ferry_journey','continuous',221686,'5055ed879397053c89b85912d14b8581d64b775df1e18f8c267b403953beabbe'],ferry_journey_arrival_001:['ferry_journey','continuous',98065,'6439ec0e9029126670bcf94b576261e0dbf40e304300b27221e6268b58a51932'],
  spacecraft_journey_transition_001:['spacecraft_journey','continuous',17824,'33f2897080646f6febdd92fc3d5fbc5ca210117e4ba7952186bbdadc2d120a20'],spacecraft_journey_bed_001:['spacecraft_journey','continuous',160007,'0e83da1dd2f06f07b5b6dbcc12587da022ddd999ee9bdd0e96f2decc3226da30'],
  submarine_journey_departure_001:['submarine_journey','continuous',47282,'d7f144e939704f9088960898d3e1fb975d4d4f138e246c2e490956d7593f10ef'],submarine_journey_engine_bed_001:['submarine_journey','continuous',133038,'a5493d37e036b919f4d54ec46120d29b6b32aa0d4471bc1f0359c408100e1ba8'],submarine_journey_water_bed_001:['submarine_journey','continuous',120006,'37daeeddb35b360b689a5294dd974eb8a96ab924b95fd464ff16fadf3dcaff14'],submarine_journey_arrival_001:['submarine_journey','continuous',54232,'f657b2d2bb6777dd751bb48486a57bcaf7a99b9f7b3994307205e5d7d5b19dee'],submarine_sonar_event_001:['submarine_journey','events',5006,'2b2c9089ce20af23fae721d5b3007c5e579f26b5f3c1623df1b9329d020c41f7']
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

const kotlin=text('app/src/main/java/com/scene/ambience/media/TrainJourneyTimeline.kt');
const web=text('web/train-journey-v1.js');
for(const marker of ['35183','32236','480000'])if(!web.includes(marker))throw new Error(`Web timeline missing ${marker}`);
for(const marker of ['35_183L','32_236L','8 * MINUTE_MS'])if(!kotlin.includes(marker))throw new Error(`Android timeline missing ${marker}`);
for(const phase of ['train_departure','train_leaving_city','train_night_run','train_approach','train_arrival']){
  if(!text('app/src/main/java/com/scene/ambience/media/SceneOrchestrator.kt').includes(phase))throw new Error(`Android phase missing ${phase}`);
}
if(!text('web/player/index.html').includes('/train-journey-v1.js?v=1'))throw new Error('Web player does not load Train Journey runtime');
if(!text('web/player/index.html').includes('/remaining-journeys-v1.js?v=1'))throw new Error('Web player does not load remaining Journey runtime');
const orchestrator=text('app/src/main/java/com/scene/ambience/media/SceneOrchestrator.kt'),remaining=text('web/remaining-journeys-v1.js'),strings=text('app/src/main/res/values/scene_strings.xml'),sw=text('web/sw.js');
for(const [id,title] of Object.entries({ferry_journey:'Night Ferry Journey',spacecraft_journey:'Spacecraft Drift',submarine_journey:'Submarine Voyage'})){
  if(!orchestrator.includes(`"${id}"`)||!remaining.includes(`${id}:`)||!strings.includes(title))throw new Error(`${id} platform definition mismatch`);
  if(!sw.includes(`/audio/scenes/${id}/`))throw new Error(`${id} is absent from offline cache`);
}
console.log('All five Journey Android/Web asset and timeline parity passed');
