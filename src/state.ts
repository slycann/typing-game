import { createDefaultStorage, SaveStore } from './save/SaveStore';
import type { Profile } from './save/types';

export const store = new SaveStore(createDefaultStorage());

export const session = {
  profileId: null as string | null,
  /** When this sitting started, for the gentle stretch-break reminder. */
  startedAt: Date.now(),
  breakReminded: false,
};

export function startSitting(profileId: string): void {
  session.profileId = profileId;
  session.startedAt = Date.now();
  session.breakReminded = false;
}

export function currentProfile(): Profile | undefined {
  return store.getProfile(session.profileId);
}
