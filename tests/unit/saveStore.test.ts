import { describe, expect, it } from 'vitest';
import { cleanName, MemoryStorage, SaveStore } from '../../src/save/SaveStore';
import { migrate, SaveTooNewError } from '../../src/save/migrations';
import { MAX_PROFILES, SAVE_VERSION } from '../../src/save/types';

const kid = { name: 'vivian', animal: 'bunny' as const, outfit: 2, ageBand: '7-8' as const };

describe('SaveStore', () => {
  it('starts empty and survives a reload', async () => {
    const storage = new MemoryStorage();
    const a = new SaveStore(storage);
    expect((await a.load()).profiles).toEqual([]);
    const p = await a.createProfile(kid);
    await a.updateProfile(p.id, (pr) => (pr.coins += 5));

    const b = new SaveStore(storage);
    await b.load();
    expect(b.profiles).toHaveLength(1);
    expect(b.getProfile(p.id)).toMatchObject({ name: 'Vivian', coins: 5, animal: 'bunny' });
    expect(b.data.lastProfileId).toBe(p.id);
  });

  it('caps the number of players', async () => {
    const s = new SaveStore(new MemoryStorage());
    await s.load();
    for (let i = 0; i < MAX_PROFILES; i++) await s.createProfile({ ...kid, name: `Kid${i}` });
    expect(s.canAddProfile()).toBe(false);
    await expect(s.createProfile(kid)).rejects.toThrow();
  });

  it('exports and imports a save file', async () => {
    const s = new SaveStore(new MemoryStorage());
    await s.load();
    await s.createProfile(kid);
    const file = s.exportJson();

    const t = new SaveStore(new MemoryStorage());
    await t.load();
    await t.importJson(file);
    expect(t.profiles[0].name).toBe('Vivian');
    await expect(t.importJson('{"hello":1}')).rejects.toThrow();
  });

  it('recovers from a corrupted save', async () => {
    const storage = new MemoryStorage();
    storage.data.set('keyquest.save', '{not json');
    const s = new SaveStore(storage);
    expect((await s.load()).profiles).toEqual([]);
  });
});

describe('migrate', () => {
  it('fills in missing fields', () => {
    const d = migrate({ version: 1, profiles: [{ id: 'x', name: 'Ada' }, { bogus: true }] });
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.profiles).toHaveLength(1);
    expect(d.profiles[0]).toMatchObject({ coins: 0, animal: 'bunny', stars: {} });
    expect(d.settings.volume).toBeGreaterThan(0);
  });

  it('refuses saves from a newer game version', () => {
    expect(() => migrate({ version: SAVE_VERSION + 1 })).toThrow(SaveTooNewError);
  });
});

describe('cleanName', () => {
  it('keeps letters, capitalizes, and trims', () => {
    expect(cleanName('  violet ')).toBe('Violet');
    expect(cleanName('<b>zoe</b>1')).toBe('Bzoeb');
    expect(cleanName('René')).toBe('René');
    expect(cleanName('!!!')).toBe('Player');
  });
});
