import fs from 'node:fs';
import {chromium,firefox,webkit} from 'playwright-core';

const browserName=(process.env.BROWSER||'chromium').toLowerCase();
const browserType={chromium,firefox,webkit}[browserName];
if(!browserType)throw new Error(`Unsupported browser: ${browserName}`);
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean);
const executablePath=browserName==='chromium'?candidates.find(path=>fs.existsSync(path)):undefined;
if(browserName==='chromium'&&!executablePath)throw new Error('No Chrome/Chromium executable found on runner');
const baseUrl=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');

const browser=await browserType.launch(browserName==='chromium'?{headless:true,executablePath,args:['--no-sandbox']}:{headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},locale:'ko-KR'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(String(error)));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
await page.route('**/api/visitors',route=>route.fulfill({status:200,contentType:'application/json',body:'{"available":false}'}));
await page.addInitScript(()=>localStorage.setItem('lullaby-user-presets',JSON.stringify([
  {id:'user_security_test',name:'<img id="preset-xss-probe" src=x onerror=alert(1)>',mix:{}},
  {id:'user_bad\" autofocus onfocus=alert(1) x=\"',name:'Injected saved scene',mix:{}}
])));

await page.goto(`${baseUrl}/player/`,{waitUntil:'networkidle'});
await page.waitForSelector('#builtInPresets [data-preset="preset_rainy_cafe"]',{state:'attached'});
await page.waitForSelector('[data-quick-source="rain"]',{state:'attached'});
await page.waitForTimeout(450);

const savedPresetIds=await page.locator('#userPresets [data-user-preset]').evaluateAll(nodes=>nodes.map(node=>node.dataset.userPreset));
if(JSON.stringify(savedPresetIds)!==JSON.stringify(['user_security_test']))throw new Error(`unsafe saved preset ID was rendered: ${JSON.stringify(savedPresetIds)}`);
if(await page.locator('#preset-xss-probe').count())throw new Error('saved preset name was parsed as HTML');
if(await page.locator('#userPresets [data-user-preset] strong').textContent()!=='<img id="preset-xss-probe" src=x onerror=alert(1)>')throw new Error('saved preset name was not preserved as text');

