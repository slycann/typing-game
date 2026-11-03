import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { Letterling } from '../art/Letterling';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { Button } from '../ui/Button';
import { onKeys } from './common';

/** Overlay shown over a paused game. Typing here makes Letterlings pop up and wave. */
export class PauseScene extends Phaser.Scene {
  private from = '';

  constructor() {
    super('Pause');
  }

  create(data: { from: string }): void {
    this.from = data.from;
    debug.scene = 'Pause';
    this.add.rectangle(0, 0, GAME_W, GAME_H, INK, 0.6).setOrigin(0, 0).setInteractive();
    const title = this.add
      .text(GAME_W / 2, 230, 'Paused', { fontFamily: FONT_TITLE, fontSize: '130px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 16 })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, angle: { from: -3, to: 3 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add
      .text(GAME_W / 2, 360, 'Take a stretch! Wiggle your fingers!', { fontFamily: FONT_BODY, fontSize: '44px', color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5);
    new Button(this, GAME_W / 2 - 260, 560, 'Keep playing', () => this.resumeGame(), { width: 460, height: 130, fontSize: 52, color: PALETTE.green, keyHint: 'space' });
    new Button(this, GAME_W / 2 + 260, 560, 'Map', () => this.toMap(), { width: 360, height: 130, fontSize: 52, color: PALETTE.orange, keyHint: 'return' });
    narrator.say('Paused. Take a stretch! Press space to keep playing.');

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Escape') return this.resumeGame();
      if (e.code === 'Enter') return this.toMap();
      if (e.char?.trim()) this.wave(e.char);
    });
  }

  private wave(ch: string): void {
    sfx.pop();
    const l = new Letterling(this, Phaser.Math.Between(200, GAME_W - 200), GAME_H + 120, ch, 120);
    this.tweens.add({ targets: l, y: GAME_H - 60, duration: 350, ease: 'Back.easeOut' });
    this.tweens.add({ targets: l, angle: { from: -12, to: 12 }, duration: 160, yoyo: true, repeat: 3, delay: 350 });
    this.tweens.add({ targets: l, y: GAME_H + 160, delay: 1300, duration: 400, ease: 'Quad.easeIn', onComplete: () => l.destroy() });
  }

  private resumeGame(): void {
    sfx.select();
    narrator.stop();
    debug.scene = this.from;
    this.scene.resume(this.from);
    this.scene.stop();
  }

  private toMap(): void {
    sfx.select();
    narrator.stop();
    this.scene.stop(this.from);
    this.scene.start('WorldMap');
  }
}
