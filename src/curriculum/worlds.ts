import { Rng } from '../engine/Rng';
import type { AgeBand } from '../save/types';
import { KEY_STAGES, keysThrough } from './keyStages';
import { NUMBER_NOUNS, OPTION_PHRASES, SHIFT_PHRASES, STORY_FRAMES, STORY_SLOTS, SYMBOL_PHRASES } from './phrases';
import { NAMES, wordsFrom } from './wordBank';

export type GameKind = 'fingerFitness' | 'keyHop' | 'bubblePop' | 'fruitCatch' | 'wordTrain' | 'bakeShop' | 'storyPages' | 'boss';
export type Content = 'letters' | 'words' | 'sentences';
/** What kind of typing a world is about; decides how words and sentences are built. */
export type WorldKind = 'lower' | 'shift' | 'numbers' | 'symbols' | 'option';

export interface LevelDef {
  id: string; // e.g. "w1-3"
  world: number;
  index: number; // 0-based position on the world map
  name: string;
  game: GameKind;
  stage: string; // KeyStage id: every key up to this stage is in play
  content: Content;
  newKeys: string[]; // keys this level introduces (rescued as Letterlings)
}

export interface WorldDef {
  id: number;
  name: string;
  kind: WorldKind;
  /** Two short pages shown the first time a player arrives. */
  story: [string, string];
  levels: LevelDef[];
}

export const GAME_NAMES: Record<GameKind, string> = {
  fingerFitness: 'Finger Fitness',
  keyHop: 'Key Hop',
  bubblePop: 'Bubble Pop',
  fruitCatch: 'Fruit Catch',
  wordTrain: 'Word Train',
  bakeShop: 'Bake Shop',
  storyPages: 'Story Pages',
  boss: "Grumble's Rainy Day",
};

export const GAME_SCENES: Record<GameKind, string> = {
  fingerFitness: 'FingerFitness',
  keyHop: 'KeyHop',
  bubblePop: 'BubblePop',
  fruitCatch: 'FruitCatch',
  wordTrain: 'WordTrain',
  bakeShop: 'BakeShop',
  storyPages: 'StoryPages',
  boss: 'GrumbleBoss',
};

type Row = [GameKind, string, Content, boolean]; // game, stage, content, introduces the stage's keys

function world(id: number, name: string, kind: WorldKind, story: [string, string], rows: Row[]): WorldDef {
  return {
    id,
    name,
    kind,
    story,
    levels: rows.map(([game, stage, content, intro], index) => ({
      id: `w${id}-${index + 1}`,
      world: id,
      index,
      name: `${id}-${index + 1}`,
      game,
      stage,
      content,
      newKeys: intro ? [...KEY_STAGES.find((s) => s.id === stage)!.keys] : [],
    })),
  };
}

