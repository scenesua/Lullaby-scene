const translations={ko:{navScenes:'Scenes',navHow:'작동 방식',navDownload:'다운로드',eyebrow:'A living place to fall asleep in',heroTitle:'잠드는 동안<br>장면은 계속 살아있습니다.',heroLead:'짧은 루프를 반복하는 대신, Lullaby Scene은 당신이 정한 수면 시간 안에서 소리와 사건을 천천히 변화시킵니다.',downloadAndroid:'Android 테스트 빌드',exploreScenes:'씬 둘러보기',heroNote:'Android 프리릴리즈 제공 중 · Web Player는 개발 중',sceneEyebrow:'Living scenes',sceneTitle:'어디에서 잠들고 싶나요?',sceneLead:'각 씬은 자신만의 시간표와 랜덤 이벤트, 공간감을 가집니다. 수면을 방해할 수 있는 이벤트는 입면기와 초기 수면에서 자동으로 억제됩니다.',availableNow:'AVAILABLE IN PREVIEW',planned:'PLANNED',aircraftDesc:'출발, 이륙, 긴 순항, 하강과 도착이 당신의 전체 수면 시간에 맞춰 이어지는 야간 여객기 장면.',trainDesc:'장거리 야간열차의 레일 소리와 빗소리, 드문 정차 이벤트가 이어지는 수면 여정.',cabinDesc:'창밖의 폭풍은 멀고, 실내의 작은 소리와 벽난로는 가까운 공간 중심의 장면.',howEyebrow:'Not a playlist',howTitle:'시간을 재생하는 사운드스케이프.',feature1Title:'전체 수면 시간을 먼저',feature1Body:'8시간이면 8시간짜리 장면을 만듭니다. 고정 구간은 그대로 두고 긴 중간 구간이 자연스럽게 늘어납니다.',feature2Title:'씬마다 다른 사건',feature2Body:'비행기의 이륙과 착륙, 열차의 정차처럼 고정 이벤트는 각 씬 전용 타임라인이 관리합니다.',feature3Title:'수면을 보호하는 랜덤',feature3Body:'각성도 높은 이벤트는 잠들기 직전과 초기 수면에 몰리지 않도록 빈도와 강도를 제한합니다.',feature4Title:'공간까지 하나의 장면으로',feature4Body:'거리, 고역 감쇠, 톤과 움직임이 씬 상태와 매크로 컨트롤에 따라 함께 변합니다.',platformEyebrow:'Local first',platformTitle:'잠은 네트워크 상태를 기다리지 않습니다.',platformBody:'Android 앱은 백그라운드 재생을 중심으로 개발되고 있으며, 웹은 설치 가능한 PWA와 Web Audio 기반 플레이어로 확장할 예정입니다.',viewReleases:'GitHub Releases',installSite:'웹 앱 설치',footerTagline:'Living soundscapes for sleep.',privacy:'개인정보 처리방침',terms:'이용약관'},en:{navScenes:'Scenes',navHow:'How it works',navDownload:'Download',eyebrow:'A living place to fall asleep in',heroTitle:'The scene keeps living<br>while you fall asleep.',heroLead:'Instead of repeating a short loop, Lullaby Scene slowly changes sound and events across the sleep duration you choose.',downloadAndroid:'Android preview build',exploreScenes:'Explore scenes',heroNote:'Android prerelease available · Web Player in development',sceneEyebrow:'Living scenes',sceneTitle:'Where do you want to fall asleep?',sceneLead:'Every scene owns its own timeline, random events and sense of space. Potentially disruptive events are automatically suppressed around sleep onset and early sleep.',availableNow:'AVAILABLE IN PREVIEW',planned:'PLANNED',aircraftDesc:'An overnight passenger-aircraft scene whose departure, long cruise, descent and arrival fit your total sleep duration.',trainDesc:'A long overnight rail journey with track texture, rain and occasional station events.',cabinDesc:'A space-focused scene with a distant storm outside and smaller fireplace and cabin details close by.',howEyebrow:'Not a playlist',howTitle:'A soundscape that plays time.',feature1Title:'Start with the whole sleep window',feature1Body:'Choose eight hours and the scene becomes an eight-hour journey. Fixed phases stay bounded while the long middle stretches naturally.',feature2Title:'Events belong to their scene',feature2Body:'Takeoff and landing belong to Aircraft. Station stops belong to Train. Each scene owns its fixed timeline.',feature3Title:'Randomness that protects sleep',feature3Body:'Events likely to wake you are kept sparse and away from sleep onset and early-sleep protection windows.',feature4Title:'Space is part of the scene',feature4Body:'Distance, high-frequency roll-off, tone and movement change together with scene state and semantic controls.',platformEyebrow:'Local first',platformTitle:'Sleep should not wait for the network.',platformBody:'The Android app is built around reliable background playback. The web will grow into an installable PWA and Web Audio player.',viewReleases:'GitHub Releases',installSite:'Install web app',footerTagline:'Living soundscapes for sleep.',privacy:'Privacy',terms:'Terms'}};

const languageToggle=document.getElementById('languageToggle');
const stored=localStorage.getItem('lullaby-language');
let language=stored||((navigator.language||'').toLowerCase().startsWith('ko')?'ko':'en');

function applyLanguage(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const value=translations[language][el.dataset.i18n];
    if(value!==undefined) el.innerHTML=value;
  });
  languageToggle.textContent=language==='ko'?'EN':'KO';
  languageToggle.setAttribute('aria-label',language==='ko'?'Switch to English':'한국어로 전환');
}

languageToggle?.addEventListener('click',()=>{
  language=language==='ko'?'en':'ko';
  localStorage.setItem('lullaby-language',language);
  applyLanguage();
});
applyLanguage();

document.getElementById('year').textContent=new Date().getFullYear();

let deferredInstall;
const installButton=document.getElementById('installPwa');
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferredInstall=event;
  installButton.hidden=false;
});
installButton?.addEventListener('click',async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall=null;
  installButton.hidden=true;
});
window.addEventListener('appinstalled',()=>{installButton.hidden=true;deferredInstall=null});

if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}
