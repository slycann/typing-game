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
