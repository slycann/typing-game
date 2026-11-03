import { describe, expect, it } from 'vitest';
import { keysThrough } from '../../src/curriculum/keyStages';
import { itemCount, levelById, levelContent, WORLDS } from '../../src/curriculum/worlds';
import { applyResult, currentLevelIndex, isLevelUnlocked } from '../../src/engine/Progress';
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

  it('level content only uses unlocked keys, in the right amount', () => {
    for (const level of w1.levels) {
      const keys = keysThrough(level.stage);
      for (const age of ['5-6', '7-8', '9-10'] as const) {
        for (let seed = 1; seed < 15; seed++) {
          const items = levelContent(level, age, new Rng(seed));
          expect(items).toHaveLength(itemCount(level.game, age));
          for (const item of items) for (const c of item) expect(keys, `${level.id} ${item}`).toContain(c);
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
