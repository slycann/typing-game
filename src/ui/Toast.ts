import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import type { Badge } from '../engine/Achievements';

/** A banner that slides down from the top for new badges and other big news. */
export function banner(scene: Phaser.Scene, title: string, sub: string, delay = 0, speak = true): void {
  const key = bake(scene, 'banner', 760, 150, (g) => {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(0, 10, 760, 140, 40);
    g.fillStyle(PALETTE.yellow, 1);
    g.fillRoundedRect(0, 0, 760, 140, 40);
    g.fillStyle(0xffffff, 0.4);
    g.fillRoundedRect(20, 10, 720, 30, 15);
  });
  const c = scene.add.container(GAME_W / 2, -120).setDepth(2000);
  c.add(scene.add.image(0, 0, key));
  c.add(scene.add.text(0, -24, title, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0.5));
  c.add(scene.add.text(0, 30, sub, { fontFamily: FONT_BODY, fontSize: '30px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
  scene.tweens.add({
    targets: c,
    y: 110,
    delay,
    duration: 450,
    ease: 'Back.easeOut',
    onStart: () => {
      sfx.cheer();
      if (speak) narrator.say(`${title} ${sub}`, { interrupt: false });
    },
    onComplete: () => scene.tweens.add({ targets: c, y: -140, delay: 2600, duration: 350, ease: 'Quad.easeIn', onComplete: () => c.destroy() }),
  });
}

export function badgeBanners(scene: Phaser.Scene, badges: Badge[], startDelay = 0): void {
  badges.forEach((b, i) => banner(scene, `New badge: ${b.name}!`, b.desc, startDelay + i * 3600));
}
