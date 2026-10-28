import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const popup = readFileSync(new URL('../popup.js', import.meta.url), 'utf8');
const options = readFileSync(new URL('../options.js', import.meta.url), 'utf8');
test('imported profiles require an explicit, user-initiated site grant, never implicit trust', () => {
  assert.match(popup, /await chrome\.permissions\.contains\(\{ origins: \[hostMatch\(origin\)\] \}\)/);
  assert.match(popup, /const grant = chrome\.permissions\.request\(\{origins:\[hostMatch\(origin\)\]\}\)/);
  assert.match(popup, /if \(!\(await grant\)\) throw Error/);
  assert.match(popup, /await chrome\.runtime\.sendMessage\(\{type:'SYNC'\}\)/);
  assert.match(popup, /await chrome\.tabs\.reload\(tab\.id, \{ bypassCache: true \}\)/);
  assert.match(popup, /Профиль восстановлен, но разрешение браузера/);
  assert.match(options, /Импорт завершён\. Если Portal не появился/);
});