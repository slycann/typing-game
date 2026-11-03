import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { bake } from '../art/bake';
import { fingerFriendImage, fingerFriendKey } from '../art/friends';
import { FINGER_FRIENDS, INK, INK_CSS } from '../art/palette';
import { bunting, cloud, hills, sky } from '../art/scenery';
import { FONT_BODY, FONT_TITLE } from '../config';
import type { KeyInputEvent } from '../input/KeyboardInput';
import { KEY_BY_CODE, howToType, strokeForChar, type Finger } from '../input/keyLayout';
import { GameBase } from './GameBase';

const CHEERS = ['Nice!', 'Yes!', 'Strong finger!', 'Woo!', 'Great!'];

/**
 * Finger Fitness: Simon-says with the Finger Friends. The coach calls a key; you press it.
 * In the second half the key stops glowing and only the coach says which finger to use,
 * so kids learn where each finger goes by feel.
 */
export class FingerFitnessScene extends GameBase {
  private idx = 0;
  private missesHere = 0;
  private waiting = false;
  private coach!: Phaser.GameObjects.Image;
  private coachName!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private promptSub!: Phaser.GameObjects.Text;

  constructor() {
    super('FingerFitness');
  }

  protected instructions(): string {
    return 'The Finger Friends will call out a key.\nPress it with the right finger!';
  }

  protected buildWorld(): void {
    this.idx = 0;
    this.missesHere = 0;
    this.waiting = false;
    sky(this, 0xffb3d1, 0xffe3b0);
    cloud(this, 1500, 200, 0.6);
    hills(this, 420, [0xa6e86b, 0x7ed957, 0x5cbf3f]);
    bunting(this, 140);
    // A stage mat for the coach
    const mat = bake(this, 'ff-mat', 520, 120, (g) => {
      g.fillStyle(0x3a86ff, 1);
      g.fillEllipse(260, 64, 500, 100);
      g.fillStyle(0x7fb2ff, 1);
      g.fillEllipse(260, 56, 500, 96);
    });
    this.add.image(380, 590, mat);
    this.coach = fingerFriendImage(this, 380, 420, 'index', 130, { headband: true });
    this.coachName = this.add
      .text(380, 615, 'Izzy', { fontFamily: FONT_TITLE, fontSize: '54px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 10 })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.coach, y: 400, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const bubble = bake(this, 'ff-bubble', 900, 330, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(40, 10, 860, 300, 60);
      g.fillTriangle(60, 150, 60, 230, 0, 230);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(46, 4, 848, 290, 56);
      g.fillTriangle(66, 160, 66, 222, 10, 224);
    });
    this.add.image(1150, 410, bubble);
    this.prompt = this.add
      .text(1180, 370, 'Ready?', { fontFamily: FONT_TITLE, fontSize: '120px', color: '#ff5fa2', stroke: INK_CSS, strokeThickness: 12 })
      .setOrigin(0.5);
    this.promptSub = this.add
      .text(1180, 485, '', { fontFamily: FONT_BODY, fontSize: '34px', color: INK_CSS, fontStyle: 'bold', align: 'center', wordWrap: { width: 760 } })
      .setOrigin(0.5);
  }

  protected begin(): void {
    this.setProgress(0, this.items.length);
    this.showPrompt();
  }

  protected nextExpected(): string | null {
    return this.playing ? (this.items[this.idx] ?? null) : null;
  }

  private fingerFor(ch: string): Finger {
    return KEY_BY_CODE.get(strokeForChar(ch)!.code)!.finger;
  }

  private showPrompt(): void {
    const ch = this.items[this.idx];
    const finger = this.fingerFor(ch);
    const friend = FINGER_FRIENDS[finger];
    this.missesHere = 0;
    this.waiting = false;
    this.coach.setTexture(fingerFriendKey(this, finger, 130, { headband: true }));
    this.coachName.setText(friend);
    this.tweens.add({ targets: this.coach, scale: { from: 0.7, to: 1 }, duration: 260, ease: 'Back.easeOut' });
    const label = ch === ' ' ? 'SPACE' : /[a-z]/.test(ch) ? ch.toUpperCase() : /[A-Z]/.test(ch) ? `big ${ch}` : ch;
    const tip = howToType(ch);
    this.prompt.setText(`Press ${label}!`).setScale(0.6);
    this.tweens.add({ targets: this.prompt, scale: 1, duration: 260, ease: 'Back.easeOut' });

    // Hints fade in the second half (except for the youngest players).
    const lateHalf = this.idx >= Math.floor(this.items.length / 2) && this.profile.ageBand !== '5-6';
    if (lateHalf) {
      this.kb.setTargets([]);
      this.promptSub.setText(`${tip} No peeking!`);
    } else {
      this.guide(ch);
      this.promptSub.setText(tip);
    }
    narrator.say(`${friend} says: press ${narrator.nameOf(ch)}!`);
    this.updateDebug({ hinted: !lateHalf });
  }

  protected onChar(e: KeyInputEvent): void {
    if (this.waiting) return;
    const expected = this.items[this.idx];
    const typed = this.typedChar(e);
    if (typed === expected) {
      this.hit(expected, e);
      this.waiting = true;
      this.idx++;
      this.setProgress(this.idx, this.items.length);
      this.cheer();
      if (this.idx >= this.items.length) {
        this.prompt.setText('All done!');
        this.promptSub.setText('Your fingers are super strong!');
        void this.finish(900);
      } else {
        this.time.delayedCall(420, () => this.showPrompt());
      }
    } else {
      this.miss(expected, e);
      this.missesHere++;
      this.tweens.add({ targets: this.coach, angle: { from: -10, to: 10 }, duration: 80, yoyo: true, repeat: 2, onComplete: () => this.coach.setAngle(0) });
      if (this.missesHere === 2) this.guide(expected); // bring back the full hint
    }
  }

  private cheer(): void {
    const word = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    const t = this.add
      .text(380, 230, word, { fontFamily: FONT_TITLE, fontSize: '64px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 10 })
      .setOrigin(0.5);
    this.tweens.add({ targets: t, y: 150, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    this.tweens.add({ targets: this.coach, scaleY: 0.85, scaleX: 1.12, duration: 90, yoyo: true });
    this.prompt.setColor('#1f9e4a');
    this.time.delayedCall(400, () => this.prompt.setColor('#ff5fa2'));
  }
}
