(()=>{
  const status=document.getElementById('playerStatus');
  import('/player-runtime-v13.js?v=13').catch(err=>{
    console.error('Lullaby Scene player runtime failed',err);
    if(status)status.textContent='플레이어를 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  });
})();
