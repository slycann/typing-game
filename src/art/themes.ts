import Phaser from 'phaser';
import { bake } from './bake';
import { PALETTE, darken } from './palette';
import { cloud, flower, hills, sky, sun, tree } from './scenery';

export type Decor = 'trees' | 'treetops' | 'palms' | 'pines' | 'rocks' | 'coral' | 'stars';

export interface Theme {
  skyTop: number;
  skyBottom: number;
  hills: [number, number, number];
  decor: Decor;
  night: boolean;
  underwater: boolean;
}

const THEMES: Record<number, Theme> = {
  1: { skyTop: PALETTE.skyTop, skyBottom: PALETTE.skyBottom, hills: [0xa6e86b, 0x7ed957, 0x5cbf3f], decor: 'trees', night: false, underwater: false },
  2: { skyTop: 0x6fd3ff, skyBottom: 0xd4f5ff, hills: [0x6cc94f, 0x4fae3f, 0x3f9a38], decor: 'treetops', night: false, underwater: false },
  3: { skyTop: 0x4fd1ff, skyBottom: 0xfff0c2, hills: [0x3ab0e8, 0xffe7a3, 0xffd27a], decor: 'palms', night: false, underwater: false },
  4: { skyTop: 0x8fb8ff, skyBottom: 0xe8f0ff, hills: [0xe8eeff, 0xb8c8f5, 0x8fd36a], decor: 'pines', night: false, underwater: false },
  5: { skyTop: 0x5a46c9, skyBottom: 0xffb38a, hills: [0xe08a5a, 0xd9744a, 0xc25e3a], decor: 'rocks', night: false, underwater: false },
  6: { skyTop: 0x1e7fc0, skyBottom: 0x7fe0ff, hills: [0x2ec4b6, 0x26a69a, 0xffd88f], decor: 'coral', night: false, underwater: true },
  7: { skyTop: 0x1b1650, skyBottom: 0x5a46c9, hills: [0x5a4fb0, 0x463c98, 0x352d80], decor: 'stars', night: true, underwater: false },
};

export function themeFor(world: number): Theme {
  return THEMES[world] ?? THEMES[1];
}

/** Sky, sun/moon, clouds/bubbles/stars and hills for a world. Returns nothing; everything is placed. */
export function backdrop(scene: Phaser.Scene, t: Theme, hillY: number, opts: { sun?: [number, number]; clouds?: [number, number, number][] } = {}): void {
  sky(scene, t.skyTop, t.skyBottom);
  if (t.night) {
    const stars = bake(scene, 'night-stars', 1920, 700, (g) => {
      for (let i = 0; i < 90; i++) {
        g.fillStyle(i % 7 ? 0xffffff : PALETTE.yellow, 0.9);
        g.fillCircle((i * 397) % 1920, (i * 151) % 680, 1.5 + (i % 3));
      }
    });
    const s = scene.add.image(0, 0, stars).setOrigin(0, 0);
    scene.tweens.add({ targets: s, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1 });
    const [mx, my] = opts.sun ?? [1700, 160];
    const moon = bake(scene, 'moon', 160, 160, (g) => {
      g.fillStyle(0xfff4c4, 1);
      g.fillCircle(80, 80, 66);
      g.fillStyle(0xe8dca6, 1);
      g.fillCircle(56, 60, 12);
      g.fillCircle(96, 100, 9);
    });
    scene.add.image(mx, my, moon);
  } else if (t.underwater) {
    const rays = bake(scene, 'sea-rays', 1920, 800, (g) => {
      g.fillStyle(0xffffff, 0.08);
      for (let i = 0; i < 6; i++) g.fillTriangle(200 + i * 320, 0, 320 + i * 320, 0, 120 + i * 300, 800);
    });
    scene.add.image(0, 0, rays).setOrigin(0, 0);
    for (let i = 0; i < 14; i++) {
      const b = scene.add.circle(Phaser.Math.Between(40, 1880), Phaser.Math.Between(300, 900), Phaser.Math.Between(5, 14)).setStrokeStyle(3, 0xffffff, 0.7);
      scene.tweens.add({ targets: b, y: -40, duration: Phaser.Math.Between(6000, 12000), repeat: -1, delay: Phaser.Math.Between(0, 6000) });
    }
  } else {
    const [sx, sy] = opts.sun ?? [1760, 140];
    sun(scene, sx, sy, 60);
    for (const [x, y, s] of opts.clouds ?? [[600, 140, 0.6], [1250, 100, 0.5]]) cloud(scene, x, y, s);
  }
  hills(scene, hillY, t.hills);
}

