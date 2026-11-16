// Installed channel detection. Never changes permissions or performs network requests.
export const CHROME_STORE_ID = 'ikghhhcbgfepddcjammfhaeomohfajij';
export const CHROME_STORE_URL = `https://chromewebstore.google.com/detail/${CHROME_STORE_ID}`;
export const FIREFOX_GECKO_ID = 'routerforge-portal@fifth-ace.github.io';

export function distributionChannel(manifest, runtimeId) {
  if (manifest?.browser_specific_settings?.gecko?.id === FIREFOX_GECKO_ID) return 'firefox-amo';
  if (runtimeId === CHROME_STORE_ID && !manifest?.browser_specific_settings?.gecko) return 'chrome-web-store';
  return 'manual';
}

export function updateChannelHelp(channel, language = 'ru') {
  const en = language === 'en';
  if (channel === 'chrome-web-store') return en
    ? 'Chrome Web Store handles updates automatically. Open the store listing if you want to review the published version.'
    : 'Chrome Web Store обновляет расширение автоматически. Открой страницу магазина, чтобы посмотреть опубликованную версию.';
  if (channel === 'firefox-amo') return en
    ? 'Firefox Add-ons handles updates automatically after Mozilla approves a version. Check Extensions and Themes in Firefox.'
    : 'Firefox Add-ons обновляет расширение автоматически после одобрения Mozilla. Статус можно проверить в «Расширения и темы» Firefox.';
  return en
    ? 'The manually installed ZIP is updated manually. Check the verified GitHub release and update your unpacked extension.'
    : 'Распакованное расширение обновляется вручную. Проверь официальный GitHub-релиз и обнови установленную папку.';
}
