import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANGUAGE_KEY,normalizedLanguage,t} from '../shared/i18n.js';
test('RU/EN locale selection uses an independent storage key',()=>{
 assert.equal(LANGUAGE_KEY,'rfPortalLanguage');
 assert.equal(normalizedLanguage('en','ru-RU'),'en');
 assert.equal(normalizedLanguage('xx','ru-RU'),'ru');
 assert.equal(normalizedLanguage('xx','en-US'),'en');
});
test('English translations are available for catalog, settings and errors',()=>{
 for(const [ru,en] of [
  ['Центр приложений','Application Center'],
  ['Сервисы Keenetic / Entware','Keenetic / Entware services'],
  ['Сохранить','Save'],['Порт','Port'],
  ['Тёмная','Dark'],['Открытие','Display'],
  ['Веб-панель для xKeen на Entware','Web interface for xKeen on Entware'],
  ['Порт должен быть от 1 до 65535.','Port must be between 1 and 65535.']])assert.equal(t(ru,'en'),en);
 assert.equal(t('Сохранить','ru'),'Сохранить');
});
test('Portal owns its own bilingual labels without modifying Keenetic language',()=>{
 const page=readFileSync(new URL('../options.html',import.meta.url),'utf8');
 const popup=readFileSync(new URL('../popup.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../content/bridge.js',import.meta.url),'utf8');
 assert.match(page,/id="ui-language"/);
 assert.match(popup,/id="popup-language"/);
 assert.match(script,/const TXT_EN/);
 assert.match(script,/LANGUAGE_KEY in changes/);
});
