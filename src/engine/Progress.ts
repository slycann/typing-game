import { WORLDS, type LevelDef } from '../curriculum/worlds';
import type { Profile } from '../save/types';
import type { CharStat } from './TypingSession';

export interface LevelResult {
  levelId: string;
  stars: number;
  coins: number;
  correct: number;
  keystrokes: number;
  bestStreak: number;
  elapsedMs: number;
  perChar: ReadonlyMap<string, CharStat>;
  /** Letterlings (or friends) brought home by this result. */
  rescued: string[];
}

export interface ApplyOutcome {
  newBest: boolean;
  newStickers: string[];
  firstClear: boolean;
}

/** A level is open if it's the first one, or the one before it has at least one star. */
export function isLevelUnlocked(profile: Profile, level: LevelDef): boolean {
  if (level.index === 0) return true;
  const world = WORLDS.find((w) => w.id === level.world)!;
  const prev = world.levels[level.index - 1];
  return (profile.stars[prev.id] ?? 0) >= 1;
}

/** Where the player's avatar should stand: the first open level without stars, else the last open one. */
export function currentLevelIndex(profile: Profile, worldId: number): number {
  const levels = WORLDS.find((w) => w.id === worldId)!.levels;
  let last = 0;
  for (const l of levels) {
    if (!isLevelUnlocked(profile, l)) break;
    last = l.index;
    if (!(profile.stars[l.id] >= 1)) return l.index;
  }
  return last;
}

export function totalStars(profile: Profile): number {
  return Object.values(profile.stars).reduce((a, b) => a + b, 0);
}

export function coinsFor(stars: number, boss: boolean): number {
  return stars * 2 + 1 + (boss ? 10 : 0);
}

/** Fold a finished level into the player's saved progress. Mutates `profile`. */
export function applyResult(profile: Profile, r: LevelResult): ApplyOutcome {
  const before = profile.stars[r.levelId] ?? 0;
  profile.stars[r.levelId] = Math.max(before, r.stars);
  profile.coins += r.coins;
  profile.xp += r.correct;
  profile.playMs += r.elapsedMs;
  profile.bestStreak = Math.max(profile.bestStreak, r.bestStreak);
  mergeKeyStats(profile, r.perChar);
  const newStickers = r.rescued.filter((s) => !profile.stickers.includes(s));
  profile.stickers.push(...newStickers);
  return { newBest: r.stars > before, newStickers, firstClear: before === 0 && r.stars > 0 };
}

/** Add one run's per-key results into the player's lifetime key stats. Mutates `profile`. */
export function mergeKeyStats(profile: Profile, perChar: ReadonlyMap<string, CharStat>): void {
  for (const [ch, st] of perChar) {
    const k = (profile.keyStats[ch] ??= { hits: 0, misses: 0, totalMs: 0 });
    k.hits += st.hits;
    k.misses += st.misses;
    k.totalMs += st.totalMs;
  }
}
