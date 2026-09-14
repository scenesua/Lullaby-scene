// Editorial content is available in Korean and English; other preferences use English.
(() => {
  let language = document.documentElement.dataset.locale === 'ko' ? 'ko' : 'en';
  function sync() {
    const lang = language;
    document.documentElement.lang = lang;
    document.documentElement.dir = 'ltr';
    document.documentElement.classList.remove('i18n-pending');
    document.querySelectorAll('.language-toggle').forEach(button => {
      button.textContent = lang === 'ko' ? 'English' : '한국어';
      button.setAttribute('aria-label', lang === 'ko' ? 'Read in English' : '한국어로 읽기');
    });
    document.querySelectorAll('[data-lang-block]').forEach(block => {
      block.hidden = block.dataset.langBlock !== lang;
      if (!block.hidden) {
        document.title = block.querySelector('h1').textContent + ' — Lullaby Scene';
        document.querySelector('meta[name="description"]').content = block.querySelector('.reading-lead').textContent;
      }
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('.language-toggle')) return;
    language = language === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem('lullaby-language', language); } catch {}
    sync();
  });
  sync();
})();
