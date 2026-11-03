// Classic typing-game targeting: the first letter you type picks the word (the most urgent one
// that starts with it), then you finish that word letter by letter.

export interface Target {
  text: string;
  typed: number;
}

export type TargetResult<T> =
  | { result: 'progress'; target: T; expected: string }
  | { result: 'complete'; target: T; expected: string }
  | { result: 'wrong'; expected: string | null };

export class WordTargeter<T extends Target> {
  active: T | null = null;

  /** `candidates` must be ordered most-urgent first (e.g. the lowest falling raindrop). */
  input(ch: string, candidates: readonly T[]): TargetResult<T> {
    if (this.active && !candidates.includes(this.active)) this.active = null; // it got away
    if (this.active) {
      const t = this.active;
      const expected = t.text[t.typed];
      if (ch !== expected) return { result: 'wrong', expected };
      t.typed++;
      if (t.typed >= t.text.length) {
        this.active = null;
        return { result: 'complete', target: t, expected };
      }
      return { result: 'progress', target: t, expected };
    }
    const t = candidates.find((c) => c.typed === 0 && c.text[0] === ch);
    if (!t) return { result: 'wrong', expected: this.expected(candidates) };
    t.typed = 1;
    if (t.text.length === 1) return { result: 'complete', target: t, expected: ch };
    this.active = t;
    return { result: 'progress', target: t, expected: ch };
  }

  /** The character the player should type next, for hints. */
  expected(candidates: readonly T[]): string | null {
    if (this.active && candidates.includes(this.active)) return this.active.text[this.active.typed];
    const first = candidates.find((c) => c.typed === 0);
    return first ? first.text[0] : null;
  }

  /** Forget a target that left the screen. */
  drop(t: T): void {
    if (this.active === t) this.active = null;
  }
}
