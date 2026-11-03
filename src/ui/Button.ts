import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake, hex } from '../art/bake';
import { INK_CSS, darken, lighten } from '../art/palette';
import { FONT_TITLE } from '../config';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: number;
  /** Small keycap hint shown on the button, e.g. "return". */
  keyHint?: string;
}

/** A big, squishy, clickable button that can also be "focused" from the keyboard. */
export class Button extends Phaser.GameObjects.Container {
  private bodyImg: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Image;
  private bw: number;
  private bh: number;
  private color: number;
  focused = false;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.bw = opts.width ?? 360;
    this.bh = opts.height ?? 110;
    this.color = opts.color ?? 0xff5fa2;
    this.ring = scene.add.image(0, 0, '__WHITE');
    this.bodyImg = scene.add.image(0, 0, '__WHITE');
    const text = scene.add
      .text(0, opts.keyHint ? -10 : -4, label, { fontFamily: FONT_TITLE, fontSize: `${opts.fontSize ?? 48}px`, color: '#ffffff', stroke: INK_CSS, strokeThickness: 8 })
      .setOrigin(0.5);
    const parts: Phaser.GameObjects.GameObject[] = [this.ring, this.bodyImg, text];
    if (opts.keyHint) {
      parts.push(
        scene.add
          .text(0, this.bh / 2 - 26, `press ${opts.keyHint}`, { fontFamily: 'Andika', fontSize: '22px', color: '#ffffff', fontStyle: 'bold' })
          .setOrigin(0.5),
      );
    }
    const zone = scene.add.zone(0, 0, this.bw, this.bh).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => this.setScale(1.05));
    zone.on('pointerout', () => this.setScale(this.focused ? 1.08 : 1));
    zone.on('pointerdown', () => {
      sfx.select();
      this.squish(onClick);
    });
    this.add([...parts, zone]);
    this.draw();
    scene.add.existing(this);
  }

  setFocused(on: boolean): this {
    this.focused = on;
    this.setScale(on ? 1.08 : 1);
    this.draw();
    return this;
  }

  squish(then?: () => void): void {
    this.scene.tweens.add({ targets: this, scaleX: 0.92, scaleY: 0.88, duration: 70, yoyo: true, onComplete: () => then?.() });
  }

  private draw(): void {
    const w = this.bw;
    const h = this.bh;
    const r = h / 2.4;
    const color = this.color;
    const bodyKey = bake(this.scene, `button-${w}x${h}-${hex(color)}`, w, h + 10, (g) => {
      g.fillStyle(darken(color, 0.3), 1);
      g.fillRoundedRect(0, 10, w, h, r);
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, h, r);
      g.fillStyle(lighten(color, 0.35), 1);
      g.fillRoundedRect(18, 10, w - 36, h * 0.22, r * 0.5);
    });
    this.bodyImg.setTexture(bodyKey).setOrigin(0.5, h / 2 / (h + 10));
    const ringKey = bake(this.scene, `button-ring-${w}x${h}`, w + 30, h + 40, (g) => {
      g.lineStyle(10, 0xfff27a, 1);
      g.strokeRoundedRect(5, 5, w + 20, h + 30, r + 10);
    });
    this.ring.setTexture(ringKey).setOrigin(0.5, (h / 2 + 15) / (h + 40)).setVisible(this.focused);
  }
}
