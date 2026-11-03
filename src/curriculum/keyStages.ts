// The order keys are introduced: home row first, in mirrored pairs, then outward.

export interface KeyStage {
  id: string;
  world: number;
  keys: string[]; // characters introduced in this stage
  name: string; // what Juni calls it
}

export const KEY_STAGES: readonly KeyStage[] = [
  { id: 'fj', world: 1, keys: ['f', 'j'], name: 'F and J, the bumpy keys' },
  { id: 'dk', world: 1, keys: ['d', 'k'], name: 'D and K' },
  { id: 'sl', world: 1, keys: ['s', 'l'], name: 'S and L' },
  { id: 'a;', world: 1, keys: ['a', ';'], name: 'A and semicolon' },
  { id: 'gh', world: 1, keys: ['g', 'h'], name: 'G and H, the stretchy keys' },
  { id: 'ei', world: 2, keys: ['e', 'i'], name: 'E and I' },
  { id: 'ru', world: 2, keys: ['r', 'u'], name: 'R and U' },
  { id: 'ty', world: 2, keys: ['t', 'y'], name: 'T and Y' },
  { id: 'wo', world: 2, keys: ['w', 'o'], name: 'W and O' },
  { id: 'qp', world: 2, keys: ['q', 'p'], name: 'Q and P' },
  { id: 'vm', world: 3, keys: ['v', 'm'], name: 'V and M' },
  { id: 'c,', world: 3, keys: ['c', ','], name: 'C and comma' },
  { id: 'x.', world: 3, keys: ['x', '.'], name: 'X and period' },
  { id: 'z/', world: 3, keys: ['z', '/'], name: 'Z and slash' },
  { id: 'bn', world: 3, keys: ['b', 'n'], name: 'B and N' },
  { id: 'capsL', world: 4, keys: [...'ASDFGQWERTZXCVB'], name: 'big letters on the left, with the right shift' },
  { id: 'capsR', world: 4, keys: [...'HJKLYUIOPNM'], name: 'big letters on the right, with the left shift' },
  { id: '?!', world: 4, keys: ['?', '!'], name: 'question marks and exclamation marks' },
  { id: '47', world: 5, keys: ['4', '7'], name: '4 and 7' },
  { id: '38', world: 5, keys: ['3', '8'], name: '3 and 8' },
  { id: '29', world: 5, keys: ['2', '9'], name: '2 and 9' },
  { id: '10', world: 5, keys: ['1', '0'], name: '1 and 0' },
  { id: '56', world: 5, keys: ['5', '6'], name: '5 and 6, the stretchy numbers' },
  { id: 'quotes', world: 6, keys: ["'", '"'], name: 'apostrophes and quotes' },
  { id: 'dash', world: 6, keys: ['-', '_'], name: 'dash and underscore' },
  { id: 'parens', world: 6, keys: ['(', ')'], name: 'round brackets' },
  { id: 'at', world: 6, keys: ['@', '#'], name: 'at and hash' },
  { id: 'money', world: 6, keys: ['$', '%'], name: 'dollar and percent' },
  { id: 'amp', world: 6, keys: ['&', '*'], name: 'and-sign and star' },
  { id: 'math', world: 6, keys: ['=', '+', ':'], name: 'equals, plus and colon' },
  { id: 'square', world: 6, keys: ['[', ']'], name: 'square brackets' },
  { id: 'acute', world: 7, keys: ['é'], name: 'e with an accent' },
  { id: 'tilde', world: 7, keys: ['ñ', 'ü'], name: 'n with a squiggle and u with dots' },
  { id: 'marks', world: 7, keys: ['©', '™'], name: 'copyright and trademark' },
  { id: 'upside', world: 7, keys: ['¿', '¡'], name: 'upside-down question and exclamation marks' },
  { id: 'extras', world: 7, keys: ['°', '÷', 'ß'], name: 'degrees, divide and sharp s' },
];

/** Every character unlocked up to and including the given stage. */
export function keysThrough(stageId: string): string[] {
  const out: string[] = [' '];
  for (const s of KEY_STAGES) {
    out.push(...s.keys);
    if (s.id === stageId) return out;
  }
  throw new Error(`Unknown key stage ${stageId}`);
}