async function text(selector){return(await page.locator(selector).first().textContent())?.trim()}
async function expectText(selector,expected){const actual=await text(selector);if(actual!==expected)throw new Error(`${selector}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)}
async function setLanguage(code){await page.evaluate(code=>window.LullabyLocales.setLanguage(code),code);await page.waitForTimeout(70)}

const expected={
  ko:['준비된 장면','비','비 오는 카페'],
  en:['Ready-made Scenes','Rain','Rainy Cafe'],
  ar:['مشاهد جاهزة','المطر','مقهى ممطر'],
  ja:['用意されたシーン','雨','雨のカフェ'],
  'zh-CN':['预设场景','雨','雨天咖啡馆'],
  'zh-TW':['預設場景','雨聲','雨天咖啡館'],
  ru:['Готовые сцены','Дождь','Дождливое кафе'],
  fr:['Scènes prêtes à l’emploi','Pluie','Café sous la pluie'],
  es:['Escenas preparadas','Lluvia','Café lluvioso'],
  pt:['Cenas prontas','Chuva','Café com chuva'],
  th:['ฉากพร้อมใช้','ฝน','คาเฟ่ยามฝนตก'],
  tl:['Mga Nakahandang Eksena','Ulan','Maulang Café'],
  hi:['तैयार दृश्य','बारिश','बरसाती कैफ़े'],
  vi:['Cảnh dựng sẵn','Mưa','Quán cà phê mưa']
};
const options=await page.locator('.language-select').first().locator('option').evaluateAll(nodes=>nodes.map(node=>node.value));
if(JSON.stringify(options)!==JSON.stringify(Object.keys(expected)))throw new Error(`language dropdown mismatch: ${JSON.stringify(options)}`);
for(const[code,[prepared,rain,preset]]of Object.entries(expected)){
  await setLanguage(code);
  await expectText('[data-i18n="simpleScenes"]',prepared);
  await expectText('#mixerGrid [data-source="rain"] strong',rain);
  await expectText('#builtInPresets [data-preset="preset_rainy_cafe"] strong',preset);
  await expectText('[data-quick-source="rain"] strong',rain);
  const direction=await page.locator('html').getAttribute('dir');if(direction!==(code==='ar'?'rtl':'ltr'))throw new Error(`document direction mismatch for ${code}: ${direction}`);
  const ui=await page.evaluate(()=>({now:window.LullabyLocales.t('nowPlaying'),black:window.LullabyLocales.t('blackScreen'),scene:window.LullabyLocales.t('sceneScreen'),events:window.LullabyLocales.t('randomEvents'),duration:window.LullabyLocales.t('customDuration')}));
  await expectText('[data-i18n="nowPlaying"]',ui.now);
  await expectText('[data-blackout-label]',ui.black);
  await expectText('[data-journey-display-label]',ui.scene);
  await expectText('[data-journey-event-label]',ui.events);
  await expectText('[data-direct-title]',ui.duration);
  await expectText('[data-blackout-placement="mobile"] [data-blackout-label]',ui.black);
  const shortScene={ko:'장면 화면',en:'Scene Screen',ar:'شاشة المشهد',ja:'シーン画面','zh-CN':'场景画面','zh-TW':'場景畫面',ru:'Сцена',fr:'Scène',es:'Escena',pt:'Cena',th:'ฉาก',tl:'Eksena',hi:'दृश्य',vi:'Cảnh'};
  await expectText('[data-mobile-display-label]',shortScene[code]);
  if(await page.locator('[data-journey-display-placement="mobile"]').getAttribute('aria-label')!==ui.scene)throw new Error('Full accessible scene label missing');
  for(const width of [320,390]){
    await page.setViewportSize({width,height:844});
    const controls=await page.locator('.android-top-actions>button,.android-top-blackout').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect(),label=button.querySelector('span');return{width:r.width,height:r.height,right:r.right,label:label?.textContent,clipped:label&&(label.getBoundingClientRect().top+label.scrollHeight>r.bottom-2||label.scrollWidth>r.width-6)}}));
    if(controls.length!==4||controls.some(c=>c.width<44||c.height<44||c.right>width||!c.label||c.clipped))throw new Error(`Mobile action layout ${code}/${width}: ${JSON.stringify(controls)}`);
    const tabs=await page.locator('.mobile-tab').evaluateAll(buttons=>buttons.map(button=>{const r=button.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width,height:r.height,svg:button.querySelectorAll('svg').length}}));
    const tabsByPosition=[...tabs].sort((a,b)=>a.x-b.x);if(tabs.length!==5||tabs.some(tab=>tab.width<44||tab.height<44||tab.svg!==1)||tabsByPosition.some((tab,index)=>index>0&&tab.x-tabsByPosition[index-1].right<5))throw new Error(`Bottom tab spacing ${code}/${width}: ${JSON.stringify(tabs)}`);
  }
  await page.setViewportSize({width:1280,height:900});
}
await setLanguage('vi');
await page.locator('#journeySelector [data-journey="spacecraft_journey"]').click();await page.waitForTimeout(120);
const spacecraftVi=await page.evaluate(()=>window.LullabyLocales.journey('spacecraft_journey'));
await expectText('.aircraft-title-row h3',spacecraftVi.title);await expectText('.aircraft-title-row p',spacecraftVi.description);
for(let index=0;index<4;index++)await expectText(`.desktop-macros label:nth-child(${index+1}) span`,spacecraftVi.macros[index]);
await page.locator('#journeySelector [data-journey="train_journey"]').click();await page.waitForTimeout(120);
const trainVi=await page.evaluate(()=>window.LullabyLocales.trainJourney());
await expectText('.aircraft-title-row h3',trainVi.title);await expectText('.aircraft-title-row p',trainVi.description);
for(let index=0;index<4;index++)await expectText(`.desktop-macros label:nth-child(${index+1}) span`,trainVi.macros[index]);
await setLanguage('en');
if(await page.locator('body').evaluate(el=>/\bSimple Scenes?\b/.test(el.innerText)))throw new Error('English UI still exposes legacy Simple Scene wording');

// A translated phase must not pin the old phase key when the player advances.
await setLanguage('ko');
await page.evaluate(()=>{const phase=document.getElementById('phaseLabel');phase.dataset.phaseKey='Ready';phase.textContent='Taxi out';window.LullabyCatalogI18n.apply()});
await page.waitForTimeout(40);await expectText('#phaseLabel','지상 이동');
await page.evaluate(()=>{const phase=document.getElementById('phaseLabel');phase.textContent='Takeoff';window.LullabyCatalogI18n.apply()});
await page.waitForTimeout(40);await expectText('#phaseLabel','이륙');

// Explicit theme selection must change the full palette, not only the text color.
await page.evaluate(()=>{const select=document.getElementById('themeSelect');select.value='light';select.dispatchEvent(new Event('change',{bubbles:true}))});
await page.waitForTimeout(40);
const lightTheme=await page.evaluate(()=>({theme:document.documentElement.dataset.theme,bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),surface:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(),body:getComputedStyle(document.body).backgroundColor}));
if(lightTheme.theme!=='light'||lightTheme.bg!=='#e9e4da'||lightTheme.surface!=='#f2eee6')throw new Error(`Explicit light theme did not apply: ${JSON.stringify(lightTheme)}`);
await page.evaluate(()=>{const select=document.getElementById('themeSelect');select.value='dark';select.dispatchEvent(new Event('change',{bubbles:true}))});
await page.waitForTimeout(40);
const darkBg=await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
if(darkBg!=='#0b0d12')throw new Error(`Explicit dark theme did not restore dark palette: ${darkBg}`);

// Wide layout: blackout is a dedicated rail destination and a sticky action at the top of the inspector.
const desktopBlackout=await page.evaluate(()=>{
  const rail=document.querySelector('.desktop-rail'),settings=rail?.querySelector('[data-view="settings"]'),railButton=rail?.querySelector('[data-blackout-placement="rail"]');
  const inspector=document.querySelector('.desktop-inspector'),sticky=inspector?.querySelector('.blackout-inspector-sticky'),inspectorButton=inspector?.querySelector('[data-blackout-placement="inspector"]');
  return{
    railVisible:!!railButton&&getComputedStyle(railButton).display!=='none',
    railAfterSettings:!!settings&&settings.nextElementSibling===railButton,
    inspectorVisible:!!inspectorButton&&getComputedStyle(inspectorButton).display!=='none',
    inspectorFirst:!!sticky&&inspector.firstElementChild===sticky,
    inspectorPosition:sticky?getComputedStyle(sticky).position:null
  };
});
if(!desktopBlackout.railVisible||!desktopBlackout.railAfterSettings||!desktopBlackout.inspectorVisible||!desktopBlackout.inspectorFirst||desktopBlackout.inspectorPosition!=='sticky')throw new Error(`Desktop blackout placement mismatch: ${JSON.stringify(desktopBlackout)}`);

// Stress repeated locale changes, then verify the renderer becomes idle instead of entering a MutationObserver feedback loop.
await page.evaluate(()=>{window.__mutationCount=0;window.__mutationObserver=new MutationObserver(records=>window.__mutationCount+=records.length);window.__mutationObserver.observe(document.getElementById('webPlayer'),{subtree:true,childList:true,attributes:true,characterData:true})});
const codes=Object.keys(expected);
for(let i=0;i<39;i++)await setLanguage(codes[i%codes.length]);
await setLanguage('ko');
await page.waitForTimeout(900);
await page.evaluate(()=>window.__mutationCount=0);
const ticks=await page.evaluate(()=>new Promise(resolve=>{let ticks=0;const id=setInterval(()=>ticks++,50);setTimeout(()=>{clearInterval(id);resolve(ticks)},2200)}));
const mutationCount=await page.evaluate(()=>window.__mutationCount);
if(ticks<30)throw new Error(`renderer event loop stalled during idle stability test: ${ticks} ticks`);
if(mutationCount>40)throw new Error(`renderer kept mutating while idle: ${mutationCount} mutations`);

await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
const shell=await page.evaluate(()=>{
  const top=document.querySelector('.mobile-player-top'),mobileBlackout=top?.querySelector('[data-blackout-placement="mobile"]'),actions=top?.querySelector('.android-top-actions');
  return{
    header:getComputedStyle(document.querySelector('.site-header')).display,
    intro:getComputedStyle(document.querySelector('.player-page-intro')).display,
    subtabs:getComputedStyle(document.querySelector('.scene-subtabs')).display,
    nav:getComputedStyle(document.querySelector('.mobile-tabs')).display,
    navCount:document.querySelectorAll('[data-android-dest]').length,
    top:getComputedStyle(top).display,
    blackoutMobile:mobileBlackout?getComputedStyle(mobileBlackout).display:'none',
    blackoutInsideActions:actions?.querySelectorAll('[data-blackout-button]').length??-1,
    blackoutBeforeActions:!!mobileBlackout&&mobileBlackout.nextElementSibling===actions
  };
});
if(shell.header!=='none'||shell.intro!=='none'||shell.subtabs!=='none'||shell.nav==='none'||shell.navCount!==5||shell.top==='none'||shell.blackoutMobile==='none'||shell.blackoutInsideActions!==0||!shell.blackoutBeforeActions)throw new Error(`Android shell mismatch: ${JSON.stringify(shell)}`);

// Blackout starts pitch black, reveals the slider only after touch, and exits cleanly.
await page.evaluate(()=>window.LullabyBlackout.enter());await page.waitForTimeout(80);
const blackoutStart=await page.evaluate(()=>{const o=document.getElementById('lullabyBlackoutOverlay');return{display:getComputedStyle(o).display,controls:o.classList.contains('show-controls'),bg:getComputedStyle(o).backgroundColor}});
if(blackoutStart.display==='none'||blackoutStart.controls||blackoutStart.bg!=='rgb(0, 0, 0)')throw new Error(`Blackout did not start cleanly: ${JSON.stringify(blackoutStart)}`);
await page.locator('#lullabyBlackoutOverlay').dispatchEvent('pointerup',{clientX:20,clientY:20});await page.waitForTimeout(40);
if(!await page.locator('#lullabyBlackoutOverlay').evaluate(el=>el.classList.contains('show-controls')))throw new Error('Blackout slider did not appear after touch');
await page.evaluate(()=>window.LullabyBlackout.exit());await page.waitForTimeout(40);
if(await page.locator('#lullabyBlackoutOverlay').evaluate(el=>el.classList.contains('is-active')))throw new Error('Blackout did not exit cleanly');

await page.locator('[data-android-dest="prepared"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-scene-content="simple"]').evaluate(el=>el.classList.contains('active')))throw new Error('Prepared destination did not open ready-made scenes');
await expectText('[data-android-title]','준비된 장면');
const preparedLayout=await page.evaluate(()=>{
  const picker=document.getElementById('presetPicker'),preset=picker?.querySelector('summary');
  const transport=document.querySelector('#simpleSceneTransport');
  const quick=document.querySelector('#simpleQuickMixerSection');
  const mixerSource=document.querySelector('#mixerGrid [data-source="rain"]');
  return{
    presetVisible:!!preset&&getComputedStyle(preset).display!=='none',
    pickerClosed:!!picker&&!picker.open,
    presetTop:preset?.getBoundingClientRect().top??null,
    transportTop:transport?.getBoundingClientRect().top??null,
    quickDisplay:quick?getComputedStyle(quick).display:null,
    quickTop:quick?.getBoundingClientRect().top??null,
    mixerSourceVisible:!!mixerSource&&mixerSource.getClientRects().length>0
  };
});
if(!preparedLayout.presetVisible||!preparedLayout.pickerClosed||preparedLayout.quickDisplay==='none'||preparedLayout.mixerSourceVisible||preparedLayout.presetTop===null||preparedLayout.transportTop===null||preparedLayout.quickTop===null||preparedLayout.presetTop>=preparedLayout.transportTop||preparedLayout.transportTop>=preparedLayout.quickTop)throw new Error(`Prepared mobile picker / transport / mixer order mismatch: ${JSON.stringify(preparedLayout)}`);
await page.locator('[data-android-dest="mixer"]').click();await page.waitForTimeout(80);
if(!await page.locator('#mixerGrid [data-source="rain"]').isVisible())throw new Error('Mixer destination did not expose source controls');
await page.locator('[data-android-dest="prepared"]').click();await page.waitForTimeout(80);
await page.locator('[data-android-dest="fx"]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="fx"]').evaluate(el=>el.classList.contains('active')))throw new Error('FX destination did not open');
await page.locator('[data-android-dest="settings"]').click();await page.waitForTimeout(80);
if(await page.locator('.android-language-setting .language-select').count()!==1)throw new Error('Settings language dropdown missing');
await page.locator('[data-android-timer]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="timer"]').evaluate(el=>el.classList.contains('active')))throw new Error('Top timer action did not open timer');
await page.locator('[data-android-back]').click();await page.waitForTimeout(80);
if(!await page.locator('[data-panel="settings"]').evaluate(el=>el.classList.contains('active')))throw new Error('Timer back did not restore Settings');

await page.evaluate(()=>window.__mutationObserver?.disconnect());
if(errors.length)throw new Error(`browser errors: ${errors.join(' | ')}`);
await browser.close();
console.log(`${browserName}: 14-locale + mobile shell + blackout placement + theme stable; idle mutations=${mutationCount}, ticks=${ticks}`);
