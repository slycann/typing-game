import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { INK, INK_CSS } from '../art/palette';
import { FONT_BODY } from '../config';
import { text as textPrefs } from '../settings';

/** A comic speech bubble. say() shows the words and reads them aloud for little ones. */
export class SpeechBubble extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private maxW: number;
  private tail: 'left' | 'right' | 'none';

  constructor(scene: Phaser.Scene, x: number, y: number, maxWidth = 620, tail: 'left' | 'right' | 'none' = 'left') {
    super(scene, x, y);
    this.maxW = maxWidth;
    this.tail = tail;
    this.g = scene.add.graphics();
    this.text = scene.add
      .text(0, 0, '', { fontFamily: FONT_BODY, fontSize: textPrefs.easyRead ? '46px' : '40px', color: INK_CSS, fontStyle: 'bold', align: 'center', wordWrap: { width: maxWidth - 60 }, lineSpacing: textPrefs.easyRead ? 10 : 0 })
      .setOrigin(0.5);
    this.add([this.g, this.text]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  say(words: string, opts: { speak?: boolean; spoken?: string } = {}): void {
    this.text.setText(words);
    const w = Math.min(this.maxW, this.text.width + 70);
    const h = this.text.height + 50;
    const g = this.g;
    g.clear();
    g.fillStyle(INK, 1);
    g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 36);
    if (this.tail !== 'none') {
      const dir = this.tail === 'left' ? -1 : 1;
      g.fillTriangle(dir * (w / 2 - 70), h / 2 - 10, dir * (w / 2 - 20), h / 2 - 10, dir * (w / 2 + 6), h / 2 + 48);
    }
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 32);
    if (this.tail !== 'none') {
      const dir = this.tail === 'left' ? -1 : 1;
      g.fillTriangle(dir * (w / 2 - 64), h / 2 - 14, dir * (w / 2 - 26), h / 2 - 14, dir * (w / 2 - 2), h / 2 + 38);
    }
    this.setVisible(true).setScale(0.6);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 260, ease: 'Back.easeOut' });
    if (opts.speak ?? true) narrator.say(opts.spoken ?? words);
  }

  hide(): void {
    this.setVisible(false);
  }
}
