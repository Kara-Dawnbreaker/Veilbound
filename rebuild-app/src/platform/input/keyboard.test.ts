import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGlobalShortcut } from './keyboard';

function keyEvent(key: string, options: Partial<KeyboardEvent> = {}) {
  return {
    key,
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...options
  } as KeyboardEvent;
}

test('Escape returns to the main menu', () => {
  let destination = '';
  handleGlobalShortcut(keyEvent('Escape'), (screen) => { destination = screen; });
  assert.equal(destination, 'main-menu');
});

test('modified shortcuts are left to the browser or host application', () => {
  let called = false;
  handleGlobalShortcut(keyEvent('Escape', { ctrlKey: true }), () => { called = true; });
  assert.equal(called, false);
});

test('unrelated keys do not change the active screen', () => {
  let called = false;
  handleGlobalShortcut(keyEvent('a'), () => { called = true; });
  assert.equal(called, false);
});
