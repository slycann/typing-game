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

describe('grown-up player management', () => {
  it('resets progress but keeps the player', async () => {
    const storage = new MemoryStorage();
    const s = new SaveStore(storage);
    await s.load();
    const p = await s.createProfile(kid);
    await s.updateProfile(p.id, (pr) => {
      pr.coins = 40;
      pr.stars['w1-1'] = 3;
      pr.keyStats.f = { hits: 9, misses: 1, totalMs: 5000 };
      pr.seen.push('intro');
    });
    s.data.leaderboards.speed = [{ initials: 'VIV', score: 10, profileId: p.id, at: 1 }, { initials: 'ZED', score: 5, at: 2 }];
    await s.resetProgress(p.id);

    const t = new SaveStore(storage);
    await t.load();
    expect(t.getProfile(p.id)).toMatchObject({ name: 'Vivian', animal: 'bunny', coins: 0, stars: {}, keyStats: {}, seen: [] });
    expect(t.data.leaderboards.speed.map((e) => e.initials)).toEqual(['ZED']);
  });

  it('deletes a player and their scores for good', async () => {
    const storage = new MemoryStorage();
    const s = new SaveStore(storage);
    await s.load();
    const a = await s.createProfile(kid);
    const b = await s.createProfile({ ...kid, name: 'violet' });
    s.data.leaderboards.speed = [{ initials: 'VIV', score: 10, profileId: a.id, at: 1 }];
    await s.deleteProfile(a.id);

    const t = new SaveStore(storage);
    await t.load();
    expect(t.profiles.map((p) => p.name)).toEqual(['Violet']);
    expect(t.data.leaderboards.speed).toEqual([]);
    expect(t.getProfile(b.id)).toBeDefined();
  });
});
