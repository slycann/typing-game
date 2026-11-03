export const SAVE_VERSION = 1;
export const MAX_PROFILES = 6;

export type AnimalKind = 'bunny' | 'puppy' | 'kitten' | 'bear' | 'duckling';
export type AgeBand = '5-6' | '7-8' | '9-10';

export interface KeyStat {
  hits: number;
  misses: number;
  totalMs: number;
}

export interface Profile {
  id: string;
  name: string; // first name only; stays on this device
  animal: AnimalKind;
  outfit: number; // index into OUTFIT_COLORS
  ageBand: AgeBand;
  createdAt: number;
  lastPlayedAt: number;
  coins: number;
  xp: number;
  stars: Record<string, number>; // levelId -> best stars
  keyStats: Record<string, KeyStat>; // character -> lifetime stats
  stickers: string[];
  drillsDone: number;
  playMs: number;
  bestStreak: number;
  /** Story scenes and one-time hints already shown. */
  seen: string[];
  /** Shop items bought. */
  owned: string[];
  wearing: { hat: string | null; glasses: string | null; pet: string | null };
  /** Treehouse slot -> decoration id. */
  treehouse: Record<string, string | null>;
  /** Today's adventure: which tasks are done on which day (YYYY-MM-DD). */
  daily: { day: string; done: string[] };
  /** Days this player has played (YYYY-MM-DD), newest last; kept short. */
  daysPlayed: string[];
  badges: string[];
  /** Best net words-per-minute per speed board, for the ghost rocket. */
  bestSpeed: Record<string, number>;
  gardenRuns: number;
}

export interface LeaderboardEntry {
  initials: string;
  score: number;
  wpm?: number;
  accuracy?: number;
  profileId?: string;
  at: number;
}

export interface Settings {
  volume: number; // sound effects, 0..1
  musicVolume: number; // 0..1
  muted: boolean;
  voice: boolean;
  reduceMotion: boolean;
  /** Keep letters and glows on every key, even mastered ones. */
  alwaysHints: boolean;
  /** Bigger, more spaced-out text for children who find reading hard. */
  easyRead: boolean;
  /** Minutes of play a day before a grown-up is needed (0 = no limit). */
  dailyLimitMin: number;
  /** Minutes played on `limitDay` (all players together). */
  playedToday: number;
  limitDay: string;
}

export interface SaveData {
  version: number;
  profiles: Profile[];
  lastProfileId: string | null;
  leaderboards: Record<string, LeaderboardEntry[]>;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return { volume: 0.8, musicVolume: 0.5, muted: false, voice: true, reduceMotion: false, alwaysHints: false, easyRead: false, dailyLimitMin: 0, playedToday: 0, limitDay: '' };
}

export function emptySave(): SaveData {
  return {
    version: SAVE_VERSION,
    profiles: [],
    lastProfileId: null,
    leaderboards: {},
    settings: defaultSettings(),
  };
}
