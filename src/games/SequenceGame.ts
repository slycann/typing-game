import { TypingSession } from '../engine/TypingSession';
import type { KeyInputEvent } from '../input/KeyboardInput';
import { GameBase } from './GameBase';

/**
 * Games where you type one word or sentence after another at your own pace (Word Train, Bake Shop,
 * Story Pages). Subclasses only draw; this handles the typing, scoring and pacing.
 */
export abstract class SequenceGame extends GameBase {
  protected idx = 0;
  protected session: TypingSession | null = null;
  private busy = false;

  /** Set up the visuals for item `i` (its text is `text`). */
  protected abstract showItem(text: string, i: number): void;
  /** The character at `index` was typed correctly. */
  protected abstract charTyped(index: number, ch: string): void;
  /** A wrong key while waiting for the character at `index`. */
  protected abstract charMissed(index: number): void;
  /** Item `i` is finished: celebrate, then call `next`. */
  protected abstract itemDone(i: number, next: () => void): void;

  protected begin(): void {
    this.idx = 0;
    this.setProgress(0, this.items.length);
    this.startItem();
  }

  private startItem(): void {
    this.session = new TypingSession(this.items[this.idx]);
    this.busy = false;
    this.showItem(this.items[this.idx], this.idx);
    this.guide(this.session.expected);
    this.updateDebug();
  }

  protected nextExpected(): string | null {
    return this.playing && !this.busy ? (this.session?.expected ?? null) : null;
  }

  protected onChar(e: KeyInputEvent): void {
    if (this.busy || !this.session) return;
    const out = this.session.input(this.typedChar(e), e.time);
    if (out.result === 'wrong') {
      this.miss(out.expected, e);
      this.charMissed(out.index);
      return;
    }
    if (out.result !== 'correct') return;
    this.hit(out.expected!, e);
    this.charTyped(out.index, out.expected!);
    if (!out.done) return this.guide(this.session.expected);
    this.busy = true;
    this.idx++;
    this.setProgress(this.idx, this.items.length);
    this.guide(null);
    this.itemDone(this.idx - 1, () => (this.idx >= this.items.length ? void this.finish(900) : this.startItem()));
  }
}
