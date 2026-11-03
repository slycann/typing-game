// Tracks one run of typing a target text: where the child is, what they got right,
// and the accuracy/speed numbers used for stars and leaderboards.

export type InputResult = 'correct' | 'wrong' | 'ignored';

export interface InputOutcome {
  result: InputResult;
  expected: string | null;
  typed: string;
  index: number; // index of the character that was being typed
  done: boolean;
}

export interface CharStat {
  hits: number;
  misses: number;
  totalMs: number; // time spent finding this character on correct presses
}

export interface SessionOptions {
  /** Kid mode: a wrong key doesn't move on; the child tries again. */
  blockOnError?: boolean;
  /** Accept the wrong case (used while Caps Lock is on so it doesn't feel like a mistake). */
  ignoreCase?: boolean;
}

export class TypingSession {
  readonly target: string;
  index = 0;
  keystrokes = 0;
  correct = 0;
  errors = 0;
  startTime: number | null = null;
  endTime: number | null = null;
  /** Positions where at least one mistake happened. */
  readonly missedAt = new Set<number>();
  readonly perChar = new Map<string, CharStat>();
  private lastCorrectTime: number | null = null;
  private opts: Required<SessionOptions>;

  constructor(target: string, opts: SessionOptions = {}) {
    if (target.length === 0) throw new Error('TypingSession needs a non-empty target');
    this.target = target;
    this.opts = { blockOnError: true, ignoreCase: false, ...opts };
  }

  get expected(): string | null {
    return this.index < this.target.length ? this.target[this.index] : null;
  }

  get done(): boolean {
    return this.index >= this.target.length;
  }

  setIgnoreCase(on: boolean): void {
    this.opts.ignoreCase = on;
  }

  input(typed: string, time: number): InputOutcome {
    const expected = this.expected;
    const index = this.index;
    if (expected === null) return { result: 'ignored', expected, typed, index, done: true };

    if (this.startTime === null) {
      this.startTime = time;
      this.lastCorrectTime = time;
    }
    this.keystrokes++;
    const stat = this.statFor(expected);
    const matches =
      typed === expected || (this.opts.ignoreCase && typed.toLowerCase() === expected.toLowerCase());

    if (matches) {
      this.correct++;
      stat.hits++;
      stat.totalMs += time - (this.lastCorrectTime ?? time);
      this.lastCorrectTime = time;
      this.index++;
      if (this.done) this.endTime = time;
      return { result: 'correct', expected, typed, index, done: this.done };
    }

    this.errors++;
    stat.misses++;
    this.missedAt.add(index);
    if (!this.opts.blockOnError) {
      this.index++;
      if (this.done) this.endTime = time;
    }
    return { result: 'wrong', expected, typed, index, done: this.done };
  }

  /** Share of keystrokes that were right (1 before anything is typed). */
  accuracy(): number {
    return this.keystrokes === 0 ? 1 : this.correct / this.keystrokes;
  }

  elapsedMs(now: number): number {
    if (this.startTime === null) return 0;
    return (this.endTime ?? now) - this.startTime;
  }

  /** Words per minute, using the standard 5 characters = 1 word. */
  wpm(now: number): number {
    return wpmFor(this.correct, this.elapsedMs(now));
  }

  private statFor(ch: string): CharStat {
    let s = this.perChar.get(ch);
    if (!s) {
      s = { hits: 0, misses: 0, totalMs: 0 };
      this.perChar.set(ch, s);
    }
    return s;
  }
}

export function wpmFor(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return correctChars / 5 / (elapsedMs / 60000);
}

/** 1–3 stars from accuracy. Little ones get gentler thresholds. */
export function starsForAccuracy(accuracy: number, ageBand: AgeBandLike = '7-8'): number {
  const [one, two, three] = STAR_THRESHOLDS[ageBand];
  if (accuracy >= three) return 3;
  if (accuracy >= two) return 2;
  if (accuracy >= one) return 1;
  return 0;
}

type AgeBandLike = '5-6' | '7-8' | '9-10';

const STAR_THRESHOLDS: Record<AgeBandLike, [number, number, number]> = {
  '5-6': [0.5, 0.75, 0.9],
  '7-8': [0.6, 0.8, 0.93],
  '9-10': [0.7, 0.85, 0.95],
};
