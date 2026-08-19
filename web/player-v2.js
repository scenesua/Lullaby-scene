(()=>{
  const status=document.getElementById('playerStatus');
  import('/player-runtime.js?v=10').catch(err=>{
    console.error('Lullaby player runtime failed to load',err);
    if(status)status.textContent='플레이어를 불러오지 못했습니다. 새로고침해 주세요.';
  });
})();
