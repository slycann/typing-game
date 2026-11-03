import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { ensureCritter, loadCoreTextures } from '../art/textures';
import { INK_CSS } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { store } from '../state';
import { sky } from '../art/scenery';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    debug.scene = 'Boot';
    sky(this);
    const label = this.add
      .text(GAME_W / 2, GAME_H / 2, 'Getting the keys ready…', { fontFamily: 'sans-serif', fontSize: '56px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 10 })
      .setOrigin(0.5);
    this.tweens.add({ targets: label, scale: 1.06, duration: 500, yoyo: true, repeat: -1 });
    void this.boot();
  }

  private async boot(): Promise<void> {
    await Promise.all([
      document.fonts.load(`40px ${FONT_BODY}`),
      document.fonts.load(`bold 40px ${FONT_BODY}`),
      document.fonts.load(`40px ${FONT_TITLE}`),
    ]).catch(() => undefined);
    try {
      await store.load();
    } catch (err) {
      console.error('Could not load saved progress', err);
    }
    sfx.setVolume(store.data.settings.volume);
    narrator.setEnabled(store.data.settings.voice);
    await loadCoreTextures(this);
    await Promise.all(store.profiles.map((p) => ensureCritter(this, p.animal, p.outfit))).catch(() => undefined);
    this.scene.start('Title');
  }
}
