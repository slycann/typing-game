import { KEY_STAGES, keysThrough } from '../curriculum/keyStages';
import { WORLDS } from '../curriculum/worlds';
import type { KeyStat, Profile } from '../save/types';

/** How well a key is known, shown as a flower growing on it: seed → sprout → bud → flower → bloom. */
export type Bloom = 0 | 1 | 2 | 3 | 4;
export const BLOOM_NAMES = ['seed', 'sprout', 'bud', 'flower', 'bloom'] as const;

export function accuracyOf(s: KeyStat): number {
  const tries = s.hits + s.misses;
  return tries === 0 ? 0 : s.hits / tries;
}

export function avgMsOf(s: KeyStat): number {
  return s.hits === 0 ? Infinity : s.totalMs / s.hits;
}

export function masteryOf(s: KeyStat | undefined): Bloom {
  if (!s || s.hits < 5) return 0;
  const acc = accuracyOf(s);
  const ms = avgMsOf(s);
  if (s.hits >= 40 && acc >= 0.95 && ms <= 750) return 4;
  if (s.hits >= 20 && acc >= 0.9 && ms <= 1100) return 3;
  if (acc >= 0.8 && ms <= 1600) return 2;
  return 1;
}

/** 0 (needs practice) .. 1 (nailed it), for picking which keys to practise. */
export function strengthOf(s: KeyStat | undefined): number {
  if (!s || s.hits === 0) return 0;
  const speed = Math.max(0, Math.min(1, (2500 - avgMsOf(s)) / 2000));
  const confidence = Math.min(1, s.hits / 30);
  return (accuracyOf(s) * 0.6 + speed * 0.4) * (0.5 + confidence * 0.5);
}

/** Every key the player has reached so far (always at least F and J). */
export function unlockedKeys(p: Profile): string[] {
  let last = KEY_STAGES[0].id;
  for (const w of WORLDS) for (const l of w.levels) if ((p.stars[l.id] ?? 0) > 0) {
    if (KEY_STAGES.findIndex((s) => s.id === l.stage) > KEY_STAGES.findIndex((s) => s.id === last)) last = l.stage;
  }
  return keysThrough(last).filter((k) => k !== ' ');
}

/** The `n` keys that most need practice. */
export function weakestKeys(p: Profile, keys: string[], n: number): string[] {
  return [...keys].sort((a, b) => strengthOf(p.keyStats[a]) - strengthOf(p.keyStats[b])).slice(0, n);
}

export interface KeyHints {
  /** Show the letter on the screen keyboard. */
  label: boolean;
  /** Make the key glow when it's next. */
  glow: boolean;
}

/** Set from the Parent Zone: keep every hint on regardless of mastery. */
export const hintPrefs = { always: false };

/** Hints fade as a key is mastered; the youngest players always get full help. */
export function hintsFor(p: Profile, ch: string): KeyHints {
  if (p.ageBand === '5-6' || hintPrefs.always) return { label: true, glow: true };
  const m = masteryOf(p.keyStats[ch]);
  return { label: m < 3, glow: m < 4 };
}
