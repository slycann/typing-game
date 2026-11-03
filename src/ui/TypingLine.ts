import Phaser from 'phaser';
import { bake } from '../art/bake';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY } from '../config';

/**
 * One long line of text to type (a sentence, a race passage): finished letters slide off to
 * the left in green, the current letter sits in a yellow box, and what's next waits on the right.
 */
export class TypingLine extends Phaser.GameObjects.Container {
  private done: Phaser.GameObjects.Text;
  private cur: Phaser.GameObjects.Text;
  private rest: Phaser.GameObjects.Text;
  private box: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, width = 1500, size = 64) {
    super(scene, x, y);
    const plate = bake(scene, `typing-line-${width}`, width, 120, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 10, width, 110, 55);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, width, 110, 55);
    });
    this.box = scene.add.image(0, 0, bake(scene, 'typing-line-cur', 70, 90, (g) => {
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRoundedRect(0, 0, 70, 90, 18);
    }));
    const style = { fontFamily: FONT_BODY, fontSize: `${size}px`, fontStyle: 'bold' };
    this.done = scene.add.text(-35, 0, '', { ...style, color: '#1f9e4a' }).setOrigin(1, 0.5);
    this.cur = scene.add.text(0, 0, '', { ...style, color: INK_CSS }).setOrigin(0.5);
    this.rest = scene.add.text(35, 0, '', { ...style, color: INK_CSS }).setOrigin(0, 0.5);
    this.add([scene.add.image(0, 0, plate), this.box, this.done, this.cur, this.rest]);
    scene.add.existing(this);
  }

  /** Show `text` with the first `index` characters typed. */
  show(text: string, index: number, before = 16, after = 24): void {
    const vis = (s: string) => s.replace(/ /g, '·');
    this.done.setText(vis(text.slice(Math.max(0, index - before), index)));
    this.cur.setText(index < text.length ? (text[index] === ' ' ? '␣' : text[index]) : '');
    this.rest.setText(vis(text.slice(index + 1, index + after)));
    this.box.setVisible(index < text.length);
  }

  shake(): void {
    this.scene.tweens.add({ targets: this.box, angle: { from: -8, to: 8 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => this.box.setAngle(0) });
  }
}
