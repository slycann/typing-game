import { music } from './audio/Music';
import { narrator } from './audio/Narrator';
import { sfx } from './audio/Sfx';
import type { Settings } from './save/types';
import { dayKey } from './engine/Daily';
import { hintPrefs } from './engine/Mastery';
import { store } from './state';

/** Push the saved settings into the audio, voice and motion systems. */
export function applySettings(s: Settings = store.data.settings): void {
  sfx.setVolume(s.volume);
  sfx.setMuted(s.muted);
  music.setVolume(s.musicVolume);
  music.setEnabled(!s.muted && s.musicVolume > 0);
  narrator.setEnabled(s.voice && !s.muted);
  motion.reduced = s.reduceMotion;
  hintPrefs.always = s.alwaysHints;
  text.easyRead = s.easyRead;
}

/** Change some settings, save them and apply them. */
export async function updateSettings(change: Partial<Settings>): Promise<void> {
  Object.assign(store.data.settings, change);
  applySettings();
  await store.commit();
}

/** Read by animations: when true, skip purely decorative movement (bobbing, confetti, shakes). */
export const motion = { reduced: false };

/** Read by text helpers: bigger, more spaced-out letters when easy-read is on. */
export const text = { easyRead: false };

/** Has today's play limit (set in the Parent Zone) been used up? */
export function timeIsUp(s: Settings = store.data.settings): boolean {
  return s.dailyLimitMin > 0 && s.limitDay === dayKey() && s.playedToday >= s.dailyLimitMin;
}

/** Count one more minute of play today (all players share the limit). */
export async function addPlayedMinute(): Promise<void> {
  const s = store.data.settings;
  const today = dayKey();
  await updateSettings(s.limitDay === today ? { playedToday: s.playedToday + 1 } : { limitDay: today, playedToday: 1 });
}
