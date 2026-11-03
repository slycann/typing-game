import { Rng } from '../engine/Rng';
import { wordsFrom } from './wordBank';

/**
 * Short letter groups like "fj jf ffj", weighted toward the newest (focus) keys.
 * Groups never start or end with a space and are joined by single spaces.
 */
export function letterDrill(keys: string[], focus: string[], rng: Rng, groups = 4): string {
  const letters = keys.filter((k) => k !== ' ');
  const pool = focus.length ? focus.filter((k) => k !== ' ') : letters;
  const out: string[] = [];
  for (let g = 0; g < groups; g++) {
    const len = rng.int(2, 3);
    let group = '';
    for (let i = 0; i < len; i++) group += rng.next() < 0.7 ? rng.pick(pool) : rng.pick(letters);
    out.push(group);
  }
  return out.join(' ');
}

/** A few real words using only unlocked keys, or null if there aren't enough to be fun yet. */
export function wordDrill(keys: string[], rng: Rng, count = 3): string | null {
  const words = wordsFrom(keys).filter((w) => w.length >= 2);
  if (words.length < 4) return null;
  return rng.shuffle(words).slice(0, count).join(' ');
}
