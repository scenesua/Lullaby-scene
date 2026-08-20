(()=>{
  function sync(){
    const lang=window.LullabyI18n?.language||'ko';
    const blockLanguage=lang==='ko'?'ko':'en';
    document.querySelectorAll('[data-lang-block]').forEach(el=>{el.hidden=el.dataset.langBlock!==blockLanguage});
  }
  document.addEventListener('lullaby-language-changed',sync);document.addEventListener('lullaby-locales-applied',sync);sync();setTimeout(sync,0);
})();