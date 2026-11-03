import { defaultSettings, emptySave, SAVE_VERSION, type Profile, type SaveData } from './types';

// Each entry upgrades a save from version N to N+1. Add one whenever SaveData changes shape,
// so a child's progress is never lost by an update.
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

export class SaveTooNewError extends Error {}

/** Turn whatever was stored (or nothing) into a valid, current SaveData. */
export function migrate(raw: unknown): SaveData {
  if (raw === null || raw === undefined || typeof raw !== 'object') return emptySave();
  let data = raw as Record<string, unknown>;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version < 1) return emptySave();
  if (version > SAVE_VERSION) throw new SaveTooNewError(`Save is version ${version}; this game knows ${SAVE_VERSION}`);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from save version ${version}`);
    data = step(data);
    version++;
  }
  return repair(data);
}

/** Fill in anything missing so older or hand-edited saves still load. */
function repair(data: Record<string, unknown>): SaveData {
  const base = emptySave();
  const profiles = Array.isArray(data.profiles) ? (data.profiles as Partial<Profile>[]) : [];
  return {
    version: SAVE_VERSION,
    profiles: profiles.filter((p) => typeof p?.id === 'string' && typeof p?.name === 'string').map(repairProfile),
    lastProfileId: typeof data.lastProfileId === 'string' ? data.lastProfileId : null,
    leaderboards:
      data.leaderboards && typeof data.leaderboards === 'object'
        ? (data.leaderboards as SaveData['leaderboards'])
        : base.leaderboards,
    settings: { ...defaultSettings(), ...((data.settings as object) ?? {}) },
  };
}

function repairProfile(p: Partial<Profile>): Profile {
  const now = Date.now();
  return {
    id: p.id!,
    name: p.name!,
    animal: p.animal ?? 'bunny',
    outfit: p.outfit ?? 0,
    ageBand: p.ageBand ?? '7-8',
    createdAt: p.createdAt ?? now,
    lastPlayedAt: p.lastPlayedAt ?? now,
    coins: p.coins ?? 0,
    xp: p.xp ?? 0,
    stars: p.stars ?? {},
    keyStats: p.keyStats ?? {},
    stickers: p.stickers ?? [],
    drillsDone: p.drillsDone ?? 0,
    playMs: p.playMs ?? 0,
  };
}
