// Bright, saturated colours everywhere. "Ink" is a deep purple used instead of black.

export const INK = 0x3d2c5e;
export const INK_CSS = '#3d2c5e';

export const PALETTE = {
  skyTop: 0x4fc3ff,
  skyBottom: 0xb8ecff,
  grass: 0x7ed957,
  grassDark: 0x5cbf3f,
  grassLight: 0xa6e86b,
  sun: 0xffd23f,
  cloud: 0xfdfcff,
  pink: 0xff8fab,
  hotPink: 0xff5fa2,
  purple: 0x9b5de5,
  blue: 0x3a86ff,
  teal: 0x2ec4b6,
  green: 0x3ccf6e,
  orange: 0xff9a3c,
  yellow: 0xffd23f,
  red: 0xff5d5d,
  peach: 0xffc89a,
  lilac: 0xd9c3f5,
  cream: 0xfff4dc,
  trunk: 0xa0674b,
};

/** The Finger Friends' colours: each finger and the keys it presses share one colour. */
export const FINGER_COLORS = {
  pinky: 0xb57bff,
  ring: 0x4d9dff,
  middle: 0x3ccf6e,
  index: 0xff9a3c,
  thumb: 0xffd23f,
} as const;

export const FINGER_FRIENDS = {
  pinky: 'Pip',
  ring: 'Rory',
  middle: 'Midge',
  index: 'Izzy',
  thumb: 'Thumbs',
} as const;

/** Outfit colours a player can pick for their critter. */
export const OUTFIT_COLORS = [0xff5d5d, 0xff9a3c, 0xffd23f, 0x3ccf6e, 0x3a86ff, 0x9b5de5, 0xff5fa2, 0x2ec4b6];

export function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

export function lighten(color: number, t: number): number {
  return mix(color, 0xffffff, t);
}

export function darken(color: number, t: number): number {
  return mix(color, 0x1a1030, t);
}
