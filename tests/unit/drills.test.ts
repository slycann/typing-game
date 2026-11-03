import { describe, expect, it } from 'vitest';
import { keysThrough } from '../../src/curriculum/keyStages';
import { letterDrill, wordDrill } from '../../src/curriculum/drills';
import { Rng } from '../../src/engine/Rng';

describe('drills', () => {
  it('only uses unlocked keys', () => {
    const keys = keysThrough('dk');
    for (let seed = 1; seed < 50; seed++) {
      const d = letterDrill(keys, ['d', 'k'], new Rng(seed));
      for (const c of d) expect(keys).toContain(c);
      expect(d.startsWith(' ') || d.endsWith(' ') || d.includes('  ')).toBe(false);
    }
  });

  it('changes with the seed and repeats with the same seed', () => {
    const keys = keysThrough('gh');
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) seen.add(letterDrill(keys, [], new Rng(seed), 5));
    expect(seen.size).toBeGreaterThan(15);
    expect(letterDrill(keys, [], new Rng(7))).toBe(letterDrill(keys, [], new Rng(7)));
  });

  it('builds real words once there are enough keys', () => {
    expect(wordDrill(keysThrough('fj'), new Rng(1))).toBeNull();
    const keys = keysThrough('gh');
    const words = wordDrill(keys, new Rng(3))!;
    expect(words).toBeTruthy();
    for (const c of words) expect(keys).toContain(c);
  });
});
