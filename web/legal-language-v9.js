(()=>{
  function sync(){
    const selected=window.LullabyI18n?.language||'ko';
    // Legal translations require their own reviewed text. Until then, keep Korean
    // only for Korean and use the existing English legal copy for every other UI locale.
    const legalLang=selected==='ko'?'ko':'en';
    document.querySelectorAll('[data-lang-block]').forEach(el=>{el.hidden=el.dataset.langBlock!==legalLang});
  }
  document.addEventListener('lullaby-language-changed',sync);
  document.addEventListener('lullaby-locales-applied',sync);
  sync();setTimeout(sync,0);
})();
