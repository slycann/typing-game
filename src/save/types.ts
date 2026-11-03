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
  volume: number; // 0..1
  voice: boolean;
  reduceMotion: boolean;
}

export interface SaveData {
  version: number;
  profiles: Profile[];
  lastProfileId: string | null;
  leaderboards: Record<string, LeaderboardEntry[]>;
  settings: Settings;
}

export function defaultSettings(): Settings {
  return { volume: 0.8, voice: true, reduceMotion: false };
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
