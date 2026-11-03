// Mac (ANSI) keyboard layout: physical key positions, the finger that should press each key,
// and the characters each key types. Positions are in "key units" (one letter key = 1).

export type Finger = 'pinky' | 'ring' | 'middle' | 'index' | 'thumb';
export type Hand = 'left' | 'right';
export type KeyKind = 'char' | 'mod' | 'action';

export interface KeyDef {
  code: string; // KeyboardEvent.code
  label: string; // what is printed on the keycap
  shiftLabel?: string; // small label above the main one (number row, punctuation)
  kind: KeyKind;
  finger: Finger;
  hand: Hand;
  char?: string; // character typed without Shift
  shiftChar?: string; // character typed with Shift
  homeBump?: boolean; // F and J have bumps
}

export interface PlacedKey extends KeyDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const KEYBOARD_WIDTH_UNITS = 14.5;
export const KEYBOARD_HEIGHT_UNITS = 5;

const L: Hand = 'left';
const R: Hand = 'right';

function charKey(code: string, char: string, shiftChar: string, finger: Finger, hand: Hand): KeyDef {
  const isLetter = /^[a-z]$/.test(char);
  return {
    code,
    label: isLetter ? char.toUpperCase() : char,
    shiftLabel: isLetter ? undefined : shiftChar,
    kind: 'char',
    finger,
    hand,
    char,
    shiftChar,
    homeBump: code === 'KeyF' || code === 'KeyJ',
  };
}

function modKey(code: string, label: string, finger: Finger, hand: Hand, kind: KeyKind = 'mod'): KeyDef {
  return { code, label, kind, finger, hand };
}

type RowItem = [KeyDef, number];

const ROWS: RowItem[][] = [
  [
    [charKey('Backquote', '`', '~', 'pinky', L), 1],
    [charKey('Digit1', '1', '!', 'pinky', L), 1],
    [charKey('Digit2', '2', '@', 'ring', L), 1],
    [charKey('Digit3', '3', '#', 'middle', L), 1],
    [charKey('Digit4', '4', '$', 'index', L), 1],
    [charKey('Digit5', '5', '%', 'index', L), 1],
    [charKey('Digit6', '6', '^', 'index', R), 1],
    [charKey('Digit7', '7', '&', 'index', R), 1],
    [charKey('Digit8', '8', '*', 'middle', R), 1],
    [charKey('Digit9', '9', '(', 'ring', R), 1],
    [charKey('Digit0', '0', ')', 'pinky', R), 1],
    [charKey('Minus', '-', '_', 'pinky', R), 1],
    [charKey('Equal', '=', '+', 'pinky', R), 1],
    [modKey('Backspace', 'delete', 'pinky', R, 'action'), 1.5],
  ],
  [
    [modKey('Tab', 'tab', 'pinky', L, 'action'), 1.5],
    [charKey('KeyQ', 'q', 'Q', 'pinky', L), 1],
    [charKey('KeyW', 'w', 'W', 'ring', L), 1],
    [charKey('KeyE', 'e', 'E', 'middle', L), 1],
    [charKey('KeyR', 'r', 'R', 'index', L), 1],
    [charKey('KeyT', 't', 'T', 'index', L), 1],
    [charKey('KeyY', 'y', 'Y', 'index', R), 1],
    [charKey('KeyU', 'u', 'U', 'index', R), 1],
    [charKey('KeyI', 'i', 'I', 'middle', R), 1],
    [charKey('KeyO', 'o', 'O', 'ring', R), 1],
    [charKey('KeyP', 'p', 'P', 'pinky', R), 1],
    [charKey('BracketLeft', '[', '{', 'pinky', R), 1],
    [charKey('BracketRight', ']', '}', 'pinky', R), 1],
    [charKey('Backslash', '\\', '|', 'pinky', R), 1],
  ],
  [
    [modKey('CapsLock', 'caps lock', 'pinky', L), 1.75],
    [charKey('KeyA', 'a', 'A', 'pinky', L), 1],
    [charKey('KeyS', 's', 'S', 'ring', L), 1],
    [charKey('KeyD', 'd', 'D', 'middle', L), 1],
    [charKey('KeyF', 'f', 'F', 'index', L), 1],
    [charKey('KeyG', 'g', 'G', 'index', L), 1],
    [charKey('KeyH', 'h', 'H', 'index', R), 1],
    [charKey('KeyJ', 'j', 'J', 'index', R), 1],
    [charKey('KeyK', 'k', 'K', 'middle', R), 1],
    [charKey('KeyL', 'l', 'L', 'ring', R), 1],
    [charKey('Semicolon', ';', ':', 'pinky', R), 1],
    [charKey('Quote', "'", '"', 'pinky', R), 1],
    [modKey('Enter', 'return', 'pinky', R, 'action'), 1.75],
  ],
  [
    [modKey('ShiftLeft', 'shift', 'pinky', L), 2.25],
    [charKey('KeyZ', 'z', 'Z', 'pinky', L), 1],
    [charKey('KeyX', 'x', 'X', 'ring', L), 1],
    [charKey('KeyC', 'c', 'C', 'middle', L), 1],
    [charKey('KeyV', 'v', 'V', 'index', L), 1],
    [charKey('KeyB', 'b', 'B', 'index', L), 1],
    [charKey('KeyN', 'n', 'N', 'index', R), 1],
    [charKey('KeyM', 'm', 'M', 'index', R), 1],
    [charKey('Comma', ',', '<', 'middle', R), 1],
    [charKey('Period', '.', '>', 'ring', R), 1],
    [charKey('Slash', '/', '?', 'pinky', R), 1],
    [modKey('ShiftRight', 'shift', 'pinky', R), 2.25],
  ],
];

