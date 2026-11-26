import test from 'node:test';
import assert from 'node:assert/strict';
import { appReducer, createInitialState } from './state';

test('initial state is fresh and has the first hero unlocked', () => {
  const first = createInitialState();
  const second = createInitialState();
  first.profile.unlockedHeroIds.push('test-hero');
  assert.deepEqual(second.profile.unlockedHeroIds, ['vaelen']);
  assert.equal(second.screen, 'main-menu');
});

test('screen navigation changes only the active screen', () => {
  const initial = createInitialState();
  const next = appReducer(initial, { type: 'screen/changed', screen: 'sanctuary' });
  assert.equal(next.screen, 'sanctuary');
  assert.deepEqual(next.profile, initial.profile);
});

test('settings updates preserve unspecified settings', () => {
  const initial = createInitialState();
  const next = appReducer(initial, {
    type: 'settings/updated',
    patch: { musicVolume: 0.25 }
  });
  assert.equal(next.settings.musicVolume, 0.25);
  assert.equal(next.settings.effectsVolume, initial.settings.effectsVolume);
});
