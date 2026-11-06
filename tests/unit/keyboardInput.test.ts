import { describe, expect, it, vi } from 'vitest';
import { KeyboardInput, normalizeKeyEvent, shouldBlockDefault, type KeyboardEventLike } from '../../src/input/KeyboardInput';

function ev(code: string, key: string, mods: Partial<KeyboardEventLike> = {}): KeyboardEventLike {
  return { code, key, shiftKey: false, altKey: false, metaKey: false, ctrlKey: false, repeat: false, ...mods };
}

describe('normalizeKeyEvent', () => {
  it('reports printable characters', () => {
    expect(normalizeKeyEvent(ev('KeyA', 'a'), 'down', 0).char).toBe('a');
    expect(normalizeKeyEvent(ev('KeyA', 'A', { shiftKey: true }), 'down', 0).char).toBe('A');
    expect(normalizeKeyEvent(ev('Space', ' '), 'down', 0).char).toBe(' ');
    expect(normalizeKeyEvent(ev('KeyE', 'é'), 'down', 0).char).toBe('é');
  });

  it('maps Return and Tab, ignores other named keys', () => {
    expect(normalizeKeyEvent(ev('Enter', 'Enter'), 'down', 0).char).toBe('\n');
    expect(normalizeKeyEvent(ev('Tab', 'Tab'), 'down', 0).char).toBe('\t');
    expect(normalizeKeyEvent(ev('ShiftLeft', 'Shift'), 'down', 0).char).toBeNull();
    expect(normalizeKeyEvent(ev('KeyE', 'Dead', { altKey: true }), 'down', 0).char).toBeNull();
  });

  it('does not treat Command shortcuts as typing', () => {
    expect(normalizeKeyEvent(ev('KeyR', 'r', { metaKey: true }), 'down', 0).char).toBeNull();
  });

  it('reads Caps Lock', () => {
    const e = ev('KeyA', 'A', { getModifierState: (k) => k === 'CapsLock' });
    expect(normalizeKeyEvent(e, 'down', 0).capsLock).toBe(true);
  });
});

describe('shouldBlockDefault', () => {
  it('blocks keys that would scroll or navigate', () => {
    for (const code of ['Space', 'Tab', 'Backspace', 'Quote', 'Slash', 'ArrowDown', 'KeyA'])
      expect(shouldBlockDefault(ev(code, 'x')), code).toBe(true);
  });
  it('leaves Command shortcuts, dead keys and function keys alone', () => {
    expect(shouldBlockDefault(ev('KeyR', 'r', { metaKey: true }))).toBe(false);
    expect(shouldBlockDefault(ev('KeyE', 'Dead', { altKey: true }))).toBe(false);
    expect(shouldBlockDefault(ev('F5', 'F5'))).toBe(false);
  });
});

describe('KeyboardInput listeners', () => {
  function setup(): { input: KeyboardInput; press: (code: string, key: string) => void } {
    const input = new KeyboardInput();
    const target = new EventTarget();
    input.start(target as unknown as Window);
    const press = (code: string, key: string): void => {
      target.dispatchEvent(Object.assign(new Event('keydown'), ev(code, key)));
    };
    return { input, press };
  }

  it('skips a listener that was removed earlier in the same key press', () => {
    // e.g. Return on the name screen moves to the next step and destroys that screen's keyboard
    const { input, press } = setup();
    const calls: string[] = [];
    let offSecond: () => void = () => {};
    input.on(() => {
      calls.push('first');
      offSecond();
    });
    offSecond = input.on(() => calls.push('second'));
    press('Enter', 'Enter');
    expect(calls).toEqual(['first']);
  });

  it('still delivers the key to everyone else when one listener throws', () => {
    const { input, press } = setup();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const calls: string[] = [];
    input.on(() => calls.push('before'));
    input.on(() => {
      throw new Error('boom');
    });
    input.on(() => calls.push('after'));
    press('KeyL', 'l');
    expect(calls).toEqual(['before', 'after']);
    expect(errors).toHaveBeenCalledOnce();
    errors.mockRestore();
  });
});
