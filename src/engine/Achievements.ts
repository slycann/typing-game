import type { Profile } from '../save/types';
import { totalStars } from './Progress';

export const RANKS = [
  { name: 'Sprout', xp: 0 },
  { name: 'Seedling', xp: 150 },
  { name: 'Explorer', xp: 500 },
  { name: 'Ace', xp: 1200 },
  { name: 'Champion', xp: 2500 },
  { name: 'Key Master', xp: 5000 },
];

export function rankFor(xp: number): { name: string; index: number; next: number | null } {
  let i = 0;
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  return { name: RANKS[i].name, index: i, next: RANKS[i + 1]?.xp ?? null };
}

export interface Badge {
  id: string;
  name: string;
  desc: string;
  earned: (p: Profile) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-star', name: 'First Star', desc: 'Earn your first star', earned: (p) => totalStars(p) >= 1 },
  { id: 'perfect', name: 'Perfect!', desc: 'Get 3 stars on a level', earned: (p) => Object.values(p.stars).some((s) => s >= 3) },
  { id: 'home-row-hero', name: 'Home Row Hero', desc: "Cheer up Grumble in Home Row Meadow", earned: (p) => (p.stars['w1-12'] ?? 0) > 0 },
  { id: 'streak-25', name: 'On Fire', desc: '25 keys in a row', earned: (p) => p.bestStreak >= 25 },
  { id: 'speedy-10', name: 'Zoom Zoom', desc: '10 words a minute in a rocket race', earned: (p) => Object.values(p.bestSpeed).some((w) => w >= 10) },
  { id: 'gardener', name: 'Green Fingers', desc: 'Water your garden 3 times', earned: (p) => p.gardenRuns >= 3 },
  { id: 'shopper', name: 'Shopper', desc: 'Buy something in the shop', earned: (p) => p.owned.length >= 1 },
  { id: 'decorator', name: 'Decorator', desc: 'Decorate your treehouse', earned: (p) => Object.values(p.treehouse).some(Boolean) },
  { id: 'collector', name: 'Collector', desc: 'Rescue 10 Letterlings', earned: (p) => p.stickers.filter((s) => s.length === 1).length >= 10 },
  { id: 'regular', name: 'Regular', desc: 'Play on 3 different days', earned: (p) => p.daysPlayed.length >= 3 },
];

/** Award any badges newly earned. Mutates `p`; returns the new ones. */
export function awardBadges(p: Profile): Badge[] {
  const fresh = BADGES.filter((b) => !p.badges.includes(b.id) && b.earned(p));
  p.badges.push(...fresh.map((b) => b.id));
  return fresh;
}
