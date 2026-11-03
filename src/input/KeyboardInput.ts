// The single source of keyboard truth for the whole game. Scenes and UI subscribe here
// instead of using Phaser's keyboard plugin, so every screen sees the same normalized events.

export interface KeyInputEvent {
  type: 'down' | 'up';
  code: string; // physical key (KeyA, Space, ShiftLeft...)
  key: string; // what the OS says was typed ("a", "A", "é", "Dead", "Enter"...)
  /** Printable character typed, '\n' for Return, '\t' for Tab; null for everything else. */
  char: string | null;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  ctrl: boolean;
  repeat: boolean;
  capsLock: boolean;
  time: number;
}

export interface KeyboardEventLike {
  code: string;
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  repeat: boolean;
  timeStamp?: number;
  getModifierState?: (key: string) => boolean;
}

export type KeyListener = (e: KeyInputEvent) => void;

export function normalizeKeyEvent(e: KeyboardEventLike, type: 'down' | 'up', time: number): KeyInputEvent {
  let char: string | null = null;
  if (!e.metaKey && !e.ctrlKey) {
    if (e.key === 'Enter') char = '\n';
    else if (e.key === 'Tab') char = '\t';
    else if ([...e.key].length === 1) char = e.key;
  }
  return {
    type,
    code: e.code,
    key: e.key,
    char,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    ctrl: e.ctrlKey,
    repeat: e.repeat,
    capsLock: e.getModifierState?.('CapsLock') ?? false,
    time,
  };
}

/** Keys whose browser default (scrolling, focus moves, quick-find, back navigation) we block. */
const BLOCKED = /^(Key[A-Z]|Digit\d|Space|Tab|Backspace|Enter|Quote|Slash|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Comma|Period|Arrow(Up|Down|Left|Right)|Alt(Left|Right))$/;

export function shouldBlockDefault(e: KeyboardEventLike): boolean {
  if (e.metaKey || e.ctrlKey) return false; // never steal Command/Control shortcuts
  if (e.key === 'Dead') return false; // let Option+e etc. start an accent
  return BLOCKED.test(e.code);
}

export class KeyboardInput {
  private listeners = new Set<KeyListener>();
  private held = new Map<string, KeyInputEvent>();
  private target: Window | null = null;
  private onFirstInput: (() => void) | null = null;

  start(target: Window = window, onFirstInput?: () => void): void {
    this.target = target;
    this.onFirstInput = onFirstInput ?? null;
    target.addEventListener('keydown', this.handleDown);
    target.addEventListener('keyup', this.handleUp);
    target.addEventListener('blur', this.releaseAll);
  }

  stop(): void {
    if (!this.target) return;
    this.target.removeEventListener('keydown', this.handleDown);
    this.target.removeEventListener('keyup', this.handleUp);
    this.target.removeEventListener('blur', this.releaseAll);
    this.target = null;
  }

  on(listener: KeyListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  heldCodes(): string[] {
    return [...this.held.keys()];
  }

  private emit(e: KeyInputEvent): void {
    for (const l of [...this.listeners]) l(e);
  }

  private handleDown = (ev: KeyboardEvent): void => {
    if (shouldBlockDefault(ev)) ev.preventDefault();
    if (this.onFirstInput) {
      this.onFirstInput();
      this.onFirstInput = null;
    }
    const e = normalizeKeyEvent(ev, 'down', performance.now());
    this.held.set(e.code, e);
    this.emit(e);
  };

  private handleUp = (ev: KeyboardEvent): void => {
    if (shouldBlockDefault(ev)) ev.preventDefault();
    const e = normalizeKeyEvent(ev, 'up', performance.now());
    this.held.delete(e.code);
    this.emit(e);
    // macOS swallows keyup for other keys while Command is held, so let go of everything.
    if (e.code === 'MetaLeft' || e.code === 'MetaRight') this.releaseAll();
  };

  private releaseAll = (): void => {
    const now = performance.now();
    for (const e of [...this.held.values()]) {
      this.held.delete(e.code);
      this.emit({ ...e, type: 'up', repeat: false, time: now });
    }
  };
}

export const keyboard = new KeyboardInput();