export const WORLDS: readonly WorldDef[] = [
  world(1, 'Home Row Meadow', 'lower', ['', ''], [
    ['fingerFitness', 'fj', 'letters', true],
    ['keyHop', 'fj', 'letters', false],
    ['bubblePop', 'fj', 'letters', false],
    ['keyHop', 'dk', 'letters', true],
    ['bubblePop', 'dk', 'letters', false],
    ['fingerFitness', 'sl', 'letters', true],
    ['keyHop', 'sl', 'letters', false],
    ['bubblePop', 'a;', 'letters', true],
    ['keyHop', 'gh', 'letters', true],
    ['fingerFitness', 'gh', 'letters', false],
    ['bubblePop', 'gh', 'words', false],
    ['boss', 'gh', 'words', false],
  ]),
  world(2, 'Treetop Village', 'lower', [
    'Welcome to Treetop Village!\nThe top-row Letterlings are stuck up in the trees.',
    'Reach up with your fingers, then come\nright back home to the bumps. Let\'s go!',
  ], [
    ['fingerFitness', 'ei', 'letters', true],
    ['keyHop', 'ei', 'letters', false],
    ['fruitCatch', 'ru', 'letters', true],
    ['bubblePop', 'ru', 'letters', false],
    ['fingerFitness', 'ty', 'letters', true],
    ['keyHop', 'ty', 'letters', false],
    ['fruitCatch', 'wo', 'letters', true],
    ['wordTrain', 'wo', 'words', false],
    ['bubblePop', 'qp', 'letters', true],
    ['bakeShop', 'qp', 'words', false],
    ['storyPages', 'qp', 'sentences', false],
    ['boss', 'qp', 'words', false],
  ]),
  world(3, 'Sandy Bottom Beach', 'lower', [
    'Welcome to Sandy Bottom Beach!\nThe bottom-row Letterlings are hiding in the sand.',
    'Reach down for them, and remember:\ncomma and period live here too!',
  ], [
    ['fingerFitness', 'vm', 'letters', true],
    ['keyHop', 'vm', 'letters', false],
    ['fruitCatch', 'c,', 'letters', true],
    ['bubblePop', 'c,', 'letters', false],
    ['fingerFitness', 'x.', 'letters', true],
    ['keyHop', 'x.', 'letters', false],
    ['fruitCatch', 'z/', 'letters', true],
    ['wordTrain', 'z/', 'words', false],
    ['bubblePop', 'bn', 'letters', true],
    ['bakeShop', 'bn', 'words', false],
    ['storyPages', 'bn', 'sentences', false],
    ['boss', 'bn', 'words', false],
  ]),
  world(4, 'Shifty Mountains', 'shift', [
    'Welcome to Shifty Mountains!\nThe BIG Letterlings live way up high.',
    'Hold a shift key with your pinky\nto make a letter BIG. Use the shift on the other side!',
  ], [
    ['fingerFitness', 'capsL', 'letters', true],
    ['keyHop', 'capsL', 'letters', false],
    ['fruitCatch', 'capsL', 'letters', false],
    ['fingerFitness', 'capsR', 'letters', true],
    ['bubblePop', 'capsR', 'letters', false],
    ['keyHop', 'capsR', 'letters', false],
    ['wordTrain', 'capsR', 'words', false],
    ['fingerFitness', '?!', 'letters', true],
    ['fruitCatch', '?!', 'letters', false],
    ['bakeShop', '?!', 'words', false],
    ['storyPages', '?!', 'sentences', false],
    ['boss', '?!', 'words', false],
  ]),
  world(5, 'Rocket Ridge', 'numbers', [
    'Welcome to Rocket Ridge!\nThe number Letterlings are ready for blast-off.',
    'Numbers live on the top row.\nReach up, then come back home. 3, 2, 1, go!',
  ], [
    ['fingerFitness', '47', 'letters', true],
    ['keyHop', '47', 'letters', false],
    ['fruitCatch', '38', 'letters', true],
    ['bubblePop', '38', 'letters', false],
    ['fingerFitness', '29', 'letters', true],
    ['keyHop', '29', 'letters', false],
    ['fruitCatch', '10', 'letters', true],
    ['wordTrain', '10', 'words', false],
    ['bubblePop', '56', 'letters', true],
    ['bakeShop', '56', 'words', false],
    ['storyPages', '56', 'sentences', false],
    ['boss', '56', 'words', false],
  ]),
  world(6, 'Symbol Sea', 'symbols', [
    'Welcome to Symbol Sea!\nThe symbol Letterlings swim deep under the waves.',
    'Many of them need the shift key.\nTake a big breath and dive in!',
  ], [
    ['fingerFitness', 'quotes', 'letters', true],
    ['wordTrain', 'quotes', 'words', false],
    ['fingerFitness', 'dash', 'letters', true],
    ['fruitCatch', 'parens', 'letters', true],
    ['bubblePop', 'at', 'letters', true],
    ['keyHop', 'money', 'letters', true],
    ['fruitCatch', 'amp', 'letters', true],
    ['bubblePop', 'math', 'letters', true],
    ['fingerFitness', 'square', 'letters', true],
    ['bakeShop', 'square', 'words', false],
    ['storyPages', 'square', 'sentences', false],
    ['boss', 'square', 'words', false],
  ]),
  world(7, 'Option Observatory', 'option', [
    'Welcome to Option Observatory!\nThe secret Letterlings only come out at night.',
    'Hold the option key to find them.\nSome need two steps, like option-E then E for é!',
  ], [
    ['fingerFitness', 'acute', 'letters', true],
    ['wordTrain', 'acute', 'words', false],
    ['fingerFitness', 'tilde', 'letters', true],
    ['fruitCatch', 'tilde', 'letters', false],
    ['bubblePop', 'marks', 'letters', true],
    ['keyHop', 'marks', 'letters', false],
    ['fingerFitness', 'upside', 'letters', true],
    ['wordTrain', 'upside', 'words', false],
    ['fruitCatch', 'extras', 'letters', true],
    ['bakeShop', 'extras', 'words', false],
    ['storyPages', 'extras', 'sentences', false],
    ['boss', 'extras', 'words', false],
  ]),
];