function buildLayout(): PlacedKey[] {
  const placed: PlacedKey[] = [];
  ROWS.forEach((row, y) => {
    let x = 0;
    for (const [def, w] of row) {
      placed.push({ ...def, x, y, w, h: 1 });
      x += w;
    }
  });

  // Bottom row: modifiers, the space bar and the inverted-T arrow cluster.
  const y = 4;
  const bottom: RowItem[] = [
    [modKey('Fn', 'fn', 'pinky', L), 1],
    [modKey('ControlLeft', 'control', 'pinky', L), 1],
    [modKey('AltLeft', 'option', 'thumb', L), 1],
    [modKey('MetaLeft', 'command', 'thumb', L), 1.25],
    [{ code: 'Space', label: '', kind: 'char', finger: 'thumb', hand: R, char: ' ', shiftChar: ' ' }, 5],
    [modKey('MetaRight', 'command', 'thumb', R), 1.25],
    [modKey('AltRight', 'option', 'thumb', R), 1],
  ];
  let x = 0;
  for (const [def, w] of bottom) {
    placed.push({ ...def, x, y, w, h: 1 });
    x += w;
  }
  placed.push({ ...modKey('ArrowLeft', '◀', 'index', R, 'action'), x, y: y + 0.5, w: 1, h: 0.5 });
  placed.push({ ...modKey('ArrowUp', '▲', 'middle', R, 'action'), x: x + 1, y, w: 1, h: 0.5 });
  placed.push({ ...modKey('ArrowDown', '▼', 'middle', R, 'action'), x: x + 1, y: y + 0.5, w: 1, h: 0.5 });
  placed.push({ ...modKey('ArrowRight', '▶', 'ring', R, 'action'), x: x + 2, y: y + 0.5, w: 1, h: 0.5 });
  return placed;
}

export const LAYOUT: readonly PlacedKey[] = buildLayout();

export const KEY_BY_CODE: ReadonlyMap<string, PlacedKey> = new Map(LAYOUT.map((k) => [k.code, k]));

/** Where each finger rests on the home row. */
export const HOME_KEYS: Record<Hand, Record<Finger, string>> = {
  left: { pinky: 'KeyA', ring: 'KeyS', middle: 'KeyD', index: 'KeyF', thumb: 'Space' },
  right: { index: 'KeyJ', middle: 'KeyK', ring: 'KeyL', pinky: 'Semicolon', thumb: 'Space' },
};

