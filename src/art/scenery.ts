import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';
import { bake, gradient, hex } from './bake';
import { INK, PALETTE, darken } from './palette';

// Flat, bright, rounded scenery: gradient sky, rolling hills, lollipop trees, smiling sun.
// Each piece is drawn once into a texture (see bake.ts) and then animated as an Image.

export function sky(scene: Phaser.Scene, top: number = PALETTE.skyTop, bottom: number = PALETTE.skyBottom): Phaser.GameObjects.Image {
  const key = gradient(scene, `sky-${hex(top)}-${hex(bottom)}`, GAME_W, GAME_H, [[0, top], [1, bottom]]);
  return scene.add.image(0, 0, key).setOrigin(0, 0);
}

export function hills(scene: Phaser.Scene, baseY: number, colors: number[] = [PALETTE.grassLight, PALETTE.grass, PALETTE.grassDark]): Phaser.GameObjects.Image {
  const key = bake(scene, `hills-${baseY}-${colors.map(hex).join('-')}`, GAME_W, GAME_H, (g) => {
    const layers = [
      { y: baseY - 120, bumps: [[-100, 520], [520, 620], [1250, 560], [1900, 600]] },
      { y: baseY - 40, bumps: [[200, 700], [1000, 640], [1700, 560]] },
      { y: baseY + 60, bumps: [[-200, 900], [900, 1000], [2000, 800]] },
    ];
    layers.forEach((layer, i) => {
      g.fillStyle(colors[i % colors.length], 1);
      for (const [x, w] of layer.bumps) g.fillEllipse(x, layer.y + 200, w * 1.4, 520);
      g.fillRect(0, layer.y + 200, GAME_W, GAME_H);
    });
  });
  return scene.add.image(0, 0, key).setOrigin(0, 0);
}