/** Scatter the world's signature scenery (trees, palms, pines, rocks, coral, telescopes). */
export function decorate(scene: Phaser.Scene, t: Theme, spots: [number, number, number][]): void {
  spots.forEach(([x, y, s], i) => {
    switch (t.decor) {
      case 'trees':
        if (i % 2) flower(scene, x, y, [PALETTE.pink, PALETTE.yellow, PALETTE.purple][i % 3], s);
        else tree(scene, x, y, s);
        break;
      case 'treetops':
        scene.add.image(x, y, treehouseTree(scene)).setOrigin(0.5, 1).setScale(s * 0.8);
        break;
      case 'palms':
        swayer(scene, scene.add.image(x, y, palm(scene)).setOrigin(0.5, 1).setScale(s));
        break;
      case 'pines':
        scene.add.image(x, y, pine(scene)).setOrigin(0.5, 1).setScale(s);
        break;
      case 'rocks':
        scene.add.image(x, y, mesa(scene)).setOrigin(0.5, 1).setScale(s);
        break;
      case 'coral':
        swayer(scene, scene.add.image(x, y, coral(scene, i)).setOrigin(0.5, 1).setScale(s));
        break;
      case 'stars':
        scene.add.image(x, y, i % 2 ? telescope(scene) : pine(scene, true)).setOrigin(0.5, 1).setScale(s);
        break;
    }
  });
}

function swayer(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  scene.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1800 + Math.random() * 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

function treehouseTree(scene: Phaser.Scene): string {
  return bake(scene, 'decor-treehouse', 220, 320, (g) => {
    g.fillStyle(PALETTE.trunk, 1);
    g.fillRoundedRect(96, 120, 28, 200, 10);
    g.fillStyle(0x3f9a38, 1);
    g.fillCircle(110, 100, 96);
    g.fillStyle(0x5cbf3f, 1);
    g.fillCircle(96, 90, 80);
    g.fillStyle(0xd9944f, 1);
    g.fillRoundedRect(70, 140, 80, 56, 8);
    g.fillStyle(PALETTE.red, 1);
    g.fillTriangle(60, 144, 160, 144, 110, 104);
    g.fillStyle(PALETTE.skyTop, 1);
    g.fillRect(84, 156, 18, 18);
    g.fillStyle(0x8a5a3c, 1);
    g.fillRect(118, 160, 18, 36);
  });
}

function palm(scene: Phaser.Scene): string {
  return bake(scene, 'decor-palm', 220, 300, (g) => {
    g.lineStyle(22, 0xb57a4c, 1);
    g.beginPath();
    g.moveTo(100, 300);
    g.lineTo(108, 220);
    g.lineTo(118, 150);
    g.lineTo(122, 80);
    g.strokePath();
    g.fillStyle(0x3fae3f, 1);
    for (const [dx, dy, w, h] of [[-60, 10, 130, 36], [60, 10, 130, 36], [-40, -20, 110, 34], [40, -24, 110, 34], [0, -36, 50, 80]]) g.fillEllipse(122 + dx, 80 + dy, w, h);
    g.fillStyle(0x8a5a3c, 1);
    g.fillCircle(112, 96, 12);
    g.fillCircle(132, 98, 12);
  });
}

function pine(scene: Phaser.Scene, night = false): string {
  return bake(scene, `decor-pine-${night ? 'n' : 'd'}`, 160, 260, (g) => {
    g.fillStyle(0x8a5a3c, 1);
    g.fillRect(70, 210, 20, 50);
    const green = night ? 0x2f6a5a : 0x3f9a6a;
    for (let i = 0; i < 3; i++) {
      const top = 20 + i * 60;
      g.fillStyle(green, 1);
      g.fillTriangle(80, top, 10 + i * -6, top + 110, 150 + i * 6, top + 110);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(80, top, 58, top + 34, 102, top + 34);
    }
  });
}

function mesa(scene: Phaser.Scene): string {
  return bake(scene, 'decor-mesa', 260, 200, (g) => {
    g.fillStyle(0xa84a2e, 1);
    g.fillRoundedRect(20, 40, 220, 160, 24);
    g.fillStyle(0xc25e3a, 1);
    g.fillRoundedRect(36, 20, 188, 150, 24);
    g.fillStyle(0xe08a5a, 1);
    g.fillRect(36, 70, 188, 14);
    g.fillRect(36, 110, 188, 10);
  });
}

function coral(scene: Phaser.Scene, i: number): string {
  const color = [0xff5fa2, 0xff9a3c, 0xb57bff][i % 3];
  return bake(scene, `decor-coral-${i % 3}`, 180, 220, (g) => {
    g.fillStyle(0x2ea06a, 1);
    for (const x of [20, 150]) {
      g.fillEllipse(x, 140, 26, 160);
    }
    g.lineStyle(20, color, 1);
    g.lineBetween(90, 220, 90, 90);
    g.lineBetween(90, 150, 50, 90);
    g.lineBetween(90, 130, 130, 60);
    g.lineBetween(50, 90, 40, 40);
    g.fillStyle(color, 1);
    for (const [x, y] of [[90, 90], [40, 40], [130, 60]]) g.fillCircle(x, y, 14);
  });
}

function telescope(scene: Phaser.Scene): string {
  return bake(scene, 'decor-telescope', 200, 240, (g) => {
    g.fillStyle(0xd9d2ea, 1);
    g.fillRoundedRect(30, 120, 140, 120, 16);
    g.fillStyle(0xeef3ff, 1);
    g.slice(100, 126, 74, Math.PI, 0, false);
    g.fillPath();
    g.fillStyle(darken(0x5a46c9, 0.2), 1);
    g.fillRect(96, 54, 16, 70);
    g.fillStyle(0x3a86ff, 1);
    g.fillRoundedRect(84, 20, 90, 30, 12);
    g.fillStyle(PALETTE.yellow, 1);
    g.fillRect(70, 160, 60, 50);
  });
}
