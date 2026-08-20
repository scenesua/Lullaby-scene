(()=>{
  function sync(){
    const lang=window.LullabyI18n?.language||'ko';
    document.querySelectorAll('[data-lang-block]').forEach(el=>{el.hidden=el.dataset.langBlock!==lang});
  }
  document.addEventListener('lullaby-language-changed',sync);sync();setTimeout(sync,0);
})();