export interface KeyStroke {
  code: string;
  shift: boolean;
  /** Which Shift key to use (the one on the opposite hand). */
  shiftCode?: string;
  /** Hold Option (Mac) — the one on the opposite hand. */
  altCode?: string;
  /** Accent keys: after Option+code, let go and press this key. */
  then?: string;
}

// Mac Option-key characters taught in Option Observatory (US layout).
const OPTION_CHARS: Record<string, { code: string; shift?: boolean; then?: string }> = {
  é: { code: 'KeyE', then: 'KeyE' },
  ñ: { code: 'KeyN', then: 'KeyN' },
  ü: { code: 'KeyU', then: 'KeyU' },
  '©': { code: 'KeyG' },
  '™': { code: 'Digit2' },
  '°': { code: 'Digit8', shift: true },
  '÷': { code: 'Slash' },
  ß: { code: 'KeyS' },
  '¡': { code: 'Digit1' },
  '¿': { code: 'Slash', shift: true },
};

function buildCharMap(): Map<string, KeyStroke> {
  const map = new Map<string, KeyStroke>();
  for (const k of LAYOUT) {
    if (k.kind !== 'char' || !k.char) continue;
    if (!map.has(k.char)) map.set(k.char, { code: k.code, shift: false });
    if (k.shiftChar && k.shiftChar !== k.char && !map.has(k.shiftChar)) {
      map.set(k.shiftChar, {
        code: k.code,
        shift: true,
        shiftCode: k.hand === 'left' ? 'ShiftRight' : 'ShiftLeft',
      });
    }
  }
  map.set('\n', { code: 'Enter', shift: false });
  map.set('\t', { code: 'Tab', shift: false });
  for (const [ch, o] of Object.entries(OPTION_CHARS)) {
    const left = KEY_BY_CODE.get(o.code)!.hand === 'left';
    map.set(ch, {
      code: o.code,
      shift: !!o.shift,
      shiftCode: o.shift ? (left ? 'ShiftRight' : 'ShiftLeft') : undefined,
      altCode: left ? 'AltRight' : 'AltLeft',
      then: o.then,
    });
  }
  return map;
}

const CHAR_MAP = buildCharMap();

/** Every key to light up for a character: the key itself plus any Shift/Option to hold. */
export function strokeCodes(s: KeyStroke | null): string[] {
  if (!s) return [];
  return [s.code, ...(s.shiftCode ? [s.shiftCode] : []), ...(s.altCode ? [s.altCode] : [])];
}

const FRIEND = { pinky: 'Pip', ring: 'Rory', middle: 'Midge', index: 'Izzy', thumb: 'Thumbs' } as const;
const FINGER_WORD = { pinky: 'pinky', ring: 'ring', middle: 'middle', index: 'pointer', thumb: 'thumb' } as const;

/** A short, kid-friendly "how do I type this?" for hints and instructions. */
export function howToType(ch: string): string {
  const s = strokeForChar(ch);
  const key = s && KEY_BY_CODE.get(s.code);
  if (!s || !key) return '';
  const label = ch === ' ' ? 'the space bar' : key.kind === 'char' ? key.label.split(' ')[0] : key.label;
  const side = (code?: string) => (code?.endsWith('Right') ? 'right' : 'left');
  if (s.altCode) {
    const hold = `Hold the ${side(s.altCode)} option${s.shiftCode ? ' and shift' : ''} and press ${label}`;
    return s.then ? `${hold}, let go, then press ${label} again.` : `${hold}.`;
  }
  const finger = `${FRIEND[key.finger]}, your ${FINGER_WORD[key.finger]} finger`;
  if (s.shift) return `Hold the ${side(s.shiftCode)} shift and press ${label} with ${finger}.`;
  return `Use ${finger}.`;
}

/** The physical key (and Shift) needed to type a character, or null if it isn't on the keyboard. */
export function strokeForChar(char: string): KeyStroke | null {
  return CHAR_MAP.get(char) ?? null;
}

export function fingerForCode(code: string): { finger: Finger; hand: Hand } | null {
  const k = KEY_BY_CODE.get(code);
  return k ? { finger: k.finger, hand: k.hand } : null;
}
