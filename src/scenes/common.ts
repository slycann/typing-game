import Phaser from 'phaser';
import { debug } from '../debug';
import { keyboard, type KeyListener } from '../input/KeyboardInput';
import { narrator } from '../audio/Narrator';

/** Subscribe to the keyboard for as long as this scene is running. */
export function onKeys(scene: Phaser.Scene, listener: KeyListener): void {
  const off = keyboard.on(listener);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
}

const leaving = new WeakMap<Phaser.Scene, boolean>();

export function enterScene(scene: Phaser.Scene): void {
  leaving.set(scene, false);
  debug.mark(`enter ${scene.scene.key}`);
  debug.scene = scene.scene.key;
  debug.info = {};
  debug.keyboard = null;
  scene.cameras.main.fadeIn(280, 255, 244, 220);
}

/** Fade out and switch scenes (ignores repeat calls while already leaving). */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (leaving.get(scene)) return;
  leaving.set(scene, true);
  debug.mark(`leave ${scene.scene.key}`);
  narrator.stop();
  scene.cameras.main.fadeOut(240, 255, 244, 220);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    debug.mark(`faded ${scene.scene.key}`);
    scene.scene.start(key, data);
  });
}

/** Little burst of falling confetti. */
export function confetti(scene: Phaser.Scene, x: number, y: number, count = 60): void {
  const colors = [0xff5d5d, 0xffd23f, 0x3ccf6e, 0x3a86ff, 0x9b5de5, 0xff5fa2, 0xff9a3c];
  for (let i = 0; i < count; i++) {
    const r = scene.add.rectangle(x, y, 14, 22, colors[i % colors.length]).setDepth(1000);
    const ang = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 500;
    scene.tweens.add({
      targets: r,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist * 0.6 + 500,
      angle: Math.random() * 720,
      alpha: 0,
      duration: 1400 + Math.random() * 800,
      ease: 'Quad.easeIn',
      onComplete: () => r.destroy(),
    });
  }
}
