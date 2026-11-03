import { describe, expect, it } from 'vitest';
import { starsForAccuracy, TypingSession, wpmFor } from '../../src/engine/TypingSession';

describe('TypingSession', () => {
  it('advances only on the right key in kid mode', () => {
    const s = new TypingSession('fj');
    expect(s.input('d', 0).result).toBe('wrong');
    expect(s.index).toBe(0);
    expect(s.input('f', 100).result).toBe('correct');
    const last = s.input('j', 300);
    expect(last).toMatchObject({ result: 'correct', done: true });
    expect(s.accuracy()).toBeCloseTo(2 / 3);
    expect(s.missedAt.has(0)).toBe(true);
    expect(s.perChar.get('f')).toEqual({ hits: 1, misses: 1, totalMs: 100 });
    expect(s.perChar.get('j')).toEqual({ hits: 1, misses: 0, totalMs: 200 });
  });

  it('moves on after mistakes when not blocking', () => {
    const s = new TypingSession('ab', { blockOnError: false });
    s.input('x', 0);
    s.input('b', 10);
    expect(s.done).toBe(true);
    expect(s.correct).toBe(1);
  });

  it('can forgive case while Caps Lock is on', () => {
    const s = new TypingSession('f');
    s.setIgnoreCase(true);
    expect(s.input('F', 0).result).toBe('correct');
  });

  it('ignores input after finishing', () => {
    const s = new TypingSession('a');
    s.input('a', 0);
    expect(s.input('a', 10).result).toBe('ignored');
    expect(s.keystrokes).toBe(1);
  });

  it('computes words per minute', () => {
    expect(wpmFor(50, 60000)).toBe(10);
    expect(wpmFor(10, 0)).toBe(0);
    const s = new TypingSession('aaaaa');
    for (let i = 0; i < 5; i++) s.input('a', i * 3000);
    expect(s.wpm(99999)).toBeCloseTo(1 / (12000 / 60000));
  });
});

describe('starsForAccuracy', () => {
  it('is gentler for the youngest players', () => {
    expect(starsForAccuracy(0.8, '5-6')).toBe(2);
    expect(starsForAccuracy(0.8, '9-10')).toBe(1);
    expect(starsForAccuracy(1, '9-10')).toBe(3);
    expect(starsForAccuracy(0.2, '5-6')).toBe(0);
  });
});
