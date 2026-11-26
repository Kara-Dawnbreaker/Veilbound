import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDefaultSaveData,
  loadSaveData,
  saveGameData,
} from './saveManager';

function installMemoryStorage(initial: Record<string, string> = {}): Map<string, string> {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => { values.clear(); },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() { return values.size; },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage as unknown as Storage,
  });
  return values;
}

test('missing save creates and persists a valid default save', () => {
  const storage = installMemoryStorage();
  const save = loadSaveData();
  assert.equal(save.version, 1);
  assert.equal(save.activeRun, null);
  assert.ok(storage.has('veilbound_ashen_crown_save'));
});

test('corrupt primary save recovers the backup copy', () => {
  const backup = createDefaultSaveData();
  backup.soulShards = 47;
  const backupRaw = JSON.stringify(backup);
  const storage = installMemoryStorage({
    veilbound_ashen_crown_save: '{broken json',
    veilbound_ashen_crown_save_backup: backupRaw,
  });
  const restored = loadSaveData();
  assert.equal(restored.soulShards, 47);
  assert.equal(storage.get('veilbound_ashen_crown_save'), backupRaw);
});

test('malformed nested active run is rejected without crashing the save load', () => {
  const save = createDefaultSaveData();
  (save as unknown as { activeRun: unknown }).activeRun = {
    runId: 'broken-run',
    characterId: 'not-a-character',
    regionId: 'not-a-region',
    currentScreen: 'COMBAT',
  };
  installMemoryStorage({
    veilbound_ashen_crown_save: JSON.stringify(save),
  });
  assert.equal(loadSaveData().activeRun, null);
});

test('a previous valid primary save is retained as the backup', () => {
  const storage = installMemoryStorage();
  const first = createDefaultSaveData();
  first.soulShards = 20;
  saveGameData(first);
  const second = { ...first, soulShards: 31 };
  saveGameData(second);
  const backup = JSON.parse(storage.get('veilbound_ashen_crown_save_backup') ?? 'null');
  const primary = JSON.parse(storage.get('veilbound_ashen_crown_save') ?? 'null');
  assert.equal(backup.soulShards, 20);
  assert.equal(primary.soulShards, 31);
});
