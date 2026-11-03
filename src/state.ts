import { createDefaultStorage, SaveStore } from './save/SaveStore';
import type { Profile } from './save/types';

export const store = new SaveStore(createDefaultStorage());

export const session = {
  profileId: null as string | null,
};

export function currentProfile(): Profile | undefined {
  return store.getProfile(session.profileId);
}
