import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK_CSS, PALETTE, darken } from '../art/palette';
import { Avatar } from '../art/Avatar';
import { FONT_BODY, FONT_TITLE } from '../config';
import type { Profile } from '../save/types';

/** Top-left badge: the player's critter, name and coins. Coins can fly into it. */
export class ProfileBadge extends Phaser.GameObjects.Container {
  private coinText: Phaser.GameObjects.Text;
  private coinIcon: Phaser.GameObjects.Image;
  private shown: number;

  constructor(scene: Phaser.Scene, private profile: Profile, x = 24, y = 24) {
    super(scene, x, y);
    const pill = bake(scene, 'hud-pill', 470, 128, (g) => {
      g.fillStyle(darken(PALETTE.blue, 0.35), 1);
      g.fillRoundedRect(0, 8, 470, 120, 60);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 470, 120, 60);
      g.fillStyle(PALETTE.lilac, 1);
      g.fillCircle(60, 60, 52);
    });
    const coin = bake(scene, 'hud-coin', 56, 60, (g) => {
      g.fillStyle(0xd9a400, 1);
      g.fillCircle(28, 31, 26);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillCircle(28, 28, 26);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(20, 20, 7);
    });
    this.shown = profile.coins;
    this.coinIcon = scene.add.image(376, 60, coin);
    this.coinText = scene.add.text(410, 60, String(profile.coins), { fontFamily: FONT_BODY, fontSize: '42px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.add([
      scene.add.image(0, 0, pill).setOrigin(0, 0),
      new Avatar(scene, 60, 116, profile, 0.33, false),
      scene.add.text(126, 60, profile.name, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0, 0.5),
      this.coinIcon,
      this.coinText,
    ]);
    scene.add.existing(this);
  }

  setCoins(n: number): void {
    this.shown = n;
    this.coinText.setText(String(n));
    this.scene.tweens.add({ targets: this.coinIcon, scale: { from: 1.4, to: 1 }, duration: 200 });
  }

  /** Coins pop out of (fromX, fromY) and fly into the badge, counting up as they land. */
  flyCoins(fromX: number, fromY: number, n: number, delay = 0): void {
    this.shown = this.profile.coins - n;
    this.coinText.setText(String(this.shown));
    const tx = this.x + this.coinIcon.x;
    const ty = this.y + this.coinIcon.y;
    for (let i = 0; i < n; i++) {
      const c = this.scene.add.image(fromX + Phaser.Math.Between(-160, 160), fromY + Phaser.Math.Between(-30, 30), 'hud-coin').setDepth(900).setScale(0.8);
      this.scene.tweens.add({
        targets: c,
        x: tx,
        y: ty,
        delay: delay + i * 90,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          c.destroy();
          this.coinText.setText(String(++this.shown));
          sfx.coin();
          this.scene.tweens.add({ targets: this.coinIcon, scale: { from: 1.4, to: 1 }, duration: 160 });
        },
      });
    }
  }
}
