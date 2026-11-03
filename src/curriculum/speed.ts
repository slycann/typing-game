import type { Rng } from '../engine/Rng';
import { wordsFrom } from './wordBank';

// Silly sentences for rocket races once enough keys are known. Every slot is filtered to
// unlocked keys; if a template can't be filled, the race uses a mix of known words instead.
const ADJ = ['happy', 'silly', 'big', 'little', 'red', 'funny', 'sleepy', 'jolly'];
const ANIMAL = ['duck', 'frog', 'cat', 'dog', 'pig', 'fish', 'bunny', 'owl'];
const VERB = ['jumps on', 'hugs', 'sees', 'likes', 'finds', 'kicks'];
const NOUN = ['cake', 'kite', 'tree', 'star', 'sun', 'hat', 'ball', 'drum'];
const TEMPLATES = [
  ['the', ADJ, ANIMAL, VERB, 'the', NOUN],
  ['a', ANIMAL, VERB, 'a', ADJ, NOUN],
  ['the', NOUN, 'is', ADJ],
];

/** A fresh passage for a speed test: `words` words (or letter groups) using only `keys`. */
export function speedPassage(keys: string[], rng: Rng, words = 30): string {
  const ok = new Set([...keys, ' ']);
  const fits = (w: string) => [...w].every((c) => ok.has(c));
  const fill = (slot: string | string[]): string | null => {
    if (typeof slot === 'string') return fits(slot) ? slot : null;
    const choices = slot.filter(fits);
    return choices.length ? rng.pick(choices) : null;
  };
  const pool = wordsFrom(keys).filter((w) => w.length >= 2);
  const letters = keys.filter((k) => k !== ' ');
  const out: string[] = [];
  while (out.length < words) {
    const sentence = rng.pick(TEMPLATES).map(fill);
    if (sentence.every((w) => w !== null)) {
      const words = sentence.join(' ').split(' ');
      // Once capitals and full stops are known, sentences get them too.
      const cap = words[0][0].toUpperCase() + words[0].slice(1);
      if (ok.has(cap[0])) words[0] = cap;
      if (ok.has('.')) words[words.length - 1] += '.';
      out.push(...words);
    } else if (pool.length >= 3) {
      const w = rng.pick(pool);
      if (w !== out[out.length - 1]) out.push(w);
    } else {
      out.push(Array.from({ length: rng.int(2, 3) }, () => rng.pick(letters)).join(''));
    }
  }
  return out.slice(0, words).join(' ');
}
