(()=>{
  const supported=['ko','en','ja','zh-CN','zh-TW','ru','fr','es','pt','th','tl','hi','vi'];
  const normalize=value=>{
    const raw=String(value||'').toLowerCase();
    if(raw.startsWith('zh'))return /tw|hk|hant/.test(raw)?'zh-TW':'zh-CN';
    const exact=supported.find(code=>code.toLowerCase()===raw),base=raw.split('-')[0];
    return exact||supported.find(code=>code===base)||'en';
  };
  let saved='';try{saved=localStorage.getItem('lullaby-language')||''}catch{}
  const language=normalize(saved||navigator.languages?.[0]||navigator.language||'en'),root=document.documentElement;
  root.lang=language;root.dataset.locale=language;root.dataset.localeBoot='1';root.classList.add('i18n-pending');
  window.__lullabyLocaleRevealTimer=setTimeout(()=>root.classList.remove('i18n-pending'),3000);
})();
