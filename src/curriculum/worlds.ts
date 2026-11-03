import { Rng } from '../engine/Rng';
import type { AgeBand } from '../save/types';
import { KEY_STAGES, keysThrough } from './keyStages';
import { wordsFrom } from './wordBank';

export type GameKind = 'fingerFitness' | 'keyHop' | 'bubblePop' | 'boss';

export interface LevelDef {
  id: string; // e.g. "w1-3"
  world: number;
  index: number; // 0-based position on the world map
  name: string;
  game: GameKind;
  stage: string; // KeyStage id: every key up to this stage is in play
  content: 'letters' | 'words';
  newKeys: string[]; // keys this level introduces (rescued as Letterlings)
}

export interface WorldDef {
  id: number;
  name: string;
  levels: LevelDef[];
}

export const GAME_NAMES: Record<GameKind, string> = {
  fingerFitness: 'Finger Fitness',
  keyHop: 'Key Hop',
  bubblePop: 'Bubble Pop',
  boss: "Grumble's Rainy Day",
};

export const GAME_SCENES: Record<GameKind, string> = {
  fingerFitness: 'FingerFitness',
  keyHop: 'KeyHop',
  bubblePop: 'BubblePop',
  boss: 'GrumbleBoss',
};

type Row = [GameKind, string, 'letters' | 'words', boolean]; // game, stage, content, introduces the stage's keys

function world(id: number, name: string, rows: Row[]): WorldDef {
  return {
    id,
    name,
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
  world(1, 'Home Row Meadow', [
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
];

/** Worlds that exist on the map but aren't built yet. */
export const COMING_SOON = ['Treetop Village', 'Sandy Bottom Beach', 'Shifty Mountains', 'Rocket Ridge', 'Symbol Sea', 'Option Observatory'];

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
  boss: [6, 9, 12],
};

export function itemCount(game: GameKind, age: AgeBand): number {
  return COUNTS[game][AGE_INDEX[age]];
}

export function ageIndex(age: AgeBand): number {
  return AGE_INDEX[age];
}

/**
 * What to type in a level: single letters (weighted toward the newest keys) or real words.
 * Never three of the same in a row; Key Hop and Finger Fitness sprinkle in the space bar.
 */
export function levelContent(level: LevelDef, age: AgeBand, rng: Rng): string[] {
  const count = itemCount(level.game, age);
  const keys = keysThrough(level.stage).filter((k) => k !== ' ');
  if (level.content === 'words') {
    const words = wordsFrom(keys).filter((w) => w.length >= 2);
    const out: string[] = [];
    let bag: string[] = [];
    while (out.length < count) {
      if (!bag.length) bag = rng.shuffle(words);
      const w = bag.pop()!;
      if (w !== out[out.length - 1]) out.push(w);
    }
    return out;
  }
  const stage = KEY_STAGES.find((s) => s.id === level.stage)!;
  const focus = stage.keys;
  const withSpace = level.game === 'keyHop' || level.game === 'fingerFitness';
  const out: string[] = [];
  while (out.length < count) {
    let ch = rng.next() < 0.6 ? rng.pick(focus) : rng.pick(keys);
    if (withSpace && out.length > 1 && out.length % 5 === 4) ch = ' ';
    const n = out.length;
    if (n >= 2 && out[n - 1] === ch && out[n - 2] === ch) continue;
    out.push(ch);
  }
  return out;
}
