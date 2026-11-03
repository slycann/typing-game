import Phaser from 'phaser';
import { sfx } from './audio/Sfx';
import { GAME_H, GAME_W } from './config';
import { debug } from './debug';
import { keyboard } from './input/KeyboardInput';
import { store } from './state';
import { BubblePopScene } from './games/BubblePopScene';
import { FingerFitnessScene } from './games/FingerFitnessScene';
import { GrumbleBossScene } from './games/GrumbleBossScene';
import { KeyHopScene } from './games/KeyHopScene';
import { BootScene } from './scenes/BootScene';
import { GrownupsScene } from './scenes/GrownupsScene';
import { InitialsScene } from './scenes/InitialsScene';
import { LeaderboardScene } from './scenes/LeaderboardScene';
import { PracticeGardenScene } from './scenes/PracticeGardenScene';
import { ShopScene } from './scenes/ShopScene';
import { SpeedRaceScene } from './scenes/SpeedRaceScene';
import { StickerBookScene } from './scenes/StickerBookScene';
import { TreehouseScene } from './scenes/TreehouseScene';
import { NewPlayerScene } from './scenes/NewPlayerScene';
import { PauseScene } from './scenes/PauseScene';
import { ProfileSelectScene } from './scenes/ProfileSelectScene';
import { ResultsScene } from './scenes/ResultsScene';
import { StoryScene } from './scenes/StoryScene';
import { TitleScene } from './scenes/TitleScene';
import { WorkshopScene } from './scenes/WorkshopScene';
import { WorldMapScene } from './scenes/WorldMapScene';

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
  scene: [
    BootScene,
    TitleScene,
    ProfileSelectScene,
    NewPlayerScene,
    StoryScene,
    WorldMapScene,
    WorkshopScene,
    FingerFitnessScene,
    KeyHopScene,
    BubblePopScene,
    GrumbleBossScene,
    ResultsScene,
    PauseScene,
    GrownupsScene,
    PracticeGardenScene,
    SpeedRaceScene,
    InitialsScene,
    LeaderboardScene,
    ShopScene,
    TreehouseScene,
    StickerBookScene,
  ],
});
debug.fps = () => Math.round(game.loop.actualFps);
debug.profile = () => store.getProfile(store.data.lastProfileId) ?? null;
debug.players = () => store.profiles.map((p) => ({ name: p.name, coins: p.coins, stars: Object.keys(p.stars).length, stickers: p.stickers }));
