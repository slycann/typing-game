import type { LeaderboardEntry } from '../save/types';

export const BOARD_SIZE = 10;

export type SpeedTier = 'home-row' | 'letters' | 'pro';
export const TIER_NAMES: Record<SpeedTier, string> = { 'home-row': 'Home Row', letters: 'All Letters', pro: 'Pro' };

export function speedTier(keys: string[]): SpeedTier {
  const letters = keys.filter((k) => /[a-z]/.test(k)).length;
  if (keys.some((k) => /[A-Z0-9!?]/.test(k))) return 'pro';
  return letters > 10 ? 'letters' : 'home-row';
}

export function boardKey(tier: SpeedTier, seconds: number): string {
  return `speed-${tier}-${seconds}`;
}

export function qualifies(board: readonly LeaderboardEntry[], score: number): boolean {
  if (score <= 0) return false;
  return board.length < BOARD_SIZE || score > board[board.length - 1].score;
}

/** Insert a score, keeping the best 10 (ties go to whoever got there first). Returns the 0-based rank or -1. */
export function insertEntry(board: LeaderboardEntry[], entry: LeaderboardEntry): number {
  if (!qualifies(board, entry.score)) return -1;
  board.push(entry);
  board.sort((a, b) => b.score - a.score || a.at - b.at);
  board.splice(BOARD_SIZE);
  return board.indexOf(entry);
}

// A short list of three-letter combinations that shouldn't appear on a children's leaderboard.
const BLOCKED = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'FUQ', 'SEX', 'KKK', 'WTF', 'CUM', 'TIT', 'DIK', 'DIC', 'NAZ', 'FAG', 'PIS', 'SHT', 'STD', 'XXX', 'HOE', 'JIZ', 'GAY', 'KYS', 'POO', 'PEE']);

export function cleanInitials(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
}

export function isAllowedInitials(initials: string): boolean {
  const s = cleanInitials(initials);
  return s.length >= 1 && !BLOCKED.has(s);
}