export const LAST_WORLD = WORLDS.length;

export function worldById(id: number): WorldDef {
  return WORLDS[id - 1];
}

export function levelById(id: string): LevelDef {
  for (const w of WORLDS) {
    const l = w.levels.find((x) => x.id === id);
    if (l) return l;
  }
  throw new Error(`Unknown level ${id}`);
}

const AGE_INDEX: Record<AgeBand, number> = { '5-6': 0, '7-8': 1, '9-10': 2 };

const COUNTS: Record<GameKind, [number, number, number]> = {
  fingerFitness: [8, 12, 16],
  keyHop: [10, 14, 18],
  bubblePop: [12, 18, 24],
  fruitCatch: [10, 14, 18],
  wordTrain: [4, 6, 8],
  bakeShop: [5, 6, 8],
  storyPages: [3, 4, 5],
  boss: [6, 9, 12],
};

export function itemCount(game: GameKind, age: AgeBand): number {
  return COUNTS[game][AGE_INDEX[age]];
}

export function ageIndex(age: AgeBand): number {
  return AGE_INDEX[age];
}

const fitsIn = (keys: Set<string>) => (s: string) => [...s].every((c) => keys.has(c));

/** Draw `count` items from a pool, reshuffling as needed, never the same twice in a row. */
function deal(pool: string[], count: number, rng: Rng, prefer: (s: string) => boolean = () => false): string[] {
  const out: string[] = [];
  const preferred = pool.filter(prefer);
  let bag: string[] = [];
  while (out.length < count && pool.length) {
    const fromPreferred = preferred.length && rng.next() < 0.7;
    const w = fromPreferred ? rng.pick(preferred) : (bag.length ? bag : (bag = rng.shuffle(pool))).pop()!;
    if (w !== out[out.length - 1] || pool.length === 1) out.push(w);
  }
  return out;
}

function capitalize(w: string): string {
  return w[0].toUpperCase() + w.slice(1);
}

/** Whole "words" (or phrases) for the kind of world this is, typeable with `keys`. */
function wordPool(kind: WorldKind, keys: string[], rng: Rng): string[] {
  const set = new Set([...keys, ' ']);
  const fits = fitsIn(set);
  const lower = wordsFrom(keys).filter((w) => w.length >= 2);
  return wordPoolRaw(kind, keys, rng, fits, lower).filter((w) => w.length >= 2);
}

function wordPoolRaw(kind: WorldKind, keys: string[], rng: Rng, fits: (s: string) => boolean, lower: string[]): string[] {
  switch (kind) {
    case 'lower':
      return lower;
    case 'shift':
      return [...lower.map(capitalize), ...NAMES, ...SHIFT_PHRASES].filter(fits);
    case 'numbers': {
      const digits = keys.filter((k) => /\d/.test(k));
      const nouns = NUMBER_NOUNS.filter(fits);
      const out: string[] = [];
      const nonZero = digits.filter((d) => d !== '0');
      const twoDigits = () => rng.pick(nonZero) + rng.pick(digits);
      for (let i = 0; i < 40 && nonZero.length; i++) {
        // "47" on its own, or "3 cats" (never "0 cats" or "1 cats")
        if (nouns.length && rng.next() < 0.6) {
          const small = nonZero.filter((d) => d !== '1');
          out.push(`${small.length && rng.next() < 0.6 ? rng.pick(small) : twoDigits()} ${rng.pick(nouns)}`);
        } else out.push(twoDigits());
      }
      return out;
    }
    case 'symbols':
      return SYMBOL_PHRASES.filter(fits);
    case 'option':
      return OPTION_PHRASES.filter(fits);
  }
}

