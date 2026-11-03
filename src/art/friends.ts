import Phaser from 'phaser';
import type { Finger } from '../input/keyLayout';
import { bake } from './bake';
import { FINGER_COLORS, INK, darken } from './palette';

export interface FriendLook {
  alpha?: number;
  blink?: boolean;
  glow?: boolean;
  /** A sporty headband, for the Finger Fitness coach. */
  headband?: boolean;
}

/** A Finger Friend: a round, coloured fingertip buddy with a face. */
export function drawFingerFriend(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, finger: Finger, look: FriendLook = {}): void {
  const color = FINGER_COLORS[finger];
  const alpha = look.alpha ?? 1;
  if (look.glow) {
    g.fillStyle(0xfff27a, 0.8);
    g.fillCircle(x, y, r * 1.35);
  }
  g.fillStyle(color, alpha);
  g.fillCircle(x, y, r);
  g.lineStyle(Math.max(3, r * 0.06), darken(color, 0.3), alpha);
  g.strokeCircle(x, y, r);
  if (look.headband) {
    g.fillStyle(0xff5d5d, alpha);
    g.fillRect(x - r * 0.92, y - r * 0.62, r * 1.84, r * 0.24);
    g.fillStyle(0xffffff, alpha);
    g.fillRect(x - r * 0.92, y - r * 0.54, r * 1.84, r * 0.07);
  }
  const ex = r * 0.36;
  const ey = -r * 0.15;
  if (look.blink) {
    g.lineStyle(Math.max(2, r * 0.12), INK, alpha);
    g.lineBetween(x - ex - r * 0.12, y + ey, x - ex + r * 0.12, y + ey);
    g.lineBetween(x + ex - r * 0.12, y + ey, x + ex + r * 0.12, y + ey);
  } else {
    g.fillStyle(0xffffff, alpha);
    g.fillCircle(x - ex, y + ey, r * 0.24);
    g.fillCircle(x + ex, y + ey, r * 0.24);
    g.fillStyle(INK, alpha);
    g.fillCircle(x - ex, y + ey + r * 0.04, r * 0.12);
    g.fillCircle(x + ex, y + ey + r * 0.04, r * 0.12);
  }
  g.lineStyle(Math.max(2, r * 0.1), INK, alpha);
  g.beginPath();
  g.arc(x, y + r * 0.12, r * 0.38, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
  g.strokePath();
  g.fillStyle(0xff8fab, alpha * 0.7);
  g.fillCircle(x - r * 0.62, y + r * 0.22, r * 0.14);
  g.fillCircle(x + r * 0.62, y + r * 0.22, r * 0.14);
}

/** A big Finger Friend as an Image (baked once per finger and size). */
export function fingerFriendImage(scene: Phaser.Scene, x: number, y: number, finger: Finger, r: number, look: FriendLook = {}): Phaser.GameObjects.Image {
  return scene.add.image(x, y, fingerFriendKey(scene, finger, r, look));
}

export function fingerFriendKey(scene: Phaser.Scene, finger: Finger, r: number, look: FriendLook = {}): string {
  const size = Math.ceil(r * 2.8);
  return bake(scene, `friend-${finger}-${r}-${look.headband ? 'hb' : ''}${look.glow ? 'g' : ''}`, size, size, (g) =>
    drawFingerFriend(g, size / 2, size / 2, r, finger, look),
  );
}
