import { describe, expect, it } from 'vitest';
import { HOME_KEYS, KEY_BY_CODE, KEYBOARD_WIDTH_UNITS, LAYOUT, strokeForChar } from '../../src/input/keyLayout';

describe('Mac keyboard layout', () => {
  it('every row is the full keyboard width', () => {
    for (let row = 0; row < 5; row++) {
      const keys = LAYOUT.filter((k) => Math.floor(k.y) === row);
      const right = Math.max(...keys.map((k) => k.x + k.w));
      expect(right).toBeCloseTo(KEYBOARD_WIDTH_UNITS);
    }
  });

  it('has no duplicate key codes', () => {
    expect(new Set(LAYOUT.map((k) => k.code)).size).toBe(LAYOUT.length);
  });

  it('can type every letter, digit and common symbol', () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,;:\'"?!@#$%^&*()-_=+[]{}/\\|`~<>';
    for (const c of chars) expect(strokeForChar(c), c).not.toBeNull();
  });

  it('capitals use the Shift key on the other hand', () => {
    expect(strokeForChar('A')).toEqual({ code: 'KeyA', shift: true, shiftCode: 'ShiftRight' });
    expect(strokeForChar('J')).toEqual({ code: 'KeyJ', shift: true, shiftCode: 'ShiftLeft' });
    expect(strokeForChar('a')).toEqual({ code: 'KeyA', shift: false });
  });

  it('home keys are on the home row and F/J have bumps', () => {
    for (const hand of ['left', 'right'] as const) {
      for (const [finger, code] of Object.entries(HOME_KEYS[hand])) {
        const key = KEY_BY_CODE.get(code)!;
        expect(key.finger).toBe(finger);
        if (finger !== 'thumb') expect(key.y).toBe(2);
      }
    }
    expect(KEY_BY_CODE.get('KeyF')!.homeBump).toBe(true);
    expect(KEY_BY_CODE.get('KeyJ')!.homeBump).toBe(true);
    expect(KEY_BY_CODE.get('KeyD')!.homeBump).toBe(false);
  });
});
