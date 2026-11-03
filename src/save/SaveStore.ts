import { createStore, get, set } from 'idb-keyval';
import { migrate } from './migrations';
import { emptySave, MAX_PROFILES, type AgeBand, type AnimalKind, type Profile, type SaveData } from './types';

export interface StorageAdapter {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
}

export class MemoryStorage implements StorageAdapter {
  readonly data = new Map<string, string>();
  async read(key: string) {
    return this.data.get(key) ?? null;
  }
  async write(key: string, value: string) {
    this.data.set(key, value);
  }
}

class LocalStorageAdapter implements StorageAdapter {
  async read(key: string) {
    return localStorage.getItem(key);
  }
  async write(key: string, value: string) {
    localStorage.setItem(key, value);
  }
}

/** IndexedDB (roomy, survives better on iPad), mirrored to localStorage as a fallback. */
class IdbStorage implements StorageAdapter {
  private store = createStore('key-quest', 'saves');
  private backup = new LocalStorageAdapter();
  async read(key: string) {
    try {
      const v = await get<string>(key, this.store);
      if (typeof v === 'string') return v;
    } catch {
      // fall through to the backup copy
    }
    return this.backup.read(key);
  }
  async write(key: string, value: string) {
    try {
      await set(key, value, this.store);
    } finally {
      try {
        await this.backup.write(key, value);
      } catch {
        // localStorage full or blocked; IndexedDB copy is still there
      }
    }
  }
}

export function createDefaultStorage(): StorageAdapter {
  if (typeof indexedDB !== 'undefined') return new IdbStorage();
  if (typeof localStorage !== 'undefined') return new LocalStorageAdapter();
  return new MemoryStorage();
}

export interface NewProfile {
  name: string;
  animal: AnimalKind;
  outfit: number;
  ageBand: AgeBand;
}

const SAVE_KEY = 'keyquest.save';

export class SaveStore {
  data: SaveData = emptySave();

  constructor(private storage: StorageAdapter, private key = SAVE_KEY) {}

  async load(): Promise<SaveData> {
    const raw = await this.storage.read(this.key);
    let parsed: unknown = null;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    this.data = migrate(parsed);
    return this.data;
  }

  async commit(): Promise<void> {
    await this.storage.write(this.key, JSON.stringify(this.data));
  }

  get profiles(): Profile[] {
    return this.data.profiles;
  }

  canAddProfile(): boolean {
    return this.data.profiles.length < MAX_PROFILES;
  }

  getProfile(id: string | null | undefined): Profile | undefined {
    return id ? this.data.profiles.find((p) => p.id === id) : undefined;
  }

  async createProfile(input: NewProfile, now = Date.now()): Promise<Profile> {
    if (!this.canAddProfile()) throw new Error(`Only ${MAX_PROFILES} players fit on one device`);
    const profile: Profile = {
      id: `p${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName(input.name),
      animal: input.animal,
      outfit: input.outfit,
      ageBand: input.ageBand,
      createdAt: now,
      lastPlayedAt: now,
      coins: 0,
      xp: 0,
      stars: {},
      keyStats: {},
      stickers: [],
      drillsDone: 0,
      playMs: 0,
      bestStreak: 0,
      seen: [],
    };
    this.data.profiles.push(profile);
    this.data.lastProfileId = profile.id;
    await this.commit();
    return profile;
  }

  async updateProfile(id: string, change: (p: Profile) => void): Promise<Profile> {
    const p = this.getProfile(id);
    if (!p) throw new Error(`No player ${id}`);
    change(p);
    await this.commit();
    return p;
  }

  /** Remove a player and everything saved about them, including their leaderboard scores. */
  async deleteProfile(id: string): Promise<void> {
    this.data.profiles = this.data.profiles.filter((p) => p.id !== id);
    for (const board of Object.values(this.data.leaderboards)) {
      for (let i = board.length - 1; i >= 0; i--) if (board[i].profileId === id) board.splice(i, 1);
    }
    if (this.data.lastProfileId === id) this.data.lastProfileId = null;
    await this.commit();
  }

  /** Start a player over from scratch but keep their name, critter and age. */
  async resetProgress(id: string): Promise<void> {
    const p = this.getProfile(id);
    if (!p) throw new Error(`No player ${id}`);
    Object.assign(p, { coins: 0, xp: 0, stars: {}, keyStats: {}, stickers: [], drillsDone: 0, playMs: 0, bestStreak: 0, seen: [] });
    for (const board of Object.values(this.data.leaderboards)) {
      for (let i = board.length - 1; i >= 0; i--) if (board[i].profileId === id) board.splice(i, 1);
    }
    await this.commit();
  }

  async selectProfile(id: string, now = Date.now()): Promise<void> {
    this.data.lastProfileId = id;
    const p = this.getProfile(id);
    if (p) p.lastPlayedAt = now;
    await this.commit();
  }

  /** A file grown-ups can keep or move to another device. */
  exportJson(): string {
    return JSON.stringify({ app: 'key-quest', ...this.data }, null, 2);
  }

  async importJson(text: string): Promise<void> {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.app !== 'key-quest') throw new Error('That file is not a Key Quest save');
    this.data = migrate(parsed);
    await this.commit();
  }
}

export function cleanName(name: string): string {
  const trimmed = name.replace(/[^\p{L}\p{M} '-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 12);
  if (!trimmed) return 'Player';
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}
