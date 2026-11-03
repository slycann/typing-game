import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { Grumble } from '../art/Grumble';
import { INK_CSS, PALETTE } from '../art/palette';
import { characterImage } from '../art/textures';
import { backdrop, themeFor } from '../art/themes';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { Button } from '../ui/Button';
import { enterScene, goTo, onKeys } from './common';

/** Shown when today's play limit (set by a grown-up) is used up. */
export class TimeUpScene extends Phaser.Scene {
  constructor() {
    super('TimeUp');
  }

  create(): void {
    enterScene(this);
    music.play('calm');
    backdrop(this, themeFor(7), 640, { sun: [1600, 200] });
    const juni = characterImage(this, 'juni', 760, 1010, 1.3);
    this.tweens.add({ targets: juni, angle: { from: -2, to: 2 }, duration: 1600, yoyo: true, repeat: -1 });
    const g = new Grumble(this, 1180, 760, 0.8);
    g.restMood = 'happy';
    g.setMood('happy');
    this.add.text(GAME_W / 2, 170, "That's all for today!", { fontFamily: FONT_TITLE, fontSize: '96px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 14 }).setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 300, 'Great typing! Your fingers need a rest.\nCome back tomorrow for more adventures.', { fontFamily: FONT_BODY, fontSize: '44px', color: '#ffffff', fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5);
    new Button(this, GAME_W / 2, 470, 'Grown-ups', () => goTo(this, 'Grownups'), { width: 340, height: 100, fontSize: 40, color: PALETTE.purple });
    narrator.say("That's all for today! Great typing! Your fingers need a rest. Come back tomorrow for more adventures.");
    onKeys(this, () => undefined); // typing here does nothing
  }
}
