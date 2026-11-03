import type { Profile } from '../save/types';

/** Today's Adventure: three short things that make a good ~10 minute session. */
export type DailyTask = 'garden' | 'level' | 'race';
export const DAILY_TASKS: { id: DailyTask; label: string }[] = [
  { id: 'garden', label: 'Water your Practice Garden' },
  { id: 'level', label: 'Play a level' },
  { id: 'race', label: 'Race your rocket' },
];
export const DAILY_BONUS = 15;

export function dayKey(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function dailyDone(p: Profile, now: Date = new Date()): string[] {
  return p.daily.day === dayKey(now) ? p.daily.done : [];
}

/** Tick off a task. Returns true the moment all three are done (bonus time!). Mutates `p`. */
export function markDaily(p: Profile, task: DailyTask, now: Date = new Date()): boolean {
  const day = dayKey(now);
  if (p.daily.day !== day) p.daily = { day, done: [] };
  if (!p.daysPlayed.includes(day)) {
    p.daysPlayed.push(day);
    p.daysPlayed.splice(0, Math.max(0, p.daysPlayed.length - 60));
  }
  if (p.daily.done.includes(task)) return false;
  p.daily.done.push(task);
  const complete = DAILY_TASKS.every((t) => p.daily.done.includes(t.id));
  if (complete) p.coins += DAILY_BONUS;
  return complete;
}

/** Which of the last 7 days (oldest first, today last) were played. Nothing is ever taken away. */
export function lastWeek(p: Profile, now: Date = new Date()): boolean[] {
  const out: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(p.daysPlayed.includes(dayKey(d)));
  }
  return out;
}
