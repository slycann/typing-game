import { describe, expect, it } from 'vitest';
import { dayKey } from '../../src/engine/Daily';
import { hintPrefs, hintsFor } from '../../src/engine/Mastery';
import { migrate } from '../../src/save/migrations';
import { defaultSettings } from '../../src/save/types';
import { addPlayedMinute, applySettings, timeIsUp } from '../../src/settings';
import { store } from '../../src/state';

describe('daily play limit', () => {
  it('is off by default and kicks in once the minutes are used', () => {
    const s = defaultSettings();
    expect(timeIsUp(s)).toBe(false);
    s.dailyLimitMin = 15;
    s.limitDay = dayKey();
    s.playedToday = 14;
    expect(timeIsUp(s)).toBe(false);
    s.playedToday = 15;
    expect(timeIsUp(s)).toBe(true);
    s.limitDay = '2000-01-01'; // a new day starts fresh
    expect(timeIsUp(s)).toBe(false);
  });

  it('counts minutes per day', async () => {
    await store.load();
    store.data.settings.limitDay = '2000-01-01';
    store.data.settings.playedToday = 40;
    await addPlayedMinute();
    expect(store.data.settings).toMatchObject({ limitDay: dayKey(), playedToday: 1 });
    await addPlayedMinute();
    expect(store.data.settings.playedToday).toBe(2);
  });
});

describe('settings', () => {
  it('old saves get the new settings filled in', () => {
    const d = migrate({ version: 1, settings: { volume: 0.3 } });
    expect(d.settings).toMatchObject({ volume: 0.3, musicVolume: 0.5, muted: false, dailyLimitMin: 0, easyRead: false });
  });

  it('"always show hints" keeps letters on mastered keys', () => {
    const p = migrate({ version: 1, profiles: [{ id: 'p', name: 'Kid', ageBand: '9-10' }] }).profiles[0];
    p.keyStats.f = { hits: 60, misses: 0, totalMs: 30000 };
    expect(hintsFor(p, 'f').label).toBe(false);
    applySettings({ ...defaultSettings(), alwaysHints: true });
    expect(hintPrefs.always).toBe(true);
    expect(hintsFor(p, 'f')).toEqual({ label: true, glow: true });
    applySettings(defaultSettings());
  });
});
