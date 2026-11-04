import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { bake } from '../art/bake';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { keyboard } from '../input/KeyboardInput';

/**
 * On iPad, someone may tap Play with no keyboard attached. This card explains that Letterlings needs
 * a real keyboard, and disappears by itself the moment a key is pressed.
 */
export function showKeyboardNeeded(scene: Phaser.Scene): void {
  const c = scene.add.container(0, 0).setDepth(3000);
  c.add(scene.add.rectangle(0, 0, GAME_W, GAME_H, INK, 0.6).setOrigin(0, 0).setInteractive());
  const card = bake(scene, 'kb-needed-card', 1100, 560, (g) => {
    g.fillStyle(INK, 1);
    g.fillRoundedRect(0, 16, 1100, 544, 60);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 1100, 544, 60);
    // a little keyboard with a cable
    g.fillStyle(0x8f7cf7, 1);
    g.fillRoundedRect(380, 300, 340, 150, 24);
    g.fillStyle(0xfff4dc, 1);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) g.fillRoundedRect(398 + k * 39, 318 + r * 40, 32, 30, 6);
    g.lineStyle(10, INK, 1);
    g.beginPath();
    g.moveTo(720, 375);
    g.lineTo(820, 375);
    g.lineTo(820, 300);
    g.strokePath();
    g.fillStyle(PALETTE.yellow, 1);
    g.fillRoundedRect(800, 268, 40, 40, 8);
  });
  c.add(scene.add.image(GAME_W / 2, GAME_H / 2, card));
  c.add(scene.add.text(GAME_W / 2, GAME_H / 2 - 190, 'Letterlings needs a real keyboard!', { fontFamily: FONT_TITLE, fontSize: '58px', color: '#ff5fa2' }).setOrigin(0.5));
  c.add(
    scene.add
      .text(GAME_W / 2, GAME_H / 2 - 95, 'Connect a keyboard to your iPad,\nthen press any key to start.', { fontFamily: FONT_BODY, fontSize: '40px', color: INK_CSS, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5),
  );
  c.setScale(0.8).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });
  narrator.say('Letterlings needs a real keyboard! Connect a keyboard, then press any key to start.');
  const off = keyboard.on((e) => {
    if (e.type !== 'down') return;
    off();
    scene.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
}
