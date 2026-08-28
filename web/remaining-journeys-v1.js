(()=>{
  'use strict';
  if(!window.LullabyTrainJourney||typeof startScene!=='function')return;
  const configs={
    ferry_journey:{
      icon:'⛴',title:['Night Ferry Journey','야간 페리 여정'],description:['Cast off, cross dark open water through the night, and wake as the ferry reaches shore.','부두를 떠나 어두운 바다를 밤새 건넌 뒤 해안에 닿으며 깨어나는 여정입니다.'],
      durations:[128667,720000,720000,98065],phases:[['Casting off','부두를 떠나는 중'],['Leaving harbor','항구를 벗어나는 중'],['Night crossing','밤바다를 건너는 중'],['Harbor approach','항구에 접근하는 중'],['Reaching shore','해안에 닿는 중']],
      nodes:{departure:['/audio/scenes/ferry_journey/ferry_journey_departure_001.ogg?v=3',128.667],bed:['/audio/scenes/ferry_journey/ferry_journey_bed_001.ogg?v=3',120.666],arrival:['/audio/scenes/ferry_journey/ferry_journey_arrival_001.ogg',98.065]},roles:{departure:['departure'],bed:['bed'],arrival:['arrival']},gains:{departure:.54,bed:.48,arrival:.52},event:{url:'/audio/scenes/ferry_journey/ferry_wave_event_001.ogg',label:['Wave against the hull','선체를 스치는 파도'],gain:.14,durationMs:5100,minMs:360000,maxMs:840000,phases:[2,3]},
      macros:[['Engine presence','엔진 존재감'],['Deck activity','갑판 활동감'],['Wave texture','파도 질감'],['Night depth','밤의 깊이']],detail:['Steady night crossing','고른 야간 항해'],fx:[
        {gain:1,cutoff:11000,gainSeconds:6,filterSeconds:9,roleFadeSeconds:9,visualMs:800,seekDelayMs:130},{gain:.96,cutoff:9000,gainSeconds:9,filterSeconds:13,roleFadeSeconds:13,visualMs:1050,seekDelayMs:170},{gain:.88,cutoff:6500,gainSeconds:16,filterSeconds:24,roleFadeSeconds:16,visualMs:1550,seekDelayMs:250},{gain:.94,cutoff:8500,gainSeconds:11,filterSeconds:16,roleFadeSeconds:15,visualMs:1250,seekDelayMs:200},{gain:.92,cutoff:10000,gainSeconds:7,filterSeconds:10,roleFadeSeconds:11,visualMs:900,seekDelayMs:145}
      ]
    },
    spacecraft_journey:{
      icon:'🚀',title:['Spacecraft Drift','우주선 표류'],description:['Leave orbit, settle into a long deep-space drift, approach the destination, and dock quietly.','궤도를 떠나 깊은 우주를 오래 표류한 뒤 목적지에 접근해 조용히 도킹합니다.'],
      durations:[17824,600000,600000,17824],phases:[['Leaving orbit','궤도를 떠나는 중'],['Cabin settling','기내가 안정되는 중'],['Deep-space drift','깊은 우주를 표류하는 중'],['Destination approach','목적지에 접근하는 중'],['Quiet docking','조용히 도킹하는 중']],
      nodes:{transition:['/audio/scenes/spacecraft_journey/spacecraft_journey_transition_001.ogg?v=2',17.824],bed:['/audio/scenes/spacecraft_journey/spacecraft_journey_bed_001.ogg?v=2',154.007]},roles:{departure:['transition'],bed:['bed'],arrival:['transition']},gains:{transition:.50,bed:.48},event:{url:'/audio/scenes/spacecraft_journey/spacecraft_servo_event_001.ogg',label:['Distant cabin servo','멀리서 움직이는 기내 서보'],durationMs:1800,minMs:420000,maxMs:960000,phases:[1,2,3]},
      macros:[['Drive presence','구동계 존재감'],['Cabin activity','기내 활동감'],['Hull texture','선체 질감'],['Night depth','밤의 깊이']],detail:['Stable sleep-safe drift','안정적인 수면용 표류'],fx:[
        {gain:1,cutoff:12500,gainSeconds:5,filterSeconds:8,roleFadeSeconds:7,visualMs:750,seekDelayMs:120},{gain:.94,cutoff:9500,gainSeconds:12,filterSeconds:18,roleFadeSeconds:7,visualMs:1250,seekDelayMs:200},{gain:.86,cutoff:7200,gainSeconds:20,filterSeconds:30,roleFadeSeconds:18,visualMs:1750,seekDelayMs:280},{gain:.93,cutoff:10500,gainSeconds:14,filterSeconds:21,roleFadeSeconds:16,visualMs:1450,seekDelayMs:230},{gain:.88,cutoff:8500,gainSeconds:16,filterSeconds:24,roleFadeSeconds:8,visualMs:1600,seekDelayMs:250}
      ]
    },
    submarine_journey:{
      icon:'◒',title:['Submarine Voyage','잠수함 항해'],description:['Dive below the surface, settle into a deep cruise with rare sonar, then rise into a quiet arrival.','수면 아래로 잠항해 드문 소나와 함께 심해를 순항한 뒤 조용히 부상합니다.'],
      durations:[47282,480000,480000,54232],phases:[['Diving','수면 아래로 잠항하는 중'],['Settling at depth','심도에 안정되는 중'],['Deep-water cruise','심해를 순항하는 중'],['Ascending','부상하는 중'],['Reaching surface','수면에 도달하는 중']],
      nodes:{departure:['/audio/scenes/submarine_journey/submarine_journey_departure_001.ogg',47.282],engine:['/audio/scenes/submarine_journey/submarine_journey_engine_bed_001.ogg?v=2',127.038],water:['/audio/scenes/submarine_journey/submarine_journey_water_bed_001.ogg?v=2',114.006],arrival:['/audio/scenes/submarine_journey/submarine_journey_arrival_001.ogg',54.232]},roles:{departure:['departure'],bed:['engine','water'],arrival:['arrival']},gains:{departure:.54,engine:.43,water:.24,arrival:.52},event:{url:'/audio/scenes/submarine_journey/submarine_sonar_event_001.ogg',label:['Distant sonar','멀리서 울리는 소나'],durationMs:5100,minMs:180000,maxMs:420000,phases:[1,2,3]},
      macros:[['Engine presence','엔진 존재감'],['Crew activity','승조원 활동감'],['Water pressure','수압 질감'],['Night depth','밤의 깊이']],detail:['Rare distant sonar','멀리서 들리는 드문 소나'],fx:[
        {gain:1,cutoff:6800,gainSeconds:9,filterSeconds:15,roleFadeSeconds:10,visualMs:950,seekDelayMs:155},{gain:.96,cutoff:5400,gainSeconds:15,filterSeconds:22,roleFadeSeconds:16,visualMs:1400,seekDelayMs:225},{gain:.88,cutoff:4300,gainSeconds:22,filterSeconds:32,roleFadeSeconds:20,visualMs:1850,seekDelayMs:290},{gain:.94,cutoff:6200,gainSeconds:14,filterSeconds:22,roleFadeSeconds:17,visualMs:1500,seekDelayMs:240},{gain:.9,cutoff:8200,gainSeconds:9,filterSeconds:14,roleFadeSeconds:12,visualMs:1050,seekDelayMs:170}
      ]
    },
    hood_journey:{
      icon:'▦',title:['HOOD Night','HOOD 나이트'],description:['A worn brick walk-up block after dark: fire escapes, a fenced court, patched asphalt and restless street life. Optional incidents unfold differently each time.','낡은 브릭 워크업과 비상계단, 철망 농구장, 갈라진 도로가 이어지는 후드의 밤입니다. 랜덤 이벤트를 켜면 사건의 거리와 전개가 매번 달라집니다.'],
      durations:[45000,600000,600000,45000],phases:[['Street quieting down','거리의 소란이 잦아드는 중'],['After hours','심야 생활음'],['Deep night','깊은 밤'],['Street stirring','거리의 기척'],['First light','새벽빛이 드는 중']],
      nodes:{bed:['/audio/scenes/hood_journey/hood_journey_bed_001.ogg',106.652]},roles:{departure:['bed'],bed:['bed'],arrival:['bed']},gains:{bed:.52},event:{sequence:'hood',label:['Street incident','거리의 사건'],durationMs:45000,minMs:180000,maxMs:480000,phases:[1,2,3],sources:{gunshot:['/audio/scenes/hood_journey/hood_gunshot_event_001.ogg',3324],gunShotgun:['/audio/scenes/hood_journey/hood_gunshot_shotgun_event_004.ogg?v=2',2437],siren:['/audio/scenes/hood_journey/hood_siren_event_001.ogg?v=3',15000],sirenAlt1:['/audio/scenes/hood_journey/hood_siren_event_001.ogg?v=3',15000],sirenAlt2:['/audio/scenes/hood_journey/hood_siren_event_001.ogg?v=3',15000],glass:['/audio/scenes/hood_journey/hood_glass_event_001.ogg',817],shout:['/audio/scenes/hood_journey/hood_shout_event_001.ogg',3207],shoutMale:['/audio/scenes/hood_journey/hood_shout_male_event_002.ogg?v=2',6507],screamShort:['/audio/scenes/hood_journey/hood_scream_short_event_003.ogg?v=2',2357],screamCrowd:['/audio/scenes/hood_journey/hood_scream_crowd_event_004.ogg?v=2',7907],footsteps:['/audio/scenes/hood_journey/hood_footsteps_event_001.ogg',9007],carPass:['/audio/scenes/hood_journey/hood_car_pass_event_001.ogg',6477],carDoor:['/audio/scenes/hood_journey/hood_car_door_event_001.ogg',10007],helicopter:['/audio/scenes/hood_journey/hood_helicopter_event_001.ogg',10007],dog:['/audio/scenes/hood_journey/hood_dog_event_001.ogg?v=3',10119]}},
      macros:[['Street presence','거리 존재감'],['Night activity','심야 활동감'],['Incident intensity','사건 강도'],['Night depth','밤의 깊이']],detail:['Random events ready','랜덤 이벤트 대기 중'],fx:[
        {gain:.92,cutoff:10500,gainSeconds:7,filterSeconds:10,roleFadeSeconds:8,visualMs:850,seekDelayMs:135},{gain:1,cutoff:12000,gainSeconds:10,filterSeconds:14,roleFadeSeconds:12,visualMs:1100,seekDelayMs:180},{gain:.88,cutoff:7800,gainSeconds:18,filterSeconds:26,roleFadeSeconds:18,visualMs:1650,seekDelayMs:265},{gain:.98,cutoff:11500,gainSeconds:9,filterSeconds:13,roleFadeSeconds:13,visualMs:1200,seekDelayMs:195},{gain:.82,cutoff:7000,gainSeconds:14,filterSeconds:22,roleFadeSeconds:14,visualMs:1500,seekDelayMs:240}
      ]
    },
    forest_temple_journey:{
      icon:'卍',title:['Forest Temple','숲속 절'],description:['A bright forest temple for rest and meditation, with birds, a quiet singing bowl, distant gravel footsteps, and occasional verified sutra readings.','밝은 숲속 절에서 새소리와 잔잔한 싱잉볼, 멀리 자갈을 밟는 발소리, 검증된 경전 낭독을 드물게 듣는 휴식·명상 여정입니다.'],
      durations:[90000,600000,600000,90000],phases:[['Entering the temple path','절길에 들어서는 중'],['Morning courtyard','아침 마당에 머무는 중'],['Forest meditation','숲속 명상 중'],['Returning to the path','절길로 돌아가는 중'],['Leaving quietly','조용히 나서는 중']],
      nodes:{departure:['/audio/scenes/forest_temple_journey/forest_temple_path_walk_001.ogg?v=1',104.007],forest:['/audio/scenes/forest_temple_journey/forest_temple_forest_bed_001.ogg?v=1',73.220],birds:['/audio/scenes/forest_temple_journey/forest_temple_korean_distant_birds_bed_001.ogg?v=1',120.030],bowl:['/audio/scenes/forest_temple_journey/forest_temple_bowl_distant_bed_001.ogg?v=1',77.007]},roles:{departure:['departure','forest','birds'],bed:['forest','birds','bowl'],arrival:['forest','birds','bowl']},gains:{departure:1,forest:.121,birds:.11,bowl:.227},bedStartsAtPhaseBoundary:true,event:{sequence:'temple',label:['Temple sound','절의 소리'],minMs:210000,maxMs:540000,phases:[2,3],sources:{moktak:['/audio/scenes/forest_temple_journey/forest_temple_moktak_event_001.ogg?v=2',77165],gravel:['/audio/scenes/forest_temple_journey/forest_temple_gravel_event_001.ogg?v=2',26907],heartSutra:['/audio/scenes/forest_temple_journey/forest_temple_heart_sutra_event_001.ogg?v=5',120196]}},
      macros:[['Forest presence','숲의 존재감'],['Bird activity','새의 활동감'],['Temple resonance','절의 울림'],['Meditation depth','명상의 깊이']],detail:['Quiet temple ambience','고요한 절의 기척'],fx:[
        {gain:.92,cutoff:11500,gainSeconds:8,filterSeconds:12,roleFadeSeconds:10,visualMs:900,seekDelayMs:145},{gain:1,cutoff:12500,gainSeconds:12,filterSeconds:18,roleFadeSeconds:14,visualMs:1250,seekDelayMs:200},{gain:.88,cutoff:9200,gainSeconds:20,filterSeconds:30,roleFadeSeconds:20,visualMs:1700,seekDelayMs:270},{gain:.96,cutoff:11000,gainSeconds:14,filterSeconds:21,roleFadeSeconds:16,visualMs:1400,seekDelayMs:225},{gain:.9,cutoff:10500,gainSeconds:10,filterSeconds:15,roleFadeSeconds:12,visualMs:1050,seekDelayMs:170}
      ]
    }
  };
  // Preserve a single canonical Journey order for every consumer, including debug tools.
  // Forest Temple is directly before HOOD and HOOD always remains last.
  const hoodConfig=configs.hood_journey;delete configs.hood_journey;configs.hood_journey=hoodConfig;
  const base={start:startScene,pause:pauseScene,stop:stopScene,phaseFor,updateUi:updateSceneUi,updateAudio:updateSceneAudio};
  const playButton=document.getElementById('scenePlay');if(playButton)playButton.removeEventListener('click',base.start);
  const media={},eventNodes={},hoodVoiceCursor={gunshot:0,gunShotgun:0};let audibleRole=null,eventTimers=new Set(),eventLabelUntil=0,currentEventLabel=null,roleGeneration=0,templePhaseIndex=-1,templeStageThreeStarting=false;
  const config=()=>configs[activeJourneyId]||null;
  const language=()=>String(window.LullabyI18n?.language||document.documentElement.lang||'en').trim();
  const languageBase=()=>language().toLowerCase().split('-')[0];
  const korean=()=>languageBase()==='ko';
  const local=value=>value[korean()?1:0];
  const phaseName=value=>{
    if(!Array.isArray(value))return String(value??'');
    const lang=language(),base=languageBase();
    if(base==='ko')return value[1]||value[0]||'';
    if(base==='en')return value[0]||value[1]||'';
    const translated=window.LullabyCatalogI18n?.phaseName?.(value[0],lang);
    return translated||value[0]||value[1]||'';
  };
  function boundaries(total,cfg){
    if(total<1200000)return{departure:total*.06,settle:total*.18,approach:total*.82,arrival:total*.94};
    return{departure:cfg.durations[0],settle:cfg.durations[1],approach:total-cfg.durations[2],arrival:total-cfg.durations[3]};
  }
  function phaseInfo(ms,total,cfg=config()){
    if(!cfg)return null;const b=boundaries(total,cfg);
    if(ms<b.departure)return[cfg.phases[0],false,'departure'];if(ms<b.settle)return[cfg.phases[1],false,'bed'];if(ms<b.approach)return[cfg.phases[2],false,'bed'];if(ms<b.arrival)return[cfg.phases[3],false,'bed'];if(ms<total)return[cfg.phases[4],false,'arrival'];return[['Arrived','도착'],false,null];
  }
  function phaseIndex(ms,total,cfg){const b=boundaries(total,cfg);if(ms<b.departure)return 0;if(ms<b.settle)return 1;if(ms<b.approach)return 2;if(ms<b.arrival)return 3;return ms<total?4:5}
  function stagePoints(total,cfg=config()){if(!cfg)return[];const b=boundaries(total,cfg),label=value=>[phaseName(value),phaseName(value)];return[{label:label(cfg.phases[0]),ms:0},{label:label(cfg.phases[1]),ms:b.departure},{label:label(cfg.phases[2]),ms:b.settle},{label:label(cfg.phases[3]),ms:b.approach},{label:label(cfg.phases[4]),ms:b.arrival}]}
  function transitionProfile(ms,total,cfg=config()){return cfg?.fx[Math.min(4,phaseIndex(ms,total,cfg))]||null}
  function audioRoleFor(ms,total,cfg){
    if(ms>=total)return null;const b=boundaries(total,cfg),departureFade=cfg.bedStartsAtPhaseBoundary?0:Math.min(cfg.fx[1].roleFadeSeconds*1000,b.departure);
    if(ms>=b.arrival-cfg.fx[4].roleFadeSeconds*1000)return'arrival';if(ms>=b.departure-departureFade)return'bed';return'departure';
  }
  async function ensureNodes(){
    const cfg=config();if(!cfg)return;await ensureContext();media[cfg.title[0]]??={};const bucket=media[cfg.title[0]];
    for(const [key,[url,duration]] of Object.entries(cfg.nodes))if(!bucket[key]){const loop=key!=='departure'&&key!=='arrival'&&key!=='transition',node=loop?makeCrossfadeLoopNode(url,{durationSeconds:duration,fadeSeconds:8}):makeMediaNode(url,{loop:false,preload:'auto'});if(activeJourneyId==='forest_temple_journey'&&key==='bowl'){const panner=ctx.createStereoPanner?.();if(panner){node.filter.disconnect();node.filter.connect(panner).connect(node.gain);panner.pan.value=0;node.panner=panner}}node.gain.gain.value=0;bucket[key]=node}
    if(cfg.event&&!eventNodes[activeJourneyId]){
      const bucket={};
      if(cfg.event.sources)for(const[key,[url]]of Object.entries(cfg.event.sources)){
        const poolSize=activeJourneyId==='hood_journey'?(key==='gunshot'?8:key==='gunShotgun'?3:1):1;
        const pool=Array.from({length:poolSize},()=>{const node=makeMediaNode(url,{loop:false,preload:'none'}),panner=ctx.createStereoPanner?.();if(panner){node.filter.disconnect();node.filter.connect(panner).connect(node.gain);node.panner=panner}node.gain.gain.value=0;return node});
        bucket[key]=poolSize===1?pool[0]:pool;
      }
      else{bucket.primary=makeMediaNode(cfg.event.url,{loop:false,preload:'none'});bucket.primary.gain.gain.value=cfg.event.gain??.08}
      eventNodes[activeJourneyId]=bucket;
    }
    if(activeJourneyId==='forest_temple_journey')prepareTempleRoomFx();
  }
  function activeNodes(){const cfg=config();return cfg?media[cfg.title[0]]||{}:{}}
  let templeRoomImpulse=null;
  function createTempleRoomImpulse(audioCtx,seconds=2.8,decay=2.45){
    const length=Math.max(1,Math.floor(audioCtx.sampleRate*seconds)),buffer=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<length;i++){const t=1-i/length;data[i]=(Math.random()*2-1)*Math.pow(t,decay)*(0.82+0.18*Math.sin(i*0.017+channel))}}
    return buffer;
  }
  function attachTempleRoomFx(node){
    if(!node||node.__lullabyDebugTempleRoomFx||!ctx||!master)return;
    templeRoomImpulse??=createTempleRoomImpulse(ctx);
    const preDelay=ctx.createDelay(.2);preDelay.delayTime.value=.055;
    const reverbTone=ctx.createBiquadFilter();reverbTone.type='lowpass';reverbTone.frequency.value=5000;reverbTone.Q.value=.35;
    const convolver=ctx.createConvolver();convolver.buffer=templeRoomImpulse;
    const reverbWet=ctx.createGain();reverbWet.gain.value=.50;
    const echoDelay=ctx.createDelay(1);echoDelay.delayTime.value=.41;
    const echoTone=ctx.createBiquadFilter();echoTone.type='lowpass';echoTone.frequency.value=4800;
    const echoWet=ctx.createGain();echoWet.gain.value=.065;
    const echoFeedback=ctx.createGain();echoFeedback.gain.value=.10;
    node.gain.connect(preDelay).connect(reverbTone).connect(convolver).connect(reverbWet).connect(master);
    node.gain.connect(echoDelay);echoDelay.connect(echoTone).connect(echoWet).connect(master);echoDelay.connect(echoFeedback).connect(echoDelay);
    node.__lullabyDebugTempleRoomFx={preDelay,reverbTone,convolver,reverbWet,echoDelay,echoTone,echoWet,echoFeedback};
  }
  function prepareTempleRoomFx(){
    if(activeJourneyId!=='forest_temple_journey')return;const events=eventNodes[activeJourneyId];attachTempleRoomFx(events?.heartSutra);attachTempleRoomFx(events?.moktak);
  }
  function pauseEvent(){for(const timer of eventTimers)clearTimeout(timer);eventTimers.clear();eventLabelUntil=0;currentEventLabel=null;for(const bucket of Object.values(eventNodes))for(const entry of Object.values(bucket))for(const node of(Array.isArray(entry)?entry:[entry])){node.el.pause();node.gain.gain.value=0;try{node.el.currentTime=0}catch{}}}
  function pauseNodes(reset=false){pauseEvent();for(const bucket of Object.values(media))for(const node of Object.values(bucket)){node.el.pause();node.gain.gain.value=0;if(reset)try{node.el.currentTime=0}catch{}}}
  function offset(key,role,ms,total,cfg){const b=boundaries(total,cfg),start=role==='arrival'?b.arrival:role==='bed'?b.departure:0;return Math.max(0,(ms-start)/1000)%cfg.nodes[key][1]}
  async function activateRole(role,ms,total,fadeSeconds){
    const cfg=config();if(!cfg||role===audibleRole)return;
    const generation=++roleGeneration,previous=audibleRole,nodes=activeNodes();audibleRole=role;
    if(previous&&previous!==role)for(const key of cfg.roles[previous]){if(cfg.roles[role]?.includes(key))continue;const old=nodes[key];old?.gain.gain.setTargetAtTime(0,ctx.currentTime,fadeSeconds/3);setTimeout(()=>{if(!cfg.roles[audibleRole]?.includes(key))old?.el.pause()},fadeSeconds*1000)}
    if(!role||!scenePlaying)return;
    for(const key of cfg.roles[role]){const node=nodes[key];if(previous&&cfg.roles[previous]?.includes(key)&&!node.el.paused)continue;node.el.preload='auto';try{node.el.currentTime=offset(key,role,ms,total,cfg)}catch{}await node.el.play();if(generation!==roleGeneration&&!cfg.roles[audibleRole]?.includes(key))node.el.pause()}
  }
  function updateAudio(ms){
    const cfg=config();if(!cfg||!ctx)return;const total=Math.max(60000,durationMinutes*60000),stage=phaseIndex(ms,total,cfg),role=audioRoleFor(ms,total,cfg),roleChanged=role!==audibleRole,fx=transitionProfile(ms,total,cfg),fadeSeconds=role==='bed'?cfg.fx[1].roleFadeSeconds:role==='arrival'?cfg.fx[4].roleFadeSeconds:fx.roleFadeSeconds;
    if(activeJourneyId==='forest_temple_journey'){const entered=stage!==templePhaseIndex;templePhaseIndex=stage;if(entered&&stage===2&&scenePlaying)forceTempleStageThreeSutra()}else templePhaseIndex=-1;
    void activateRole(role,ms,total,fadeSeconds).catch(console.error);
    const factor=(.88+.18*macro.engine)*(.96+.05*macro.activity)*(.96+.04*macro.turbulence)*(1-.08*macro.night);
    for(const [key,node] of Object.entries(activeNodes())){const on=role&&cfg.roles[role].includes(key),gain=on?(activeJourneyId==='forest_temple_journey'&&key==='bowl'?cfg.gains[key]:cfg.gains[key]*(role==='bed'?factor:1)*fx.gain):0;node.gain.gain.setTargetAtTime(gain,ctx.currentTime,(roleChanged?fadeSeconds:fx.gainSeconds)/3);const templeCutoff=key==='birds'?4800:key==='bowl'?4400:fx.cutoff;node.filter.frequency.setTargetAtTime(activeJourneyId==='forest_temple_journey'?templeCutoff:fx.cutoff,ctx.currentTime,fx.filterSeconds/3);if(node.panner&&key==='bowl')node.panner.pan.setTargetAtTime(0,ctx.currentTime,1.2)}
    const eventNode=eventNodes[activeJourneyId]?.primary;if(eventNode)eventNode.gain.gain.setTargetAtTime((cfg.event.gain??.08)*(.65+.35*macro.activity)*(1-.08*macro.night),ctx.currentTime,.5);
  }
  function later(callback,delay){const timer=setTimeout(()=>{eventTimers.delete(timer);callback()},delay);eventTimers.add(timer);return timer}
  const random=(min,max)=>min+Math.random()*(max-min);
  const randomInt=(min,maxExclusive)=>Math.floor(random(min,maxExclusive));
  const hoodGuns=['gunshot','gunShotgun'],hoodVoices=['shout','shoutMale','screamShort','screamCrowd'],hoodSirens=['siren','sirenAlt1','sirenAlt2'];
  const hoodLabels={gunshot:['Distant gunfire','먼 총격'],gunShotgun:['Distant shotgun','먼 산탄총 사격'],siren:['Police siren','경찰 사이렌'],sirenAlt1:['Police siren','경찰 사이렌'],sirenAlt2:['Police siren','경찰 사이렌'],glass:['Breaking glass','유리 파손'],shout:['Distant shouting','먼 고함'],shoutMale:['Distant shouting','먼 고함'],screamShort:['Distant scream','먼 비명'],screamCrowd:['Distant screams','먼 비명'],footsteps:['Footsteps','발소리'],carPass:['Passing car','지나가는 차량'],carDoor:['Car door','차 문'],helicopter:['Helicopter','헬리콥터'],dog:['Dog barking','개 짖는 소리']};
  const templeLabels={moktak:['Wooden moktak','목탁'],gravel:['Slow distant gravel footsteps','멀리 저벅이는 자갈 발소리'],heartSutra:['Heart Sutra · Korean','반야심경 · 한국어 독송']};
  const templeEventTypes=['moktak','gravel','moktak','gravel','heartSutra'];
  function hoodEventNode(type){
    const entry=eventNodes.hood_journey?.[type];if(!entry)return null;if(!Array.isArray(entry))return entry;
    const index=(hoodVoiceCursor[type]||0)%entry.length;hoodVoiceCursor[type]=index+1;return entry[index];
  }
  async function playHoodEvent(type,distance=Math.random(),panOverride=null,target=null){
    if(activeJourneyId!=='hood_journey'||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;const node=hoodEventNode(type);if(!node)return;const gun=hoodGuns.includes(type),voice=hoodVoices.includes(type),sirenType=hoodSirens.includes(type),minimumDistance=sirenType?.62:gun?.70:type==='glass'?.68:voice?.58:0,d=Math.max(minimumDistance,Math.min(1,distance)),close=1-d,base=gun?.13:voice?.12:sirenType?.12:{glass:.10,footsteps:.08,carPass:.12,carDoor:.10,helicopter:.09,dog:.18}[type]||.1,range=gun?.20:voice?.18:sirenType?.34:{glass:.18,footsteps:.11,carPass:.18,carDoor:.17,helicopter:.13,dog:.22}[type]||.15;
    const clamp=value=>Math.max(-1,Math.min(1,value)),startPan=panOverride==null?random(-.85,.85):clamp(panOverride),targetDistance=Math.max(minimumDistance,Math.min(1,target?.distance??d)),targetClose=1-targetDistance,targetPan=clamp(target?.pan??startPan),endDistance=Math.max(minimumDistance,Math.min(1,target?.endDistance??targetDistance)),endClose=1-endDistance,endPan=clamp(target?.endPan??targetPan),duration=(config().event.sources[type]?.[1]||2500)/1000,passAt=duration*.40,farAt=duration*.78,frequency=sirenType?2200+close*4300:(gun||voice?2600:3200)+close*(gun||voice?5200:10800),targetFrequency=sirenType?2200+targetClose*4300:frequency,endFrequency=sirenType?2200+endClose*4300:frequency,factor=.78+.35*macro.activity,gain=(sirenType?.08+close*.22:base+close*range)*factor,targetGain=(sirenType?.10+targetClose*.65:base+targetClose*range)*factor,endGain=(sirenType?.04+endClose*.10:base+endClose*range)*factor;
    node.filter.frequency.cancelScheduledValues(ctx.currentTime);node.filter.frequency.setValueAtTime(frequency,ctx.currentTime);node.gain.gain.cancelScheduledValues(ctx.currentTime);node.gain.gain.setValueAtTime(gain,ctx.currentTime);if(sirenType&&target){node.filter.frequency.linearRampToValueAtTime(targetFrequency,ctx.currentTime+passAt);node.filter.frequency.linearRampToValueAtTime(endFrequency,ctx.currentTime+farAt);node.gain.gain.linearRampToValueAtTime(targetGain,ctx.currentTime+passAt);node.gain.gain.linearRampToValueAtTime(endGain,ctx.currentTime+farAt)}if(node.panner){const direction=Math.random()<.5?-1:1;node.panner.pan.cancelScheduledValues(ctx.currentTime);node.panner.pan.setValueAtTime(type==='carPass'?0.92*direction:startPan,ctx.currentTime);if(type==='carPass')node.panner.pan.linearRampToValueAtTime(-.92*direction,ctx.currentTime+6.25);else if(sirenType&&target){node.panner.pan.linearRampToValueAtTime(targetPan,ctx.currentTime+passAt);node.panner.pan.linearRampToValueAtTime(endPan,ctx.currentTime+farAt)}}try{node.el.currentTime=0;if(sirenType&&target){node.el.preservesPitch=false;node.el.playbackRate=1.08}currentEventLabel=hoodLabels[type];eventLabelUntil=performance.now()+(config().event.sources[type]?.[1]||2500);await node.el.play();if(sirenType&&target){later(()=>{if(!node.el.paused)node.el.playbackRate=1},passAt*1000);later(()=>{if(!node.el.paused)node.el.playbackRate=.93},farAt*1000);document.dispatchEvent(new CustomEvent('lullaby-hood-siren',{detail:{distance:d,durationMs:duration*1000,direction:endPan>=startPan?1:-1}}))}}catch(error){console.warn(`hood ${type} unavailable`,error)}
  }
  function startHoodFight(intensity){
    const centerPan=random(-.62,.62),separation=random(.12,.24),baseDistance=random(.72,.92),left={distance:Math.min(1,baseDistance+random(-.03,.04)),pan:Math.max(-.82,centerPan-separation/2)},right={distance:Math.min(1,baseDistance+random(-.03,.04)),pan:Math.min(.82,centerPan+separation/2)};
    const basicShotCount=intensity>=.78?randomInt(6,9):intensity>=.52?randomInt(3,7):randomInt(3,6);
    const shotgunCount=intensity>=.78?randomInt(1,4):intensity>=.52?randomInt(1,3):1;
    let elapsed=random(120,481),basicRemaining=basicShotCount,shotgunRemaining=shotgunCount,volley=0,lastGunSide=left;
    while(basicRemaining>0){
      const side=volley++%2?right:left,groupSize=randomInt(1,Math.min(3,basicRemaining)+1);lastGunSide=side;
      for(let shot=0;shot<groupSize;shot++){
        const at=elapsed;later(()=>void playHoodEvent('gunshot',Math.min(1,side.distance+random(-.04,.08)),side.pan+random(-.10,.10)),at);
        basicRemaining--;if(basicRemaining>0)elapsed+=random(260,561);
      }
      if(shotgunRemaining>0&&(Math.random()<.58||basicRemaining===0)){
        elapsed+=random(520,1101);const at=elapsed;later(()=>void playHoodEvent('gunShotgun',Math.min(1,side.distance+random(0,.10)),side.pan+random(-.09,.09)),at);shotgunRemaining--;
      }
      if(basicRemaining>0)elapsed+=random(900,2201);
    }
    while(shotgunRemaining>0){
      elapsed+=random(900,1901);const side=volley++%2?right:left,at=elapsed;lastGunSide=side;later(()=>void playHoodEvent('gunShotgun',side.distance,side.pan),at);shotgunRemaining--;
    }
    const lastGunshotMs=elapsed;
    if(Math.random()<.60){const type=hoodVoices[randomInt(0,hoodVoices.length)],at=lastGunshotMs+random(450,1801);later(()=>void playHoodEvent(type,Math.min(1,lastGunSide.distance+random(-.02,.08)),lastGunSide.pan+random(-.08,.08)),at)}
    const sirenCount=randomInt(1,4),responseAt=lastGunshotMs+random(18000,115001);let convoyOffset=0;for(let index=0;index<sirenCount;index++){if(index)convoyOffset+=random(900,2601);const targetPan=Math.max(-.88,Math.min(.88,lastGunSide.pan+random(-.10,.10))),targetDistance=Math.max(.68,Math.min(.92,lastGunSide.distance+random(0,.08))),startPan=targetPan>=0?random(-.96,-.72):random(.72,.96),endPan=startPan<targetPan?random(.82,.98):random(-.98,-.82);later(()=>void playHoodEvent(hoodSirens[index],random(.96,1),startPan,{pan:targetPan,distance:targetDistance,endPan,endDistance:random(.97,1)}),responseAt+convoyOffset)}
  }
  function scheduleHoodEvent(delayMs){const cfg=config(),id=activeJourneyId,event=cfg?.event;if(id!=='hood_journey'||!event)return;later(()=>{if(activeJourneyId!==id||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;const index=phaseIndex(currentElapsed(),Math.max(60000,durationMinutes*60000),cfg);if(!event.phases.includes(index)){scheduleHoodEvent(90000);return}const intensity=.35+.65*macro.turbulence;if(Math.random()<.26+.18*intensity)startHoodFight(intensity);else{const calm=['footsteps','carDoor','dog','dog','helicopter','glass'],type=calm[Math.floor(Math.random()*calm.length)];void playHoodEvent(type,random(type==='glass'?.68:type==='dog'?.45:.25,type==='dog'?.96:1))}scheduleHoodEvent(random(event.minMs,event.maxMs))},delayMs??random(event.minMs,event.maxMs))}
  function scheduleHoodTraffic(delayMs=random(75000,260000)){const cfg=config(),id=activeJourneyId;if(id!=='hood_journey'||!cfg?.event)return;later(()=>{if(activeJourneyId!==id||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;const index=phaseIndex(currentElapsed(),Math.max(60000,durationMinutes*60000),cfg);if(cfg.event.phases.includes(index))void playHoodEvent('carPass',random(.12,.88));scheduleHoodTraffic()},delayMs)}
  async function playTempleEventNow(type,{resumeRandom=false}={}){
    const cfg=config(),id=activeJourneyId,event=cfg?.event;if(id!=='forest_temple_journey'||event?.sequence!=='temple')return false;
    const node=eventNodes[id]?.[type],source=event.sources[type];if(!node||!source)return false;
    for(const other of Object.values(eventNodes[id]||{})){other.el.pause();other.gain.gain.cancelScheduledValues(ctx.currentTime);other.gain.gain.setValueAtTime(0,ctx.currentTime);try{other.el.currentTime=0}catch{}}
    const durationMs=source[1],sutra=type==='heartSutra',fromTemple=sutra||type==='moktak';
    node.filter.frequency.setValueAtTime(sutra?6100:type==='gravel'?5200:7200,ctx.currentTime);
    node.gain.gain.setValueAtTime(sutra?.157:type==='gravel'?.075:.09,ctx.currentTime);
    if(node.panner)node.panner.pan.setValueAtTime(fromTemple?.48:random(-.28,.28),ctx.currentTime);
    currentEventLabel=templeLabels[type];eventLabelUntil=performance.now()+durationMs;node.el.currentTime=0;await node.el.play();
    if(resumeRandom&&window.LullabyJourneyEvents?.enabled)later(()=>scheduleTempleEvent(),durationMs);
    return true;
  }
  function forceTempleStageThreeSutra(){
    if(templeStageThreeStarting||activeJourneyId!=='forest_temple_journey'||!scenePlaying)return;
    templeStageThreeStarting=true;for(const timer of eventTimers)clearTimeout(timer);eventTimers.clear();
    void playTempleEventNow('heartSutra',{resumeRandom:true}).catch(error=>console.warn('stage 3 Heart Sutra unavailable',error)).finally(()=>{templeStageThreeStarting=false});
  }
  function scheduleTempleEvent(delayMs){const cfg=config(),id=activeJourneyId,event=cfg?.event;if(id!=='forest_temple_journey'||event?.sequence!=='temple')return;later(async()=>{if(activeJourneyId!==id||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;const index=phaseIndex(currentElapsed(),Math.max(60000,durationMinutes*60000),cfg);if(!event.phases.includes(index)){scheduleTempleEvent(90000);return}const available=templeEventTypes.filter(type=>event.sources[type]&&eventNodes[id]?.[type]);if(!available.length)return;const type=available[randomInt(0,available.length)],node=eventNodes[id][type],durationMs=event.sources[type][1],sutra=type==='heartSutra',fromTemple=sutra||type==='moktak';try{node.el.currentTime=0;node.filter.frequency.setValueAtTime(sutra?6100:type==='gravel'?5200:7200,ctx.currentTime);node.gain.gain.setValueAtTime(sutra?.157:type==='gravel'?.075:.09,ctx.currentTime);if(node.panner)node.panner.pan.setValueAtTime(fromTemple?.48:random(-.28,.28),ctx.currentTime);currentEventLabel=templeLabels[type];eventLabelUntil=performance.now()+durationMs;await node.el.play()}catch(error){console.warn(`temple ${type} unavailable`,error)}later(()=>scheduleTempleEvent(),durationMs)},delayMs??random(event.minMs,event.maxMs))}
  function scheduleEvent(delayMs){const cfg=config();if(!cfg?.event||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;if(cfg.event.sequence==='hood'){scheduleHoodEvent(delayMs);scheduleHoodTraffic(delayMs==null?random(45000,120000):Math.max(15000,delayMs*.72));return}if(cfg.event.sequence==='temple'){scheduleTempleEvent(delayMs);return}const id=activeJourneyId,event=cfg.event,delay=delayMs??event.minMs+Math.random()*(event.maxMs-event.minMs);later(async()=>{if(activeJourneyId!==id||!scenePlaying||!window.LullabyJourneyEvents?.enabled)return;const index=phaseIndex(currentElapsed(),Math.max(60000,durationMinutes*60000),cfg);if(!event.phases.includes(index)){scheduleEvent(90000);return}try{const node=eventNodes[id]?.primary;node.el.currentTime=0;eventLabelUntil=performance.now()+event.durationMs;await node.el.play()}catch(error){console.warn(`${id} event unavailable`,error)}scheduleEvent()},delay)}
  function updateUi(){
    const cfg=config(),elapsed=currentElapsed(),total=durationMinutes*60000,remaining=Math.max(0,total-elapsed),info=phaseInfo(elapsed,total,cfg),phase=phaseName(info[0]);
    const eventLabel=!window.LullabyJourneyEvents?.enabled?(korean()?'꺼짐':'Off'):performance.now()<eventLabelUntil?local(currentEventLabel||cfg.event.label):local(cfg.detail),values={phaseLabel:phase,elapsedLabel:fmt(elapsed,true),remainingLabel:fmt(remaining),seatbeltLabel:korean()?'운행 중':'In motion',eventLabel};
    for(const [id,value] of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}const progress=document.getElementById('journeyProgress');if(progress)progress.style.width=`${Math.min(100,elapsed/total*100)}%`;
    const track=document.querySelector('.journey-track');if(track){track.setAttribute('aria-valuenow',String(Math.round(elapsed/1000)));track.setAttribute('aria-valuetext',`${phase} · ${fmt(elapsed,true)}`)}
    updateAudio(elapsed);window.LullabyJourneyStageControl?.sync();updateNowPlaying();if(elapsed>=total)stopScene(true);
  }
  async function start(){try{await ensureNodes();if(scenePlaying){pause();return}sceneStartedAt=performance.now();scenePlaying=true;updateAudio(currentElapsed());scheduleEvent();if(playButton)playButton.textContent=korean()?'Ⅱ 일시정지':'Ⅱ Pause';setStatus(`${local(config().title)} ${korean()?'재생 중':'playing'}`);clearInterval(sceneTimer);sceneTimer=setInterval(updateSceneUi,1000);updateSceneUi()}catch(error){console.error(error);scenePlaying=false;roleGeneration++;pauseNodes();audibleRole=null;setStatus(korean()?'여정 오디오를 시작하지 못했습니다.':'Could not start journey audio.') }}
  function pause(){if(!scenePlaying)return;pausedAt=currentElapsed();scenePlaying=false;roleGeneration++;pauseNodes();audibleRole=null;clearInterval(sceneTimer);if(playButton)playButton.textContent=korean()?'▶ 계속 재생':'▶ Resume';setStatus(korean()?'일시정지됨':'Paused');updateNowPlaying()}
  function stop(arrived=false){scenePlaying=false;pausedAt=0;templePhaseIndex=-1;templeStageThreeStarting=false;clearInterval(sceneTimer);roleGeneration++;pauseNodes(true);audibleRole=null;if(playButton)playButton.textContent=korean()?'▶ 장면 시작':'▶ Start journey';const cfg=config(),values={phaseLabel:arrived?(korean()?'도착':'Arrived'):'Ready',elapsedLabel:'00:00',remainingLabel:fmt(durationMinutes*60000),seatbeltLabel:'—',eventLabel:window.LullabyJourneyEvents?.enabled&&cfg?local(cfg.detail):(korean()?'꺼짐':'Off')};for(const[id,value]of Object.entries(values)){const el=document.getElementById(id);if(el)el.textContent=value}const progress=document.getElementById('journeyProgress');if(progress)progress.style.width='0';setStatus(arrived?(korean()?'여정이 종료되었습니다.':'Journey complete.'):(korean()?'정지됨':'Stopped'));updateNowPlaying()}
  startScene=async function(){return config()?start():base.start()};pauseScene=function(){return config()?pause():base.pause()};stopScene=function(arrived=false){return config()?stop(arrived):base.stop(arrived)};phaseFor=function(ms,total){const info=phaseInfo(ms,total);return info?[phaseName(info[0]),false]:base.phaseFor(ms,total)};updateSceneAudio=function(ms){return config()?updateAudio(ms):base.updateAudio(ms)};updateSceneUi=function(){return config()?updateUi():base.updateUi()};if(playButton)playButton.addEventListener('click',startScene);
  function step(direction){const cfg=config(),total=Math.max(60000,durationMinutes*60000),b=boundaries(total,cfg),steps=[0,b.departure,b.settle,b.approach,b.arrival,total-1],elapsed=currentElapsed();let index=steps.findIndex(value=>value>elapsed+500);if(direction<0){index=-1;for(let i=steps.length-1;i>=0;i--)if(steps[i]<elapsed-500){index=i;break}}if(index<0)index=direction<0?0:steps.length-1;(window.LullabyJourneyRuntime?.transitionToMs||window.LullabyJourneyRuntime?.seekToMs)?.(steps[index])}
  document.addEventListener('click',event=>{if(!config()||(event.target?.id!=='journeyPrevPhase'&&event.target?.id!=='journeyNextPhase'))return;event.preventDefault();event.stopImmediatePropagation();step(event.target.id==='journeyPrevPhase'?-1:1)},true);
  function addSelectors(){const row=document.getElementById('journeySelector');if(!row)return;for(const id of['spacecraft_journey','ferry_journey','submarine_journey','forest_temple_journey','hood_journey']){const cfg=configs[id],button=document.createElement('button');button.type='button';button.dataset.journey=id;button.innerHTML=`${cfg.icon} <span>${cfg.title[0].split(' ')[0]}</span>`;row.appendChild(button)}row.addEventListener('click',event=>{if(event.target.closest('[data-journey]'))render()})}
  function render(){const labels={ferry_journey:['Ferry','페리'],spacecraft_journey:['Spacecraft','우주선'],submarine_journey:['Submarine','잠수함'],forest_temple_journey:['Temple','숲속 절'],hood_journey:['HOOD','HOOD']};for(const[id,value]of Object.entries(labels)){const span=document.querySelector(`[data-journey="${id}"] span`);if(span)span.textContent=local(value)}const cfg=config();if(!cfg)return;document.body.classList.toggle('journey-hood-active',activeJourneyId==='hood_journey');document.querySelectorAll('[data-journey]').forEach(button=>{button.classList.toggle('active',button.dataset.journey===activeJourneyId);button.setAttribute('aria-pressed',String(button.dataset.journey===activeJourneyId))});const title=document.querySelector('.aircraft-title-row h3'),desc=document.querySelector('.aircraft-title-row p'),icon=document.querySelector('.aircraft-icon');if(title)title.textContent=local(cfg.title);if(desc)desc.textContent=local(cfg.description);if(icon)icon.textContent=cfg.icon;document.querySelectorAll('[data-inspector-mode="journey"] h3').forEach(el=>el.textContent=local(cfg.title));const status=document.querySelectorAll('.journey-status small');if(status[0])status[0].textContent=korean()?'여정 단계':'Journey phase';if(status[3])status[3].textContent=activeJourneyId==='hood_journey'?(korean()?'거리 상태':'Street state'):activeJourneyId==='forest_temple_journey'?(korean()?'절의 기척':'Temple ambience'):(korean()?'객실 상태':'Cabin state');document.querySelectorAll('.mobile-macros label span,.desktop-macros label span').forEach((el,index)=>el.textContent=local(cfg.macros[index%4]));const event=document.getElementById('eventLabel');if(event)event.textContent=window.LullabyJourneyEvents?.enabled?local(cfg.detail):(korean()?'꺼짐':'Off');if(!scenePlaying&&pausedAt===0){if(playButton)playButton.textContent=korean()?'▶ 장면 시작':'▶ Start journey';document.getElementById('phaseLabel').textContent=korean()?'준비':'Ready'}window.LullabyJourneyStageControl?.render()}
  async function debugTriggerEvent(type='random'){
    const cfg=config();if(!cfg)throw new Error('Select Ferry, Spacecraft, Submarine, Forest Temple, or HOOD first.');
    if(!window.LullabyJourneyEvents?.enabled)window.LullabyJourneyEvents?.setEnabled(true);
    if(!scenePlaying)await start();else await ensureNodes();
    if(activeJourneyId==='hood_journey'){
      if(type==='fight'){startHoodFight(.8);return'HOOD gunfight'}
      if(type!=='random'){if(type==='siren'){const startPan=random(-.96,-.72),targetPan=random(-.55,.55);await playHoodEvent(type,random(.96,1),startPan,{pan:targetPan,distance:random(.68,.84),endPan:random(.82,.98),endDistance:random(.97,1)})}else await playHoodEvent(type,random(type==='glass'?.68:type==='dog'?.45:.58,type==='dog'?.96:1));return local(hoodLabels[type]||[type,type])}
      const intensity=.35+.65*macro.turbulence;if(Math.random()<.55){startHoodFight(intensity);return'HOOD random fight'}
      const calm=['footsteps','carPass','carDoor','dog','dog','helicopter','glass'],picked=calm[randomInt(0,calm.length)];await playHoodEvent(picked,random(picked==='carPass'?.18:picked==='glass'?.68:picked==='dog'?.45:.58,picked==='dog'?.96:1));return local(hoodLabels[picked])
    }
    if(activeJourneyId==='forest_temple_journey'){
      const available=templeEventTypes.filter(candidate=>cfg.event.sources[candidate]&&eventNodes[activeJourneyId]?.[candidate]);if(!available.length)throw new Error('Forest Temple event sources are unavailable.');
      const picked=type==='random'?available[randomInt(0,available.length)]:type;if(!available.includes(picked))throw new Error(`Unknown Forest Temple event: ${type}`);
      for(const node of Object.values(eventNodes[activeJourneyId])){node.el.pause();node.el.currentTime=0}
      const node=eventNodes[activeJourneyId][picked],sutra=picked==='heartSutra',fromTemple=sutra||picked==='moktak';node.filter.frequency.setValueAtTime(sutra?6100:picked==='gravel'?5200:7200,ctx.currentTime);node.gain.gain.setValueAtTime(sutra?.157:picked==='gravel'?.075:.09,ctx.currentTime);if(node.panner)node.panner.pan.setValueAtTime(fromTemple?.48:random(-.28,.28),ctx.currentTime);currentEventLabel=templeLabels[picked];eventLabelUntil=performance.now()+cfg.event.sources[picked][1];await node.el.play();updateUi();return local(templeLabels[picked])
    }
    const node=eventNodes[activeJourneyId]?.primary;if(!node)throw new Error('Random event source is not ready.');
    node.el.currentTime=0;currentEventLabel=cfg.event.label;eventLabelUntil=performance.now()+cfg.event.durationMs;await node.el.play();updateUi();return local(cfg.event.label);
  }
  addSelectors();window.LullabyRemainingJourneys={configs,stagePoints,transitionProfile,audioRoleFor,get active(){return activeJourneyId},get audibleRole(){return audibleRole},get activeNodes(){return activeNodes()},get eventNode(){return eventNodes[activeJourneyId]?.primary||eventNodes[activeJourneyId]||null},ensureNodes,triggerEvent:debugTriggerEvent};render();document.addEventListener('lullaby-language-changed',()=>queueMicrotask(render));document.addEventListener('lullaby-journey-events-changed',event=>{if(!event.detail?.enabled)pauseEvent();else if(scenePlaying&&config())scheduleEvent();if(config()){if(scenePlaying)updateUi();else{const label=document.getElementById('eventLabel');if(label)label.textContent=event.detail?.enabled?local(config().detail):(korean()?'꺼짐':'Off')}}});
})();
