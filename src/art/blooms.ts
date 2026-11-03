import Phaser from 'phaser';
import type { Bloom } from '../engine/Mastery';
import { bake } from './bake';
import { PALETTE } from './palette';

const SIZE = 96;

/** The five growth stages of a key's flower: seed, sprout, bud, flower, bloom. */
export function bloomTexture(scene: Phaser.Scene, stage: Bloom): string {
  return bake(scene, `bloom-${stage}`, SIZE, SIZE, (g) => {
    const cx = SIZE / 2;
    const ground = SIZE - 10;
    g.fillStyle(0x8a5a3c, 1);
    g.fillEllipse(cx, ground + 2, 56, 14);
    if (stage === 0) {
      g.fillStyle(0xc98a5b, 1);
      g.fillEllipse(cx, ground - 6, 18, 12);
      return;
    }
    const top = [0, ground - 26, ground - 46, ground - 56, ground - 60][stage];
    g.lineStyle(6, 0x3c9a3c, 1);
    g.lineBetween(cx, ground, cx, top);
    g.fillStyle(0x5cbf3f, 1);
    g.fillEllipse(cx - 12, ground - 14, 22, 10);
    g.fillEllipse(cx + 12, ground - 18, 22, 10);
    if (stage === 2) {
      g.fillStyle(PALETTE.hotPink, 1);
      g.fillEllipse(cx, top - 6, 18, 24);
    } else if (stage >= 3) {
      const r = stage === 4 ? 14 : 10;
      const petal = stage === 4 ? PALETTE.hotPink : PALETTE.pink;
      g.fillStyle(petal, 1);
      for (let i = 0; i < (stage === 4 ? 8 : 5); i++) {
        const a = (i / (stage === 4 ? 8 : 5)) * Math.PI * 2;
        g.fillCircle(cx + Math.cos(a) * r, top - 10 + Math.sin(a) * r, r * 0.85);
      }
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(cx, top - 10, r * 0.7);
      if (stage === 4) {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(cx + 26, top - 30, 4);
        g.fillCircle(cx - 28, top - 20, 3);
      }
    }
  });
}
