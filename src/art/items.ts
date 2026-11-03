import Phaser from 'phaser';
import { drawStar } from '../ui/OnScreenKeyboard';
import { bake } from './bake';
import { INK, PALETTE, darken } from './palette';

// Drawings for everything in the shop. Each item is drawn in its own little box (in the same
// units as the critter SVGs) with an anchor point: where it sits on a head, a nose, or the floor.

type G = Phaser.GameObjects.Graphics;

interface ItemArt {
  w: number;
  h: number;
  ax: number; // anchor, in item units
  ay: number;
  draw: (g: G) => void;
}

const SCALE = 2; // baked at 2x like the critters

function heart(g: G, x: number, y: number, r: number): void {
  g.fillCircle(x - r * 0.5, y - r * 0.2, r * 0.6);
  g.fillCircle(x + r * 0.5, y - r * 0.2, r * 0.6);
  g.fillTriangle(x - r * 1.05, y, x + r * 1.05, y, x, y + r * 1.1);
}

function flowerAt(g: G, x: number, y: number, r: number, petal: number): void {
  g.fillStyle(petal, 1);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8);
  }
  g.fillStyle(PALETTE.yellow, 1);
  g.fillCircle(x, y, r * 0.6);
}

function frame(g: G, w: number, h: number, color: number): void {
  g.fillStyle(0xa96e43, 1);
  g.fillRoundedRect(0, 0, w, h, 12);
  g.fillStyle(color, 1);
  g.fillRoundedRect(10, 10, w - 20, h - 20, 6);
}

function pot(g: G, x: number, y: number): void {
  g.fillStyle(0xd9744a, 1);
  g.fillRect(x - 40, y - 54, 80, 14);
  g.fillTriangle(x - 34, y - 40, x + 34, y - 40, x + 26, y);
  g.fillTriangle(x - 34, y - 40, x + 26, y, x - 26, y);
}

