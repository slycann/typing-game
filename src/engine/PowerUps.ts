import type { GameKind } from '../curriculum/worlds';
import { wordsFrom } from '../curriculum/wordBank';
import type { Rng } from './Rng';

export type PowerUpId = 'slowmo' | 'freeze' | 'shield' | 'rainbow' | 'big' | 'glow';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  color: number;
  /** 0 = lasts the rest of the level (or until used). */
  ms: number;
  says: string;
  /** Words to type to switch it on; the first one made of unlocked keys wins. */
  words: string[];
}

export const POWERUPS: Record<PowerUpId, PowerUpDef> = {
  slowmo: { id: 'slowmo', name: 'Snail Slow-Mo', color: 0x9b5de5, ms: 8000, says: 'Everything goes slooow!', words: ['slow', 'snail', 'slug', 'sag', 'lag'] },
  freeze: { id: 'freeze', name: 'Freeze Frame', color: 0x7ee8fa, ms: 4000, says: 'Freeze!', words: ['ice', 'cold', 'freeze', 'hush', 'halt', 'hall'] },
  shield: { id: 'shield', name: 'Umbrella Shield', color: 0x3a86ff, ms: 0, says: 'Your next oops is forgiven!', words: ['safe', 'shield', 'fall', 'shh'] },
  rainbow: { id: 'rainbow', name: 'Rainbow Streak', color: 0xff5fa2, ms: 0, says: 'Double coins!', words: ['rainbow', 'glad', 'flag'] },
  big: { id: 'big', name: 'Big Letters', color: 0xff9a3c, ms: 10000, says: 'Big letters!', words: ['big', 'huge', 'jab', 'add'] },
  glow: { id: 'glow', name: 'Helper Glow', color: 0xffd23f, ms: 15000, says: 'All the helpers are back!', words: ['glow', 'help', 'lamp', 'flash'] },
};

/** A new power-up every this many correct keys in a row. */
export const STREAK_FOR_POWERUP = 10;

/** Typed power-ups only appear in the action games; the calm games get automatic ones. */
export function powerUpsFor(game: GameKind): PowerUpId[] {
  if (typedActivation(game)) return ['slowmo', 'freeze', 'shield', 'rainbow', 'big'];
  return ['shield', 'rainbow', 'glow'];
}

export function typedActivation(game: GameKind): boolean {
  return game === 'bubblePop' || game === 'boss' || game === 'fruitCatch';
}

/** The word a child types to switch a power-up on, using only keys they know. */
export function triggerWord(id: PowerUpId, keys: string[], rng: Rng): string {
  const allowed = new Set(keys);
  const own = POWERUPS[id].words.find((w) => [...w].every((c) => allowed.has(c)));
  if (own) return own;
  const fallback = wordsFrom(keys).filter((w) => w.length >= 3 && w.length <= 5);
  return fallback.length ? rng.pick(fallback) : keys.filter((k) => /[a-z]/.test(k)).slice(0, 3).join('');
}