export function cloud(scene: Phaser.Scene, x: number, y: number, scale = 1, drift = true): Phaser.GameObjects.Image {
  const key = bake(scene, 'cloud', 300, 200, (g) => {
    const ox = 150, oy = 110;
    g.fillStyle(0xdbeeff, 1);
    for (const [cx, cy, r] of [[-60, 14, 42], [0, 18, 52], [60, 14, 42]]) g.fillCircle(ox + cx, oy + cy, r);
    g.fillStyle(PALETTE.cloud, 1);
    for (const [cx, cy, r] of [[-60, 6, 40], [-10, -24, 50], [45, -8, 44], [80, 12, 32], [0, 10, 48]]) g.fillCircle(ox + cx, oy + cy, r);
  });
  const img = scene.add.image(x, y, key).setOrigin(0.5, 0.55).setScale(scale);
  if (drift) {
    scene.tweens.add({ targets: img, x: x + 60 + Math.random() * 40, duration: 6000 + Math.random() * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return img;
}

export function sun(scene: Phaser.Scene, x: number, y: number, r = 80): Phaser.GameObjects.Container {
  const size = Math.ceil(r * 3.3);
  const c0 = size / 2;
  const raysKey = bake(scene, `sun-rays-${r}`, size, size, (g) => {
    g.fillStyle(0xffe680, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const a1 = a - 0.12, a2 = a + 0.12;
      g.fillTriangle(
        c0 + Math.cos(a1) * r * 1.15, c0 + Math.sin(a1) * r * 1.15,
        c0 + Math.cos(a2) * r * 1.15, c0 + Math.sin(a2) * r * 1.15,
        c0 + Math.cos(a) * r * 1.6, c0 + Math.sin(a) * r * 1.6,
      );
    }
  });
  const faceKey = bake(scene, `sun-face-${r}`, r * 2 + 4, r * 2 + 4, (g) => {
    const cx = r + 2, cy = r + 2;
    g.fillStyle(PALETTE.sun, 1);
    g.fillCircle(cx, cy, r);
    g.fillStyle(INK, 1);
    g.fillCircle(cx - r * 0.3, cy - r * 0.15, r * 0.09);
    g.fillCircle(cx + r * 0.3, cy - r * 0.15, r * 0.09);
    g.fillStyle(0xff9a3c, 0.6);
    g.fillCircle(cx - r * 0.5, cy + r * 0.18, r * 0.14);
    g.fillCircle(cx + r * 0.5, cy + r * 0.18, r * 0.14);
    g.lineStyle(r * 0.07, INK, 1);
    g.beginPath();
    g.arc(cx, cy + r * 0.08, r * 0.35, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
    g.strokePath();
  });
  const rays = scene.add.image(0, 0, raysKey);
  const face = scene.add.image(0, 0, faceKey);
  scene.tweens.add({ targets: rays, angle: 360, duration: 30000, repeat: -1 });
  const c = scene.add.container(x, y, [rays, face]);
  scene.tweens.add({ targets: c, scale: 1.05, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

/** Lollipop tree. Origin at the bottom of the trunk. */
export function tree(scene: Phaser.Scene, x: number, y: number, scale = 1, leaf: number = 0x4cbf4c): Phaser.GameObjects.Image {
  const key = bake(scene, `tree-${hex(leaf)}`, 150, 250, (g) => {
    const ox = 75, oy = 248;
    g.fillStyle(PALETTE.trunk, 1);
    g.fillRoundedRect(ox - 10, oy - 120, 20, 120, 8);
    g.fillStyle(darken(leaf, 0.15), 1);
    g.fillCircle(ox + 4, oy - 160, 66);
    g.fillStyle(leaf, 1);
    g.fillCircle(ox, oy - 166, 62);
    g.fillStyle(0xff5d5d, 1);
    for (const [ax, ay] of [[-24, -180], [20, -150], [10, -200], [-30, -140]]) g.fillCircle(ox + ax, oy + ay, 8);
  });
  const img = scene.add.image(x, y, key).setOrigin(0.5, 248 / 250).setScale(scale);
  scene.tweens.add({ targets: img, angle: { from: -1.5, to: 1.5 }, duration: 2200 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return img;
}

/** Origin at the bottom of the stem. */
export function flower(scene: Phaser.Scene, x: number, y: number, petal: number, scale = 1): Phaser.GameObjects.Image {
  const key = bake(scene, `flower-${hex(petal)}`, 50, 76, (g) => {
    const ox = 25, oy = 74;
    g.lineStyle(5, 0x3c9a3c, 1);
    g.lineBetween(ox, oy, ox, oy - 36);
    g.fillStyle(petal, 1);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillCircle(ox + Math.cos(a) * 11, oy - 42 + Math.sin(a) * 11, 9);
    }
    g.fillStyle(PALETTE.yellow, 1);
    g.fillCircle(ox, oy - 42, 7);
  });
  const img = scene.add.image(x, y, key).setOrigin(0.5, 74 / 76).setScale(scale);
  scene.tweens.add({ targets: img, angle: { from: -6, to: 6 }, duration: 1400 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return img;
}

/** Cosy indoor backdrop: striped wallpaper and a wooden floor (for the Workshop). */
export function workshop(scene: Phaser.Scene, floorY: number): Phaser.GameObjects.Image {
  const key = bake(scene, `workshop-${floorY}`, GAME_W, GAME_H, (g) => {
    const stripe = 80;
    for (let x = 0; x < GAME_W; x += stripe) {
      g.fillStyle((x / stripe) % 2 === 0 ? 0xffd6a5 : 0xffc38a, 1);
      g.fillRect(x, 0, stripe, floorY);
    }
    g.fillStyle(0xff9a3c, 1);
    g.fillRect(0, floorY - 24, GAME_W, 24);
    g.fillStyle(0xc98a5b, 1);
    g.fillRect(0, floorY, GAME_W, GAME_H - floorY);
    g.lineStyle(4, 0xa96e43, 1);
    for (let y = floorY + 50; y < GAME_H; y += 60) g.lineBetween(0, y, GAME_W, y);
  });
  return scene.add.image(0, 0, key).setOrigin(0, 0);
}

/** Bunting: a string of little triangle flags. */
export function bunting(scene: Phaser.Scene, y: number): Phaser.GameObjects.Image {
  const key = bake(scene, `bunting-${y}`, GAME_W, y + 90, (g) => {
    const colors = [PALETTE.red, PALETTE.yellow, PALETTE.blue, PALETTE.green, PALETTE.pink, PALETTE.purple, PALETTE.orange];
    g.lineStyle(4, 0x8a5a3c, 1);
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= GAME_W; x += 40) g.lineTo(x, y + Math.sin((x / GAME_W) * Math.PI * 3) * 18);
    g.strokePath();
    for (let i = 0, x = 30; x < GAME_W; x += 90, i++) {
      const yy = y + Math.sin((x / GAME_W) * Math.PI * 3) * 18;
      g.fillStyle(colors[i % colors.length], 1);
      g.fillTriangle(x - 28, yy, x + 28, yy, x, yy + 52);
    }
  });
  return scene.add.image(0, 0, key).setOrigin(0, 0);
}
