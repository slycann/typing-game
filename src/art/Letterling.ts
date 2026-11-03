import Phaser from 'phaser';
import { FONT_TITLE } from '../config';
import { bake, hex } from './bake';
import { FINGER_COLORS, INK, INK_CSS, darken, lighten } from './palette';
import { KEY_BY_CODE, strokeForChar } from '../input/keyLayout';

/** A Letterling: a little gumdrop creature that carries its letter on its tummy. Origin is at its feet. */
export class Letterling extends Phaser.GameObjects.Container {
  readonly char: string;

  constructor(scene: Phaser.Scene, x: number, y: number, char: string, size = 110) {
    super(scene, x, y);
    this.char = char;
    const stroke = strokeForChar(char);
    const finger = stroke ? KEY_BY_CODE.get(stroke.code)?.finger : undefined;
    const color = finger ? FINGER_COLORS[finger] : 0xff8fab;
    const s = size;
    // Texture is s wide and 1.1s tall; the feet sit at (0.5s, 1.06s).
    const ox = s * 0.5;
    const oy = s * 1.06;
    const key = bake(scene, `letterling-${hex(color)}-${s}`, s, s * 1.1, (g) => {
      g.fillStyle(darken(color, 0.35), 1);
      g.fillEllipse(ox - s * 0.2, oy - s * 0.03, s * 0.28, s * 0.14);
      g.fillEllipse(ox + s * 0.2, oy - s * 0.03, s * 0.28, s * 0.14);
      g.fillStyle(darken(color, 0.25), 1);
      g.fillRoundedRect(ox - s * 0.46, oy - s * 1.02, s * 0.92, s * 0.98, s * 0.4);
      g.fillStyle(color, 1);
      g.fillRoundedRect(ox - s * 0.42, oy - s * 0.98, s * 0.84, s * 0.9, s * 0.38);
      g.fillStyle(lighten(color, 0.5), 1);
      g.fillEllipse(ox, oy - s * 0.36, s * 0.62, s * 0.46);
      for (const ex of [-s * 0.16, s * 0.16]) {
        g.fillStyle(0xffffff, 1);
        g.fillCircle(ox + ex, oy - s * 0.76, s * 0.11);
        g.fillStyle(INK, 1);
        g.fillCircle(ox + ex + s * 0.02, oy - s * 0.75, s * 0.055);
      }
      g.fillStyle(0xff8fab, 0.7);
      g.fillCircle(ox - s * 0.3, oy - s * 0.62, s * 0.06);
      g.fillCircle(ox + s * 0.3, oy - s * 0.62, s * 0.06);
    });
    const body = scene.add.image(0, 0, key).setOrigin(0.5, 1.06 / 1.1);
    const label = char === ' ' ? '␣' : char;
    const t = scene.add
      .text(0, -s * 0.37, label, { fontFamily: FONT_TITLE, fontSize: `${Math.round(s * 0.5)}px`, color: '#ffffff', stroke: INK_CSS, strokeThickness: Math.max(4, s * 0.06) })
      .setOrigin(0.5);
    this.add([body, t]);
    scene.add.existing(this);
  }

  /** Bounce on the spot a few times. */
  dance(times = 2): this {
    this.scene.tweens.add({ targets: this, y: this.y - 40, scaleY: 1.06, duration: 200, yoyo: true, repeat: times - 1, ease: 'Quad.easeOut' });
    return this;
  }
}
