(()=>{
  'use strict';
  const $=selector=>document.querySelector(selector),frame=$('#debugPlayer'),state=$('#debugState'),nodesRoot=$('#debugNodes'),logsRoot=$('#debugLogs'),notice=$('#debugNotice');
  let player=null,timer=null,busy=false;
  const formatMs=value=>{const seconds=Math.max(0,Math.round(Number(value||0)/1000)),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
  const notify=(message,error=false)=>{notice.textContent=message;notice.dataset.kind=error?'error':'ok'};
  let eventJourney='';
  const syncEventOptions=data=>{if(eventJourney===data.journeyId)return;eventJourney=data.journeyId;const select=$('#eventType'),previous=select.value,options=data.eventOptions||[];select.innerHTML=options.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');if(options.some(([value])=>value===previous))select.value=previous};
  const api=()=>{const value=frame.contentWindow?.LullabyDebug;if(!value)throw new Error('플레이어 디버그 브리지가 아직 준비되지 않았습니다.');return value};
  function patchKoreanSutraLabel(){
    const win=frame.contentWindow,doc=frame.contentDocument,locales=win?.LullabyLocales;if(!win||!doc||!locales||typeof locales.sourceName!=='function'||locales.__debugKoreanSutraPatched)return;
    const baseSourceName=locales.sourceName.bind(locales);locales.sourceName=(id,fallback=id)=>id==='forest_temple_heart_sutra'&&((win.LullabyI18n?.language||doc.documentElement.lang||'en')==='ko')?'반야심경 · 한국어 독송':baseSourceName(id,fallback);locales.__debugKoreanSutraPatched=true;
    try{doc.dispatchEvent(new win.CustomEvent('lullaby-language-changed',{detail:{language:win.LullabyI18n?.language||doc.documentElement.lang||'ko'}}))}catch{}
  }
  function installFreshBridge(){
    return new Promise((resolve,reject)=>{const doc=frame.contentDocument;if(!doc?.body){reject(new Error('디버그 플레이어 문서를 열 수 없습니다.'));return}doc.getElementById('lullabyDebugBridgeForceV5')?.remove();const old=doc.getElementById('lullabyDebugBridgeForceV4');old?.remove();const script=doc.createElement('script');script.id='lullabyDebugBridgeForceV5';script.src=`/debug-bridge-v1.js?v=5&force=${Date.now()}`;script.onload=()=>{patchKoreanSutraLabel();resolve()};script.onerror=()=>reject(new Error('최신 디버그 브리지를 불러오지 못했습니다.'));doc.body.appendChild(script)})
  }
  async function run(label,action){if(busy)return;busy=true;document.body.dataset.busy='true';try{const result=await action(api());notify(`${label} 완료${typeof result==='string'?` · ${result}`:''}`)}catch(error){console.error(error);notify(error.message||String(error),true)}finally{busy=false;document.body.dataset.busy='false';render()}}
  function render(){
    if(!player)return;let data;try{data=api().snapshot()}catch{return}
    syncEventOptions(data);const percent=Math.round(data.progress*1000)/10;state.innerHTML=`<div><small>여정</small><strong>${data.journeyId}</strong></div><div><small>단계</small><strong>${data.phase||'—'}</strong></div><div><small>재생</small><strong>${data.playing?'RUNNING':'STOPPED'}</strong></div><div><small>시간</small><strong>${formatMs(data.elapsedMs)} / ${formatMs(data.totalMs)}</strong></div><div><small>진행률</small><strong>${percent}%</strong></div><div><small>AudioContext</small><strong>${data.audioContext}</strong></div><div><small>랜덤 이벤트</small><strong>${data.eventsEnabled?'ON':'OFF'}</strong></div><div><small>현재 이벤트</small><strong>${data.event||'—'}</strong></div>`;
    nodesRoot.innerHTML=data.nodes.length?data.nodes.map(node=>`<article><header><strong>${node.name}</strong><span class="tag ${node.crossfade?'active':''}">${node.crossfade?'DUAL XFADE':'ONE SHOT'}</span></header><dl><div><dt>gain</dt><dd>${node.gain.toFixed(3)}</dd></div><div><dt>position</dt><dd>${node.currentTime.toFixed(1)} / ${node.duration.toFixed(1)}s</dd></div><div><dt>loops</dt><dd>${node.loopCount}</dd></div><div><dt>fade</dt><dd>${node.fadeSeconds.toFixed(1)}s</dd></div></dl>${node.voices.length?`<div class="voices">${node.voices.map(voice=>`<span>CH ${voice.index+1} · ${voice.paused?'PAUSE':'PLAY'} · ${voice.currentTime.toFixed(1)}s · ${voice.gain.toFixed(2)}</span>`).join('')}</div>`:''}</article>`).join(''):'<p class="empty">여정을 시작하면 활성 오디오 노드가 표시됩니다.</p>';
    logsRoot.textContent=data.logs.slice(-16).map(log=>`${log.at.slice(11,19)}  ${log.level.toUpperCase().padEnd(5)}  ${log.message}`).join('\n')||'오류와 테스트 이벤트 로그가 여기에 표시됩니다.';
    $('#eventEnabled').checked=data.eventsEnabled;
  }
  function bind(){
    document.addEventListener('click',event=>{const button=event.target.closest('[data-command]');if(!button)return;const command=button.dataset.command;if(command==='play')run('재생/일시정지',debug=>debug.playPause());else if(command==='stop')run('정지',debug=>debug.stop());else if(command==='event')run('선택 이벤트 즉시 실행',debug=>debug.triggerEvent($('#eventType').value));else if(command==='loop')run('다음 루프 직전 이동',debug=>debug.jumpBeforeLoop(Number($('#loopLead').value)));else if(command==='prev')run('이전 단계',debug=>debug.previousStage());else if(command==='next')run('다음 단계',debug=>debug.nextStage());else if(command==='short')run('5분 압축 여정',debug=>debug.setDuration(5));else if(command==='resume')run('오디오 컨텍스트 재개',debug=>debug.setAudioContext(true));else if(command==='suspend')run('오디오 컨텍스트 정지',debug=>debug.setAudioContext(false));else if(command==='clear')run('로그 초기화',debug=>debug.clearLogs());else if(command==='reload'){frame.src='/player/?debug=1&reload='+Date.now();notify('플레이어를 다시 불러오는 중…')}});
    $('#journeySelect').addEventListener('change',event=>run('여정 변경',debug=>debug.selectJourney(event.target.value)));
    $('#eventEnabled').addEventListener('change',event=>run('랜덤 이벤트 설정',debug=>debug.setEvents(event.target.checked)));
    $('#stageSelect').addEventListener('change',event=>run('단계 이동',debug=>debug.stage(event.target.value)));
  }
  frame.addEventListener('load',async()=>{eventJourney='';player=null;try{await installFreshBridge()}catch(error){console.error(error);notify(error.message||String(error),true)}const wait=setInterval(()=>{try{player=api();clearInterval(wait);patchKoreanSutraLabel();notify('디버그 플레이어 연결됨 · 최신 브리지 v5');clearInterval(timer);timer=setInterval(render,500);render()}catch{}},100);setTimeout(()=>{if(!player){clearInterval(wait);notify('플레이어 연결 시간이 초과되었습니다.',true)}},15000)});
  bind();addEventListener('beforeunload',()=>clearInterval(timer));
})();