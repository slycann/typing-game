// A small read-only window into the game for automated tests (window.__KQ).

import type { OnScreenKeyboard } from './ui/OnScreenKeyboard';

export const debug = {
  scene: '',
  keyboard: null as OnScreenKeyboard | null,
  info: {} as Record<string, unknown>,
  fps: () => 0,
  players: () => [] as unknown[],
  marks: [] as [string, number][],
  mark(label: string): void {
    this.marks.push([label, Math.round(performance.now())]);
    if (this.marks.length > 50) this.marks.shift();
  },
};

declare global {
  interface Window {
    __KQ?: unknown;
  }
}

if (typeof window !== 'undefined') {
  window.__KQ = {
    scene: () => debug.scene,
    pressed: () => debug.keyboard?.pressedCodes() ?? [],
    targets: () => debug.keyboard?.getTargets() ?? [],
    info: () => debug.info,
    fps: () => debug.fps(),
    marks: () => debug.marks,
    players: () => debug.players(),
  };
}
