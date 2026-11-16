import test from 'node:test';
import assert from 'node:assert/strict';
import { CHROME_STORE_ID, CHROME_STORE_URL, distributionChannel, updateChannelHelp } from '../shared/store_channel.js';

test('only exact verified installed IDs select store channels', () => {
  assert.equal(distributionChannel({}, CHROME_STORE_ID), 'chrome-web-store');
  assert.equal(distributionChannel({browser_specific_settings:{gecko:{id:'routerforge-portal@fifth-ace.github.io'}}}, 'random'), 'firefox-amo');
  assert.equal(distributionChannel({}, 'other-installation-id'), 'manual');
  assert.equal(distributionChannel({browser_specific_settings:{gecko:{id:'other@example.org'}}}, CHROME_STORE_ID), 'manual');
  assert.ok(CHROME_STORE_URL.startsWith('https://chromewebstore.google.com/detail/'));
});

test('store update help is local, accurate and bilingual', () => {
  assert.match(updateChannelHelp('firefox-amo'), /Mozilla/);
  assert.match(updateChannelHelp('chrome-web-store'), /автоматически/);
  assert.match(updateChannelHelp('manual'), /вручную/);
  assert.match(updateChannelHelp('firefox-amo', 'en'), /automatically/);
});
