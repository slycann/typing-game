import Phaser from 'phaser';
import { sfx } from './audio/Sfx';
import { GAME_H, GAME_W } from './config';
import { debug } from './debug';
import { keyboard } from './input/KeyboardInput';
import { BootScene } from './scenes/BootScene';
import { NewPlayerScene } from './scenes/NewPlayerScene';
import { ProfileSelectScene } from './scenes/ProfileSelectScene';
import { TitleScene } from './scenes/TitleScene';
import { WorkshopScene } from './scenes/WorkshopScene';

keyboard.start(window, () => sfx.unlock());
window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#4fc3ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: false }, // all keys go through KeyboardInput
  render: { antialias: true },
  scene: [BootScene, TitleScene, ProfileSelectScene, NewPlayerScene, WorkshopScene],
});
debug.fps = () => Math.round(game.loop.actualFps);
