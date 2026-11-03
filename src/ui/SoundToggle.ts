import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK, PALETTE, darken } from '../art/palette';
import { updateSettings } from '../settings';
import { store } from '../state';

/** A round speaker button: one click to mute or unmute everything. */
export class SoundToggle extends Phaser.GameObjects.Container {
  private icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    for (const on of [true, false]) {
      bake(scene, `sound-${on ? 'on' : 'off'}`, 96, 100, (g) => {
        const c = on ? PALETTE.blue : 0xb9b3c9;
        g.fillStyle(darken(c, 0.3), 1);
        g.fillCircle(48, 52, 44);
        g.fillStyle(c, 1);
        g.fillCircle(48, 48, 44);
        g.fillStyle(0xffffff, 1);
        g.fillRect(24, 38, 16, 22);
        g.fillTriangle(38, 38, 56, 22, 56, 76);
        g.fillTriangle(38, 60, 56, 76, 38, 38);
        if (on) {
          g.lineStyle(5, 0xffffff, 1);
          g.beginPath();
          g.arc(58, 49, 14, -0.9, 0.9, false);
          g.strokePath();
          g.beginPath();
          g.arc(58, 49, 24, -0.9, 0.9, false);
          g.strokePath();
        } else {
          g.lineStyle(6, INK, 1);
          g.lineBetween(62, 36, 80, 62);
          g.lineBetween(80, 36, 62, 62);
        }
      });
    }
    this.icon = scene.add.image(0, 0, this.key());
    const zone = scene.add.zone(0, 0, 96, 96).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => void this.toggle());
    this.add([this.icon, zone]);
    scene.add.existing(this);
  }

  private key(): string {
    return store.data.settings.muted ? 'sound-off' : 'sound-on';
  }

  private async toggle(): Promise<void> {
    await updateSettings({ muted: !store.data.settings.muted });
    this.icon.setTexture(this.key());
    sfx.select();
    this.scene.tweens.add({ targets: this, scale: { from: 1.25, to: 1 }, duration: 200 });
  }
}
