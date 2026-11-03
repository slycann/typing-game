import Phaser from 'phaser';
import { bake, hex } from '../art/bake';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { FONT_BODY } from '../config';
import { text as textPrefs } from '../settings';

interface Tile {
  c: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  t: Phaser.GameObjects.Text;
  w: number;
  h: number;
  ch: string;
}

/** The text to type, one chunky tile per character: green when done, sunny yellow for "now". */
export class TargetStrip extends Phaser.GameObjects.Container {
  private tiles: Tile[] = [];
  private bob: Phaser.Tweens.Tween | null = null;
  index = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, maxWidth = 1500) {
    super(scene, x, y);
    const size = Math.min(120, Math.floor(maxWidth / Math.max(1, text.length) / 1.08));
    const gap = size * (textPrefs.easyRead ? 0.22 : 0.1);
    const widths = [...text].map((ch) => (ch === ' ' ? size * 0.7 : size));
    const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
    let cx = -total / 2;
    [...text].forEach((ch, i) => {
      const w = widths[i];
      const img = scene.add.image(0, 0, '__WHITE');
      const t = scene.add
        .text(0, -size * 0.04, ch === ' ' ? '' : ch, { fontFamily: FONT_BODY, fontSize: `${Math.round(size * 0.62)}px`, color: INK_CSS, fontStyle: 'bold' })
        .setOrigin(0.5);
      const c = scene.add.container(cx + w / 2, 0, [img, t]);
      this.add(c);
      this.tiles.push({ c, img, t, w: Math.round(w), h: size, ch });
      cx += w + gap;
    });
    scene.add.existing(this);
    this.setIndex(0);
  }

  setIndex(i: number): void {
    this.index = i;
    this.bob?.remove();
    this.bob = null;
    this.tiles.forEach((tile, k) => {
      const state = k < i ? 'done' : k === i ? 'now' : 'todo';
      this.paint(tile, state);
      tile.c.setScale(state === 'now' ? 1.15 : state === 'done' ? 0.92 : 1);
      tile.c.y = 0;
    });
    const now = this.tiles[i];
    if (now) {
      this.bob = this.scene.tweens.add({ targets: now.c, y: -12, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /** Celebrate the tile that was just typed correctly. */
  popDone(i: number): void {
    const tile = this.tiles[i];
    if (!tile) return;
    this.scene.tweens.add({ targets: tile.c, scale: { from: 1.35, to: 0.92 }, duration: 220, ease: 'Back.easeOut' });
  }

  shake(i: number): void {
    const tile = this.tiles[i];
    if (!tile) return;
    const x = tile.c.x;
    this.scene.tweens.add({ targets: tile.c, x: { from: x - 10, to: x + 10 }, duration: 50, yoyo: true, repeat: 2, onComplete: () => (tile.c.x = x) });
  }

  private paint(tile: Tile, state: 'done' | 'now' | 'todo'): void {
    const { w, h, ch } = tile;
    const fill = state === 'done' ? PALETTE.green : state === 'now' ? PALETTE.yellow : 0xfff4dc;
    const space = ch === ' ';
    const key = bake(this.scene, `tile-${w}x${h}-${hex(fill)}-${space ? 's' : 'c'}-${state}`, w, h + 7, (g) => {
      g.fillStyle(darken(fill, 0.3), 1);
      g.fillRoundedRect(0, 7, w, h, h * 0.24);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(0, 0, w, h, h * 0.24);
      if (space) {
        // a little space-bar drawing so "space" is something you can see
        g.fillStyle(state === 'done' ? 0xffffff : INK, state === 'todo' ? 0.4 : 0.8);
        g.fillRoundedRect(w * 0.18, h * 0.62, w * 0.64, h * 0.1, 4);
      }
    });
    tile.img.setTexture(key).setOrigin(0.5, h / 2 / (h + 7));
    tile.t.setColor(state === 'done' ? '#ffffff' : INK_CSS);
  }
}
