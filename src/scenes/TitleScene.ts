import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { Grumble } from '../art/Grumble';
import { Letterling } from '../art/Letterling';
import { INK_CSS, PALETTE, css } from '../art/palette';
import { cloud, flower, hills, sky, sun, tree } from '../art/scenery';
import { characterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { keyboard } from '../input/KeyboardInput';
import { Button } from '../ui/Button';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { SpeechBubble } from '../ui/SpeechBubble';
import { enterScene, goTo, onKeys } from './common';

const TITLE = 'Key Quest';
const LETTER_COLORS = [PALETTE.red, PALETTE.orange, PALETTE.yellow, PALETTE.green, PALETTE.blue, PALETTE.purple, PALETTE.hotPink, PALETTE.teal];
const SNEEZE_LETTERS = 'asdfjkl';

export class TitleScene extends Phaser.Scene {
  private kb!: OnScreenKeyboard;
  private juni!: Phaser.GameObjects.Image;
  private bubble!: SpeechBubble;
  private greeted = false;
  private lastSpoken = 0;

  constructor() {
    super('Title');
  }

  create(): void {
    enterScene(this);
    this.greeted = false;
    sky(this);
    sun(this, 1760, 130, 70);
    cloud(this, 260, 150, 0.9);
    cloud(this, 1020, 90, 0.7);
    cloud(this, 1380, 250, 0.6);
    hills(this, 470);
    tree(this, 110, 640, 1);
    tree(this, 600, 520, 0.6, 0x5fd35f);
    tree(this, 1400, 540, 0.7);
    [[300, 700, PALETTE.pink], [470, 640, PALETTE.yellow], [1560, 660, PALETTE.purple], [1620, 720, PALETTE.red], [1300, 610, PALETTE.blue]].forEach(([x, y, c]) => flower(this, x, y, c, 0.9));

    this.makeTitle();
    const grumble = new Grumble(this, 1560, 380, 0.65);
    this.time.addEvent({ delay: 6500, loop: true, startAt: 3500, callback: () => grumble.sneeze(() => this.sneezeLetter(grumble)) });

    this.juni = characterImage(this, 'juni', 200, 930, 1.15);
    this.tweens.add({ targets: this.juni, scaleY: this.juni.scaleY * 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const qwerty = characterImage(this, 'qwerty', 1740, 930, 0.95);
    this.tweens.add({ targets: qwerty, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const kbW = 1150;
    this.kb = new OnScreenKeyboard(this, (GAME_W - kbW) / 2, GAME_H - OnScreenKeyboard.heightFor(kbW) - 34, { width: kbW }).attach(keyboard);
    this.kb.setTargets(['Enter']);
    debug.keyboard = this.kb;

    new Button(this, GAME_W / 2 + 40, 470, 'Play!', () => this.start(), { width: 380, height: 130, fontSize: 64, keyHint: 'return', color: PALETTE.hotPink });

    this.bubble = new SpeechBubble(this, 460, 500, 600, 'left');
    this.time.delayedCall(900, () => !this.greeted && this.bubble.say("Hi! I'm Juni!\nPress any key!", { speak: false }));

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (!this.greeted) {
        this.greeted = true;
        this.bubble.say('Welcome to\nKeyboard Valley!\nPress return to play!', { spoken: 'Welcome to Keyboard Valley! Press the return key to play!' });
      }
      if (e.code === 'Enter') return this.start();
      sfx.key();
      this.hopJuni();
      if (e.char && e.char.trim()) this.popLetter(e.code, e.char);
    });
  }

  private start(): void {
    sfx.select();
    narrator.stop();
    goTo(this, 'ProfileSelect');
  }

  private makeTitle(): void {
    const size = 170;
    const spacing = size * 0.6;
    const startX = GAME_W / 2 - ((TITLE.length - 1) * spacing) / 2;
    [...TITLE].forEach((ch, i) => {
      if (ch === ' ') return;
      const t = this.add
        .text(startX + i * spacing, 170, ch, { fontFamily: FONT_TITLE, fontSize: `${size}px`, color: css(LETTER_COLORS[i % LETTER_COLORS.length]), stroke: INK_CSS, strokeThickness: 16 })
        .setOrigin(0.5);
      this.tweens.add({ targets: t, y: 150, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 110 });
    });
    this.add
      .text(GAME_W / 2, 300, 'A typing adventure in Keyboard Valley', { fontFamily: FONT_BODY, fontSize: '44px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 9, fontStyle: 'bold' })
      .setOrigin(0.5);
  }

  /** A Letterling leaps out of the key that was pressed, does a little dance, and runs off. */
  private popLetter(code: string, char: string): void {
    const from = this.kb.keyWorld(code);
    if (!from) return;
    this.kb.sparkle(code);
    const now = this.time.now;
    if (now - this.lastSpoken > 350) {
      narrator.say(narrator.nameOf(char));
      this.lastSpoken = now;
    }
    const l = new Letterling(this, from.x, from.y, char, 90).setScale(0.3);
    const landX = Phaser.Math.Clamp(from.x + Phaser.Math.Between(-260, 260), 420, 1500);
    const landY = Phaser.Math.Between(600, 640);
    this.tweens.add({ targets: l, scale: 1, duration: 300 });
    this.tweens.add({ targets: l, x: landX, duration: 620, ease: 'Linear' });
    this.tweens.add({
      targets: l,
      y: landY - 260,
      duration: 310,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        l.y = landY;
        l.dance(2);
        this.tweens.add({ targets: l, alpha: 0, x: l.x + Phaser.Math.Between(-200, 200), delay: 900, duration: 700, onComplete: () => l.destroy() });
      },
    });
  }

  private sneezeLetter(grumble: Grumble): void {
    sfx.pop();
    const ch = SNEEZE_LETTERS[Math.floor(Math.random() * SNEEZE_LETTERS.length)];
    const l = new Letterling(this, grumble.x - 60, grumble.y + 20, ch, 70);
    this.tweens.add({ targets: l, x: Phaser.Math.Between(700, 1300), duration: 1300, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: l, y: grumble.y - 160, duration: 500, ease: 'Quad.easeOut', yoyo: true, hold: 0, onComplete: () => this.tweens.add({ targets: l, y: GAME_H + 200, duration: 1600, ease: 'Quad.easeIn', onComplete: () => l.destroy() }) });
    this.tweens.add({ targets: l, angle: 720, duration: 2400 });
  }

  private hopJuni(): void {
    if (this.tweens.isTweening(this.juni) && this.juni.getData('hopping')) return;
    this.juni.setData('hopping', true);
    this.tweens.add({ targets: this.juni, y: 880, duration: 140, yoyo: true, ease: 'Quad.easeOut', onComplete: () => this.juni.setData('hopping', false) });
  }
}