const ART: Record<string, ItemArt> = {
  // ---- hats (anchor: bottom middle, sits on top of the head) ----
  'party-hat': {
    w: 74, h: 96, ax: 37, ay: 92,
    draw: (g) => {
      g.fillStyle(PALETTE.hotPink, 1);
      g.fillTriangle(4, 92, 70, 92, 37, 14);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillTriangle(16, 64, 58, 64, 37, 40);
      g.fillStyle(PALETTE.blue, 1);
      for (const [x, y] of [[26, 82], [48, 80], [37, 56]]) g.fillCircle(x, y, 5);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(37, 12, 11);
    },
  },
  bow: {
    w: 90, h: 50, ax: 45, ay: 44,
    draw: (g) => {
      g.fillStyle(darken(PALETTE.hotPink, 0.2), 1);
      g.fillTriangle(45, 25, 4, 4, 4, 46);
      g.fillTriangle(45, 25, 86, 4, 86, 46);
      g.fillStyle(PALETTE.hotPink, 1);
      g.fillTriangle(45, 25, 10, 8, 10, 42);
      g.fillTriangle(45, 25, 80, 8, 80, 42);
      g.fillCircle(45, 25, 12);
    },
  },
  cap: {
    w: 130, h: 60, ax: 58, ay: 54,
    draw: (g) => {
      g.fillStyle(PALETTE.red, 1);
      g.slice(58, 54, 52, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(darken(PALETTE.red, 0.25), 1);
      g.fillRoundedRect(70, 44, 58, 14, 7);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(58, 24, 9);
      g.fillStyle(PALETTE.red, 1);
      g.fillCircle(58, 4, 5);
    },
  },
  'flower-crown': {
    w: 130, h: 46, ax: 65, ay: 36,
    draw: (g) => {
      g.lineStyle(7, 0x3c9a3c, 1);
      g.beginPath();
      g.arc(65, -60, 98, Phaser.Math.DegToRad(50), Phaser.Math.DegToRad(130), false);
      g.strokePath();
      [[18, 28, PALETTE.pink], [42, 34, PALETTE.yellow], [65, 36, PALETTE.purple], [88, 34, PALETTE.red], [112, 28, PALETTE.blue]].forEach(([x, y, c]) => flowerAt(g, x, y, 7, c));
    },
  },
  sailor: {
    w: 110, h: 64, ax: 55, ay: 58,
    draw: (g) => {
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(4, 40, 102, 20, 10);
      g.fillStyle(0xeef3ff, 1);
      g.slice(55, 46, 40, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(PALETTE.blue, 1);
      g.fillRect(16, 34, 78, 9);
      g.fillStyle(PALETTE.red, 1);
      g.fillCircle(55, 8, 6);
    },
  },
  crown: {
    w: 96, h: 62, ax: 48, ay: 58,
    draw: (g) => {
      g.fillStyle(0xd9a400, 1);
      g.fillRect(6, 34, 84, 26);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRect(6, 30, 84, 26);
      for (const x of [6, 30, 54, 78]) g.fillTriangle(x, 32, x + 12, 4, x + 24, 32);
      g.fillStyle(PALETTE.red, 1);
      g.fillCircle(48, 42, 7);
      g.fillStyle(PALETTE.blue, 1);
      g.fillCircle(22, 42, 5);
      g.fillCircle(74, 42, 5);
    },
  },
  wizard: {
    w: 120, h: 130, ax: 60, ay: 120,
    draw: (g) => {
      g.fillStyle(PALETTE.purple, 1);
      g.fillTriangle(22, 112, 98, 112, 72, 6);
      g.fillStyle(darken(PALETTE.purple, 0.2), 1);
      g.fillEllipse(60, 114, 116, 22);
      g.fillStyle(PALETTE.yellow, 1);
      drawStar(g, 58, 70, 5, 12, 5);
      drawStar(g, 74, 40, 5, 8, 3.5);
      drawStar(g, 44, 96, 5, 7, 3);
    },
  },
  // ---- glasses (anchor: centre of the back lens) ----
  'round-specs': {
    w: 66, h: 40, ax: 20, ay: 20,
    draw: (g) => {
      g.lineStyle(4, INK, 1);
      g.strokeCircle(20, 20, 14);
      g.strokeCircle(46, 23, 13);
      g.lineBetween(33, 20, 34, 21);
      g.lineBetween(6, 18, 0, 14);
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(20, 20, 12);
      g.fillCircle(46, 23, 11);
    },
  },
  'star-shades': {
    w: 72, h: 46, ax: 22, ay: 22,
    draw: (g) => {
      g.fillStyle(INK, 1);
      drawStar(g, 22, 22, 5, 20, 10);
      drawStar(g, 49, 25, 5, 18, 9);
      g.fillStyle(PALETTE.hotPink, 1);
      drawStar(g, 22, 22, 5, 16, 8);
      drawStar(g, 49, 25, 5, 14, 7);
      g.lineStyle(4, INK, 1);
      g.lineBetween(34, 23, 37, 24);
    },
  },
  'heart-shades': {
    w: 72, h: 46, ax: 22, ay: 20,
    draw: (g) => {
      g.fillStyle(INK, 1);
      heart(g, 22, 20, 17);
      heart(g, 49, 23, 15);
      g.fillStyle(PALETTE.red, 1);
      heart(g, 22, 20, 13);
      heart(g, 49, 23, 11);
      g.lineStyle(4, INK, 1);
      g.lineBetween(35, 20, 37, 21);
    },
  },
  // ---- pets (anchor: bottom middle, on the ground) ----
  ladybug: {
    w: 90, h: 70, ax: 45, ay: 66,
    draw: (g) => {
      g.fillStyle(INK, 1);
      g.fillCircle(74, 44, 15);
      g.lineStyle(3, INK, 1);
      g.lineBetween(78, 30, 84, 16);
      g.lineBetween(84, 34, 92, 24);
      g.fillStyle(PALETTE.red, 1);
      g.slice(42, 62, 36, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(INK, 1);
      for (const [x, y] of [[28, 44], [46, 36], [56, 52], [30, 58]]) g.fillCircle(x, y, 6);
      g.lineBetween(42, 26, 42, 62);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(78, 42, 4);
    },
  },
  snail: {
    w: 100, h: 76, ax: 50, ay: 72,
    draw: (g) => {
      g.fillStyle(0xc9e86b, 1);
      g.fillRoundedRect(8, 56, 88, 16, 8);
      g.fillCircle(84, 50, 12);
      g.lineStyle(3, 0x8fb53a, 1);
      g.lineBetween(82, 40, 80, 20);
      g.lineBetween(90, 42, 94, 22);
      g.fillStyle(INK, 1);
      g.fillCircle(80, 20, 4);
      g.fillCircle(94, 22, 4);
      g.fillStyle(PALETTE.orange, 1);
      g.fillCircle(42, 40, 30);
      g.lineStyle(5, darken(PALETTE.orange, 0.3), 1);
      g.beginPath();
      g.arc(42, 40, 20, 0, Math.PI * 1.6, false);
      g.strokePath();
      g.beginPath();
      g.arc(44, 40, 9, Math.PI, Math.PI * 2.6, false);
      g.strokePath();
    },
  },
  chick: {
    w: 80, h: 84, ax: 40, ay: 80,
    draw: (g) => {
      g.fillStyle(PALETTE.orange, 1);
      g.fillRect(28, 66, 5, 12);
      g.fillRect(44, 66, 5, 12);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(38, 50, 26);
      g.fillCircle(50, 24, 18);
      g.fillStyle(darken(PALETTE.yellow, 0.15), 1);
      g.fillEllipse(30, 52, 26, 16);
      g.fillStyle(PALETTE.orange, 1);
      g.fillTriangle(64, 22, 78, 27, 64, 32);
      g.fillStyle(INK, 1);
      g.fillCircle(56, 20, 4);
      g.fillStyle(0xff8fab, 0.7);
      g.fillCircle(56, 31, 5);
    },
  },
  butterfly: {
    w: 96, h: 90, ax: 48, ay: 86,
    draw: (g) => {
      g.fillStyle(PALETTE.purple, 1);
      g.fillEllipse(30, 30, 40, 44);
      g.fillEllipse(66, 30, 40, 44);
      g.fillStyle(PALETTE.pink, 1);
      g.fillEllipse(32, 60, 30, 32);
      g.fillEllipse(64, 60, 30, 32);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(28, 28, 7);
      g.fillCircle(68, 28, 7);
      g.fillStyle(INK, 1);
      g.fillRoundedRect(44, 18, 8, 56, 4);
      g.lineStyle(3, INK, 1);
      g.lineBetween(46, 18, 38, 4);
      g.lineBetween(50, 18, 58, 4);
    },
  },
  fishbowl: {
    w: 96, h: 96, ax: 48, ay: 94,
    draw: (g) => {
      g.fillStyle(0xa96e43, 1);
      g.fillRoundedRect(18, 82, 60, 12, 6);
      g.fillStyle(0x9fdcff, 0.85);
      g.fillCircle(48, 48, 40);
      g.fillStyle(0x4fc3ff, 0.9);
      g.slice(48, 48, 40, Phaser.Math.DegToRad(10), Phaser.Math.DegToRad(170), false);
      g.fillPath();
      g.fillStyle(PALETTE.orange, 1);
      g.fillEllipse(50, 56, 34, 20);
      g.fillTriangle(30, 56, 20, 46, 20, 66);
      g.fillStyle(INK, 1);
      g.fillCircle(60, 53, 3);
      g.fillStyle(0xffffff, 0.8);
      g.fillCircle(66, 32, 4);
      g.fillCircle(72, 22, 3);
    },
  },
  // ---- treehouse decorations (anchor: bottom middle) ----
  'rug-rainbow': {
    w: 440, h: 100, ax: 220, ay: 96,
    draw: (g) => {
      [PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.green, PALETTE.blue, PALETTE.purple].forEach((c, i) => {
        g.fillStyle(c, 1);
        g.fillEllipse(220, 50, 440 - i * 60, 96 - i * 14);
      });
    },
  },
  'rug-star': {
    w: 440, h: 100, ax: 220, ay: 96,
    draw: (g) => {
      g.fillStyle(0x2d4fa8, 1);
      g.fillEllipse(220, 50, 440, 96);
      g.fillStyle(0x3a86ff, 1);
      g.fillEllipse(220, 48, 410, 84);
      g.fillStyle(PALETTE.yellow, 1);
      [[120, 40], [220, 56], [320, 38], [170, 70], [280, 72]].forEach(([x, y], i) => drawStar(g, x, y, 5, 14 - (i % 2) * 4, 6 - (i % 2) * 2));
    },
  },
  'lamp-mushroom': {
    w: 140, h: 200, ax: 70, ay: 198,
    draw: (g) => {
      g.fillStyle(0xfff3c4, 0.5);
      g.fillCircle(70, 70, 68);
      g.fillStyle(0xfff4dc, 1);
      g.fillRoundedRect(54, 80, 32, 116, 14);
      g.fillStyle(PALETTE.red, 1);
      g.slice(70, 90, 64, Math.PI, 0, false);
      g.fillPath();
      g.fillStyle(0xffffff, 1);
      for (const [x, y, r] of [[44, 66, 10], [80, 52, 12], [104, 76, 8], [64, 82, 6]]) g.fillCircle(x, y, r);
    },
  },
  'lamp-moon': {
    w: 140, h: 210, ax: 70, ay: 208,
    draw: (g) => {
      g.fillStyle(0xfff3c4, 0.5);
      g.fillCircle(70, 64, 64);
      g.fillStyle(0xa96e43, 1);
      g.fillRect(66, 110, 8, 86);
      g.fillRoundedRect(36, 194, 68, 14, 7);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(70, 64, 46);
      g.fillStyle(0x5a46c9, 1);
      g.fillCircle(92, 50, 40);
    },
  },
  'plant-cactus': {
    w: 120, h: 190, ax: 60, ay: 188,
    draw: (g) => {
      g.fillStyle(PALETTE.green, 1);
      g.fillRoundedRect(44, 36, 32, 104, 16);
      g.fillRoundedRect(14, 70, 26, 40, 13);
      g.fillRoundedRect(14, 98, 40, 16, 8);
      g.fillRoundedRect(82, 54, 26, 40, 13);
      g.fillRoundedRect(66, 82, 40, 16, 8);
      g.fillStyle(PALETTE.pink, 1);
      g.fillCircle(60, 34, 10);
      pot(g, 60, 188);
    },
  },
  'plant-sunflower': {
    w: 130, h: 240, ax: 65, ay: 238,
    draw: (g) => {
      g.lineStyle(9, 0x3c9a3c, 1);
      g.lineBetween(65, 184, 65, 60);
      g.fillStyle(0x3c9a3c, 1);
      g.fillEllipse(44, 130, 40, 18);
      g.fillEllipse(86, 110, 40, 18);
      g.fillStyle(PALETTE.yellow, 1);
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.fillEllipse(65 + Math.cos(a) * 32, 54 + Math.sin(a) * 32, 26, 26);
      }
      g.fillStyle(0x8a5a3c, 1);
      g.fillCircle(65, 54, 26);
      pot(g, 65, 238);
    },
  },
  'poster-rocket': {
    w: 180, h: 230, ax: 90, ay: 230,
    draw: (g) => {
      frame(g, 180, 230, 0x2d2a6e);
      g.fillStyle(0xffffff, 1);
      for (const [x, y] of [[40, 40], [140, 70], [60, 190], [150, 180]]) g.fillCircle(x, y, 3);
      g.fillStyle(PALETTE.red, 1);
      g.fillTriangle(70, 150, 110, 150, 90, 168);
      g.fillStyle(0xeef3ff, 1);
      g.fillRoundedRect(70, 70, 40, 84, 18);
      g.fillStyle(PALETTE.red, 1);
      g.fillTriangle(70, 80, 110, 80, 90, 40);
      g.fillTriangle(70, 130, 56, 156, 70, 150);
      g.fillTriangle(110, 130, 124, 156, 110, 150);
      g.fillStyle(PALETTE.skyTop, 1);
      g.fillCircle(90, 100, 10);
      g.fillStyle(PALETTE.orange, 1);
      g.fillTriangle(78, 168, 102, 168, 90, 200);
    },
  },
  'poster-grumble': {
    w: 180, h: 230, ax: 90, ay: 230,
    draw: (g) => {
      frame(g, 180, 230, PALETTE.skyBottom);
      g.fillStyle(0xa5b4dc, 1);
      for (const [x, y, r] of [[60, 110, 30], [90, 92, 36], [122, 110, 30], [90, 120, 34]]) g.fillCircle(x, y, r);
      g.fillStyle(INK, 1);
      g.fillCircle(78, 108, 5);
      g.fillCircle(102, 108, 5);
      g.lineStyle(4, INK, 1);
      g.beginPath();
      g.arc(90, 116, 12, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
      g.strokePath();
      [PALETTE.red, PALETTE.yellow, PALETTE.blue].forEach((c, i) => {
        g.lineStyle(8, c, 1);
        g.beginPath();
        g.arc(90, 210, 60 - i * 8, Math.PI, 0, false);
        g.strokePath();
      });
    },
  },
  'curtains-pink': { w: 330, h: 290, ax: 165, ay: 290, draw: (g) => curtains(g, PALETTE.pink) },
  'curtains-blue': { w: 330, h: 290, ax: 165, ay: 290, draw: (g) => curtains(g, PALETTE.blue) },
  beanbag: {
    w: 220, h: 150, ax: 110, ay: 148,
    draw: (g) => {
      g.fillStyle(darken(PALETTE.purple, 0.25), 1);
      g.fillEllipse(110, 110, 210, 76);
      g.fillStyle(PALETTE.purple, 1);
      g.fillEllipse(110, 96, 200, 96);
      g.fillCircle(70, 66, 50);
      g.fillStyle(0xc6a2ff, 1);
      g.fillEllipse(130, 80, 70, 30);
    },
  },
  hammock: {
    w: 320, h: 170, ax: 160, ay: 168,
    draw: (g) => {
      g.fillStyle(0xa96e43, 1);
      g.fillRect(4, 10, 12, 158);
      g.fillRect(304, 10, 12, 158);
      g.lineStyle(4, 0xd9b26f, 1);
      g.lineBetween(16, 30, 60, 80);
      g.lineBetween(304, 30, 260, 80);
      g.fillStyle(PALETTE.teal, 1);
      g.slice(160, 40, 110, Phaser.Math.DegToRad(15), Phaser.Math.DegToRad(165), false);
      g.fillPath();
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRect(70, 98, 180, 8);
    },
  },
  books: {
    w: 150, h: 100, ax: 75, ay: 100,
    draw: (g) => {
      [[PALETTE.red, 10, 30], [PALETTE.blue, 34, 14], [PALETTE.green, 58, 24], [PALETTE.yellow, 82, 8], [PALETTE.purple, 106, 20]].forEach(([c, x, top]) => {
        g.fillStyle(c, 1);
        g.fillRoundedRect(x, top, 22, 100 - top, 4);
        g.fillStyle(0xffffff, 0.6);
        g.fillRect(x + 4, top + 12, 14, 4);
      });
    },
  },
  trophy: {
    w: 100, h: 130, ax: 50, ay: 130,
    draw: (g) => {
      g.fillStyle(0xa96e43, 1);
      g.fillRoundedRect(20, 108, 60, 22, 6);
      g.fillStyle(0xd9a400, 1);
      g.fillRect(44, 76, 12, 34);
      g.lineStyle(9, PALETTE.yellow, 1);
      g.strokeCircle(18, 34, 14);
      g.strokeCircle(82, 34, 14);
      g.fillStyle(PALETTE.yellow, 1);
      g.slice(50, 20, 34, 0, Math.PI, false);
      g.fillPath();
      g.fillRect(16, 10, 68, 12);
      g.fillStyle(0xffffff, 1);
      drawStar(g, 50, 40, 5, 12, 5);
    },
  },
  'bunting-ceiling': {
    w: 720, h: 90, ax: 360, ay: 0,
    draw: (g) => {
      g.lineStyle(4, 0x8a5a3c, 1);
      g.beginPath();
      g.arc(360, -620, 650, Phaser.Math.DegToRad(56), Phaser.Math.DegToRad(124), false);
      g.strokePath();
      const colors = [PALETTE.red, PALETTE.yellow, PALETTE.blue, PALETTE.green, PALETTE.pink, PALETTE.purple, PALETTE.orange];
      for (let i = 0; i < 12; i++) {
        const x = 40 + i * 58;
        const y = 4 + Math.sin((i / 11) * Math.PI) * 26;
        g.fillStyle(colors[i % colors.length], 1);
        g.fillTriangle(x - 20, y, x + 20, y, x, y + 46);
      }
    },
  },
  'disco-ball': {
    w: 130, h: 200, ax: 65, ay: 0,
    draw: (g) => {
      g.lineStyle(4, 0xb0a8c8, 1);
      g.lineBetween(65, 0, 65, 70);
      g.fillStyle(0xc9d3ee, 1);
      g.fillCircle(65, 128, 56);
      for (let y = 80; y < 180; y += 14) {
        for (let x = 15; x < 120; x += 14) {
          if ((x - 65) ** 2 + (y - 128) ** 2 > 50 ** 2) continue;
          g.fillStyle([0xffffff, 0x9fdcff, 0xffc6ec, 0xe8e2f5][(x + y) % 4], 1);
          g.fillRect(x, y, 11, 11);
        }
      }
    },
  },
};

function curtains(g: G, color: number): void {
  g.fillStyle(darken(color, 0.25), 1);
  g.fillRect(0, 0, 330, 34);
  g.fillStyle(color, 1);
  g.fillTriangle(10, 30, 110, 30, 30, 290);
  g.fillTriangle(10, 30, 30, 290, 0, 290);
  g.fillTriangle(320, 30, 220, 30, 300, 290);
  g.fillTriangle(320, 30, 300, 290, 330, 290);
  for (let x = 6; x < 330; x += 36) g.fillCircle(x + 12, 34, 14);
}

export function hasItemArt(id: string): boolean {
  return id in ART;
}

/** Texture key for an item (drawn once). */
export function itemTexture(scene: Phaser.Scene, id: string): string {
  const art = ART[id];
  return bake(scene, `item-${id}`, art.w * SCALE, art.h * SCALE, (g) => {
    g.scaleCanvas(SCALE, SCALE);
    art.draw(g);
  });
}

/** An Image of an item centred at (x, y), scaled to fit inside maxW × maxH (never above `cap`). */
export function fittedItemImage(scene: Phaser.Scene, id: string, x: number, y: number, maxW: number, maxH: number, cap = 1.2): Phaser.GameObjects.Image {
  const art = ART[id];
  const scale = Math.min(cap, maxW / art.w, maxH / art.h);
  return scene.add.image(x, y, itemTexture(scene, id)).setScale(scale / SCALE);
}

/** An Image of an item at `scale`, positioned by its anchor. */
export function itemImage(scene: Phaser.Scene, id: string, x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  const art = ART[id];
  return scene.add
    .image(x, y, itemTexture(scene, id))
    .setOrigin(art.ax / art.w, art.ay / art.h)
    .setScale(scale / SCALE);
}
