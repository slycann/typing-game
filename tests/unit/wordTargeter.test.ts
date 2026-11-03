import { describe, expect, it } from 'vitest';
import { WordTargeter, type Target } from '../../src/engine/WordTargeter';

const t = (text: string): Target => ({ text, typed: 0 });

describe('WordTargeter', () => {
  it('locks onto the most urgent word that starts with the letter', () => {
    const a = t('dad'), b = t('sad'), c = t('dash');
    const list = [a, b, c];
    const wt = new WordTargeter<Target>();
    expect(wt.expected(list)).toBe('d');
    expect(wt.input('d', list)).toMatchObject({ result: 'progress', target: a });
    expect(wt.input('s', list)).toMatchObject({ result: 'wrong', expected: 'a' });
    expect(wt.input('a', list).result).toBe('progress');
    expect(wt.input('d', list)).toMatchObject({ result: 'complete', target: a });
    expect(wt.active).toBeNull();
  });

  it('single letters complete immediately', () => {
    const list = [t('f'), t('j')];
    const wt = new WordTargeter<Target>();
    expect(wt.input('j', list)).toMatchObject({ result: 'complete', target: list[1] });
    expect(wt.input('k', list).result).toBe('wrong');
  });

  it('lets go when the target leaves the screen', () => {
    const a = t('all');
    const wt = new WordTargeter<Target>();
    wt.input('a', [a]);
    const b = t('ask');
    expect(wt.input('a', [b])).toMatchObject({ result: 'progress', target: b });
  });
});