/** Simple sentences for Story Pages, with capitals and full stops once those keys are known. */
function sentencePool(kind: WorldKind, keys: string[], rng: Rng): string[] {
  const set = new Set([...keys, ' ']);
  const fits = fitsIn(set);
  const caps = kind !== 'lower';
  const period = set.has('.');
  const slot = (name: string): string | null => {
    const list = (name === 'name' ? (caps ? NAMES : []) : STORY_SLOTS[name] ?? []).filter(fits);
    return list.length ? rng.pick(list) : null;
  };
  const out: string[] = [];
  if (kind === 'numbers') {
    const digits = keys.filter((k) => /\d/.test(k));
    const names = NAMES.filter(fits);
    const nouns = NUMBER_NOUNS.filter(fits);
    for (let i = 0; i < 20 && names.length && nouns.length; i++) {
      out.push(`${rng.pick(names)} has ${rng.pick(digits.filter((d) => d !== '0'))} ${rng.pick(nouns)}${period ? '.' : ''}`);
    }
  }
  for (let tries = 0; tries < 200 && out.length < 30; tries++) {
    const frame = rng.pick(STORY_FRAMES);
    const words = frame.map((w) => (w.startsWith('{') ? slot(w.slice(1, -1)) : fits(w) ? w : null));
    if (words.some((w) => w === null)) continue;
    let s = (words as string[]).join(' ');
    if (caps) s = capitalize(s);
    if (period) {
      const ends = ['.', ...(set.has('!') ? ['!'] : [])];
      s += rng.pick(ends);
    }
    if (kind === 'symbols' || kind === 'option') {
      const extra = wordPool(kind, keys, rng);
      if (extra.length) s = `${s} ${rng.pick(extra)}`;
    }
    if (fits(s)) out.push(s);
  }
  return out.length ? [...new Set(out)] : lower3(keys, rng);
}

function lower3(keys: string[], rng: Rng): string[] {
  const words = wordsFrom(keys).filter((w) => w.length >= 2);
  return Array.from({ length: 6 }, () => Array.from({ length: 3 }, () => rng.pick(words)).join(' '));
}

/**
 * What to type in a level: single keys (weighted toward the newest ones), whole words or
 * phrases, or sentences. Only unlocked keys ever appear.
 */
export function levelContent(level: LevelDef, age: AgeBand, rng: Rng): string[] {
  const count = itemCount(level.game, age);
  const keys = keysThrough(level.stage).filter((k) => k !== ' ');
  const stage = KEY_STAGES.find((s) => s.id === level.stage)!;
  const kind = worldById(level.world).kind;
  const newest = (s: string) => [...s].some((c) => stage.keys.includes(c));

  if (level.content === 'words') {
    const pool = wordPool(kind, keys, rng);
    if (pool.length >= 3) return deal(pool, count, rng, newest);
  }
  if (level.content === 'sentences') return deal(sentencePool(kind, keys, rng), count, rng, newest);

  // Single keys. Review keys come from this world (plus the home row for the youngest worlds).
  const worldKeys = keys.filter((k) => KEY_STAGES.find((s) => s.keys.includes(k))!.world === level.world);
  const review = worldKeys.length > stage.keys.length ? worldKeys : keys;
  const withSpace = level.game === 'keyHop' || level.game === 'fingerFitness';
  const out: string[] = [];
  while (out.length < count) {
    let ch = rng.next() < 0.6 ? rng.pick(stage.keys) : rng.pick(review);
    if (withSpace && out.length > 1 && out.length % 5 === 4) ch = ' ';
    const n = out.length;
    if (n >= 2 && out[n - 1] === ch && out[n - 2] === ch) continue;
    out.push(ch);
  }
  return out;
}
