(() => {
  'use strict';
  const ruButton = document.getElementById('lang-ru');
  const enButton = document.getElementById('lang-en');
  const settingsImage = document.getElementById('settings-preview');
  function selectLanguage(locale) {
    const lang = locale === 'en' ? 'en' : 'ru';
    document.documentElement.lang = lang;
    for (const element of document.querySelectorAll('[data-ru][data-en]')) {
      element.textContent = element.dataset[lang];
    }
    document.title = lang === 'en'
      ? 'RouterForge Portal — your Keenetic apps in one place'
      : 'RouterForge Portal — приложения Keenetic в одном меню';
    ruButton.setAttribute('aria-pressed', String(lang === 'ru'));
    enButton.setAttribute('aria-pressed', String(lang === 'en'));
    settingsImage.src = lang === 'en' ? './media/portal-settings-en.webp' : './media/portal-settings-ru.webp';
    try { localStorage.setItem('rf-portal-site-language', lang); } catch (_) { /* browser privacy mode */ }
  }
  let initial = 'ru';
  try { initial = localStorage.getItem('rf-portal-site-language') || (navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'); }
  catch (_) { /* no storage */ }
  ruButton.addEventListener('click', () => selectLanguage('ru'));
  enButton.addEventListener('click', () => selectLanguage('en'));
  selectLanguage(initial);
})();
