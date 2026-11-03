import { createDefaultStorage, SaveStore } from './save/SaveStore';
import type { Profile } from './save/types';

export const store = new SaveStore(createDefaultStorage());

export const session = {
  profileId: null as string | null,
  /** When this sitting started, for the gentle stretch-break reminder. */
  startedAt: Date.now(),
  breakReminded: false,
  /** The world map last shown, so returning from a level lands in the same world. */
  mapWorld: 0,
};

export function startSitting(profileId: string): void {
  session.profileId = profileId;
  session.startedAt = Date.now();
  session.breakReminded = false;
  session.mapWorld = 0;
}

export function currentProfile(): Profile | undefined {
  return store.getProfile(session.profileId);
}
