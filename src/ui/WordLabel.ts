import Phaser from 'phaser';
import { INK_CSS } from '../art/palette';
import { FONT_BODY } from '../config';
import { text as textPrefs } from '../settings';

/** A word where the letters already typed turn green, so kids can see how far they've got. */
export class WordLabel extends Phaser.GameObjects.Container {
  private done: Phaser.GameObjects.Text;
  private rest: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, private text: string, size = 56, color = INK_CSS) {
    super(scene, x, y);
    const easy = textPrefs.easyRead;
    const style = { fontFamily: FONT_BODY, fontSize: `${Math.round(size * (easy ? 1.15 : 1))}px`, fontStyle: 'bold', color };
    this.done = scene.add.text(0, 0, '', { ...style, color: '#1f9e4a' }).setOrigin(0, 0.5).setLetterSpacing(easy ? 6 : 0);
    this.rest = scene.add.text(0, 0, text, style).setOrigin(0, 0.5).setLetterSpacing(easy ? 6 : 0);
    this.add([this.done, this.rest]);
    this.setTyped(0);
  }

  textWidth(): number {
    return this.done.width + this.rest.width;
  }

  setTyped(n: number): void {
    const shown = (s: string) => s.replace(/ /g, '␣');
    this.done.setText(shown(this.text.slice(0, n)));
    this.rest.setText(shown(this.text.slice(n)));
    const total = this.done.width + this.rest.width;
    this.done.x = -total / 2;
    this.rest.x = this.done.x + this.done.width;
  }
}
