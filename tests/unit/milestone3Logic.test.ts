import { describe, expect, it } from 'vitest';
import { keysThrough } from '../../src/curriculum/keyStages';
import { speedPassage } from '../../src/curriculum/speed';
import { awardBadges, rankFor } from '../../src/engine/Achievements';
import { DAILY_BONUS, dayKey, lastWeek, markDaily } from '../../src/engine/Daily';
import { boardKey, cleanInitials, insertEntry, isAllowedInitials, qualifies, speedTier } from '../../src/engine/Leaderboard';
import { hintsFor, masteryOf, unlockedKeys, weakestKeys } from '../../src/engine/Mastery';
import { POWERUPS, triggerWord } from '../../src/engine/PowerUps';
import { Rng } from '../../src/engine/Rng';
import { migrate } from '../../src/save/migrations';
import type { LeaderboardEntry } from '../../src/save/types';

const kid = (age: '5-6' | '7-8' | '9-10' = '7-8') => migrate({ version: 1, profiles: [{ id: 'p', name: 'Kid', ageBand: age }] }).profiles[0];

describe('mastery', () => {
  it('grows from seed to bloom with practice', () => {
    expect(masteryOf(undefined)).toBe(0);
    expect(masteryOf({ hits: 3, misses: 0, totalMs: 900 })).toBe(0);
    expect(masteryOf({ hits: 10, misses: 5, totalMs: 20000 })).toBe(1);
    expect(masteryOf({ hits: 10, misses: 1, totalMs: 12000 })).toBe(2);
    expect(masteryOf({ hits: 25, misses: 1, totalMs: 25000 })).toBe(3);
    expect(masteryOf({ hits: 60, misses: 1, totalMs: 36000 })).toBe(4);
  });

  it('fades hints for mastered keys, except for the youngest players', () => {
    const p = kid('7-8');
    p.keyStats.f = { hits: 60, misses: 1, totalMs: 36000 };
    p.keyStats.j = { hits: 25, misses: 1, totalMs: 25000 };
    expect(hintsFor(p, 'f')).toEqual({ label: false, glow: false });
    expect(hintsFor(p, 'j')).toEqual({ label: false, glow: true });
    expect(hintsFor(p, 'd')).toEqual({ label: true, glow: true });
    const little = kid('5-6');
    little.keyStats = p.keyStats;
    expect(hintsFor(little, 'f')).toEqual({ label: true, glow: true });
  });

  it('finds unlocked and weakest keys', () => {
    const p = kid();
    expect(unlockedKeys(p)).toEqual(['f', 'j']);
    p.stars['w1-4'] = 2; // the D/K level
    expect(unlockedKeys(p)).toEqual(['f', 'j', 'd', 'k']);
    p.keyStats.f = { hits: 40, misses: 0, totalMs: 20000 };
    p.keyStats.j = { hits: 40, misses: 0, totalMs: 20000 };
    p.keyStats.d = { hits: 10, misses: 8, totalMs: 30000 };
    expect(weakestKeys(p, ['f', 'j', 'd', 'k'], 2)).toEqual(['k', 'd']);
  });
});

describe('leaderboard', () => {
  const e = (initials: string, score: number, at: number): LeaderboardEntry => ({ initials, score, at });

  it('keeps the top 10, earliest wins ties', () => {
    const board: LeaderboardEntry[] = [];
    for (let i = 1; i <= 10; i++) insertEntry(board, e('AAA', i, i));
    expect(qualifies(board, 1)).toBe(false);
    expect(qualifies(board, 1.5)).toBe(true);
    expect(insertEntry(board, e('NEW', 5, 99))).toBe(6);
    expect(board).toHaveLength(10);
    expect(board.at(-1)!.score).toBe(2);
    expect(insertEntry(board, e('LOW', 0.5, 100))).toBe(-1);
  });

  it('cleans and checks initials', () => {
    expect(cleanInitials('vi v1!')).toBe('VIV');
    expect(isAllowedInitials('viv')).toBe(true);
    expect(isAllowedInitials('ass')).toBe(false);
    expect(isAllowedInitials('')).toBe(false);
  });

  it('puts races in fair tiers', () => {
    expect(speedTier(keysThrough('gh'))).toBe('home-row');
    expect(speedTier(keysThrough('bn'))).toBe('letters');
    expect(boardKey('home-row', 30)).toBe('speed-home-row-30');
  });
});

describe('speed passages', () => {
  it('only use known keys and change every time', () => {
    for (const stage of ['fj', 'gh', 'bn']) {
      const keys = keysThrough(stage);
      const seen = new Set<string>();
      for (let seed = 1; seed <= 10; seed++) {
        const text = speedPassage(keys, new Rng(seed), 20);
        expect(text.split(' ')).toHaveLength(20);
        for (const c of text) expect(keys, `${stage}: ${text}`).toContain(c);
        seen.add(text);
      }
      expect(seen.size).toBe(10);
    }
  });

  it('use silly sentences once the keys allow', () => {
    const text = speedPassage(keysThrough('bn'), new Rng(3), 30);
    expect(text).toMatch(/\b(the|a)\b/);
  });
});

describe('power-ups', () => {
  it('trigger words only use known keys', () => {
    const keys = keysThrough('gh').filter((k) => k !== ' ');
    for (const id of Object.keys(POWERUPS) as (keyof typeof POWERUPS)[]) {
      const w = triggerWord(id, keys, new Rng(1));
      expect(w.length).toBeGreaterThanOrEqual(3);
      for (const c of w) expect(keys).toContain(c);
    }
  });
});

describe('daily adventure', () => {
  it('pays a bonus once all three are done, and resets the next day', () => {
    const p = kid();
    const mon = new Date(2026, 10, 2, 9);
    expect(markDaily(p, 'garden', mon)).toBe(false);
    expect(markDaily(p, 'level', mon)).toBe(false);
    expect(markDaily(p, 'level', mon)).toBe(false);
    expect(markDaily(p, 'race', mon)).toBe(true);
    expect(p.coins).toBe(DAILY_BONUS);
    const tue = new Date(2026, 10, 3, 9);
    expect(markDaily(p, 'race', tue)).toBe(false);
    expect(p.daily).toEqual({ day: dayKey(tue), done: ['race'] });
    expect(lastWeek(p, tue)).toEqual([false, false, false, false, false, true, true]);
  });
});

describe('ranks and badges', () => {
  it('ranks up with experience', () => {
    expect(rankFor(0).name).toBe('Sprout');
    expect(rankFor(600)).toMatchObject({ name: 'Explorer', next: 1200 });
    expect(rankFor(99999).next).toBeNull();
  });

  it('awards each badge once', () => {
    const p = kid();
    p.stars['w1-1'] = 3;
    expect(awardBadges(p).map((b) => b.id)).toEqual(['first-star', 'perfect']);
    expect(awardBadges(p)).toEqual([]);
  });
});
