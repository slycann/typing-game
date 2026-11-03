import { describe, expect, it } from 'vitest';
import { KEY_STAGES, keysThrough } from '../../src/curriculum/keyStages';
import { itemCount, levelById, levelContent, WORLDS } from '../../src/curriculum/worlds';
import { applyResult, currentLevelIndex, furthestWorld, isLevelUnlocked } from '../../src/engine/Progress';
import { Rng } from '../../src/engine/Rng';
import { migrate } from '../../src/save/migrations';

const w1 = WORLDS[0];

function freshProfile() {
  return migrate({ version: 1, profiles: [{ id: 'p', name: 'Kid' }] }).profiles[0];
}

describe('World 1', () => {
  it('has a dozen levels ending in the Grumble boss', () => {
    expect(w1.levels).toHaveLength(12);
    expect(w1.levels.at(-1)!.game).toBe('boss');
    expect(levelById('w1-3').game).toBe('bubblePop');
  });

  it('level content only uses unlocked keys, in the right amount (every world)', () => {
    for (const level of WORLDS.flatMap((w) => w.levels)) {
      const keys = keysThrough(level.stage);
      for (const age of ['5-6', '7-8', '9-10'] as const) {
        for (let seed = 1; seed < 15; seed++) {
          const items = levelContent(level, age, new Rng(seed));
          expect(items).toHaveLength(itemCount(level.game, age));
          for (const item of items) for (const c of item) expect(keys, `${level.id} "${item}"`).toContain(c);
          if (level.content !== 'letters') expect(items.every((w) => w.length >= 2), `${level.id} ${items}`).toBe(true);
          for (let i = 2; i < items.length; i++) expect(items[i] === items[i - 1] && items[i] === items[i - 2]).toBe(false);
        }
      }
    }
  });

  it('word levels use real words', () => {
    const items = levelContent(levelById('w1-12'), '7-8', new Rng(4));
    expect(items.every((w) => w.length >= 2)).toBe(true);
    expect(new Set(items).size).toBeGreaterThan(4);
  });
});

describe('Worlds 2–7', () => {
  it('has seven worlds of twelve levels, each ending with Grumble', () => {
    expect(WORLDS.map((w) => w.name)).toEqual(['Home Row Meadow', 'Treetop Village', 'Sandy Bottom Beach', 'Shifty Mountains', 'Rocket Ridge', 'Symbol Sea', 'Option Observatory']);
    for (const w of WORLDS) {
      expect(w.levels).toHaveLength(12);
      expect(w.levels.at(-1)!.game).toBe('boss');
    }
  });

  it('introduces every key stage somewhere', () => {
    const introduced = new Set(WORLDS.flatMap((w) => w.levels).filter((l) => l.newKeys.length).map((l) => l.stage));
    for (const s of KEY_STAGES) expect(introduced, s.id).toContain(s.id);
  });

  it('builds capitals, numbers, symbols and accents into words and sentences', () => {
    const r = new Rng(5);
    expect(levelContent(levelById('w4-11'), '9-10', r).every((s) => /^[A-Z]/.test(s))).toBe(true);
    expect(levelContent(levelById('w5-8'), '9-10', r).some((s) => /\d/.test(s))).toBe(true);
    expect(levelContent(levelById('w6-2'), '9-10', r).some((s) => /['"]/.test(s))).toBe(true);
    expect(levelContent(levelById('w7-2'), '9-10', r).some((s) => s.includes('é'))).toBe(true);
  });

  it('opens a world once the previous Grumble is cheered up', () => {
    const p = freshProfile();
    const w2first = levelById('w2-1');
    expect(isLevelUnlocked(p, w2first)).toBe(false);
    p.stars['w1-12'] = 1;
    expect(isLevelUnlocked(p, w2first)).toBe(true);
    expect(furthestWorld(p)).toBe(2);
  });
});

describe('progress', () => {
  it('unlocks levels one star at a time', () => {
    const p = freshProfile();
    expect(isLevelUnlocked(p, w1.levels[0])).toBe(true);
    expect(isLevelUnlocked(p, w1.levels[1])).toBe(false);
    expect(currentLevelIndex(p, 1)).toBe(0);
    p.stars['w1-1'] = 1;
    expect(isLevelUnlocked(p, w1.levels[1])).toBe(true);
    expect(currentLevelIndex(p, 1)).toBe(1);
  });

  it('keeps the best stars and adds coins, key stats and stickers', () => {
    const p = freshProfile();
    const base = { levelId: 'w1-1', coins: 5, correct: 10, keystrokes: 12, bestStreak: 6, elapsedMs: 1000, perChar: new Map([['f', { hits: 5, misses: 1, totalMs: 900 }]]), rescued: ['f', 'j'] };
    const a = applyResult(p, { ...base, stars: 2 });
    expect(a).toEqual({ newBest: true, newStickers: ['f', 'j'], firstClear: true });
    const b = applyResult(p, { ...base, stars: 1 });
    expect(b).toEqual({ newBest: false, newStickers: [], firstClear: false });
    expect(p.stars['w1-1']).toBe(2);
    expect(p.coins).toBe(10);
    expect(p.keyStats.f).toEqual({ hits: 10, misses: 2, totalMs: 1800 });
    expect(p.bestStreak).toBe(6);
  });
});
