// Editorial content is available in Korean and English; other preferences use English.
(() => {
  const article = document.body.classList.contains('reading-page');
  let language = document.documentElement.dataset.locale === 'ko' ? 'ko' : 'en';
  function sync() {
    const locale = article ? language : window.LullabyLocales?.language || 'en';
    const lang = locale === 'ko' ? 'ko' : 'en';
    if (article) {
      document.documentElement.lang = lang;
      document.documentElement.dir = 'ltr';
    }
    document.documentElement.classList.remove('i18n-pending');
    document.querySelectorAll('[data-reading-ko]').forEach(node => {
      const translated = node.getAttribute(`data-reading-${locale}`) || (!['ko', 'en'].includes(locale) && node.dataset.readingKey ? window.LullabyLocales?.t(node.dataset.readingKey) : null);
      const text = translated || (lang === 'ko' ? node.dataset.readingKo : node.dataset.readingEn);
      if (node.textContent !== text) node.textContent = text;
      const textLanguage = translated ? locale : lang;
      if (node.lang !== textLanguage) node.lang = textLanguage;
    });
    document.querySelectorAll('[data-reading-title-second]').forEach(node => { node.hidden = !['ko', 'en', 'de'].includes(locale); });
    if (article) document.querySelectorAll('.language-toggle').forEach(button => {
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
    if (!article || !event.target.closest('.language-toggle')) return;
    document.querySelectorAll('.listening-example audio').forEach(audio => audio.pause());
    language = language === 'ko' ? 'en' : 'ko';
    try { localStorage.setItem('lullaby-language', language); } catch {}
    sync();
  });
  document.addEventListener('lullaby-locales-applied', sync);
  document.querySelectorAll('.listening-example audio').forEach(audio => { audio.volume = .25; });
  document.addEventListener('play', event => {
    if (!event.target.matches?.('.listening-example audio')) return;
    document.querySelectorAll('.listening-example audio').forEach(audio => {
      if (audio !== event.target) audio.pause();
    });
  }, true);
  sync();
})();
