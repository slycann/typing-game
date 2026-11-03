import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK_CSS, PALETTE, darken } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { debug } from '../debug';
import { KB_TOP, KB_W } from '../games/GameBase';
import { cleanInitials, insertEntry, isAllowedInitials } from '../engine/Leaderboard';
import { keyboard } from '../input/KeyboardInput';
import { currentProfile, store } from '../state';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { confetti, enterScene, goTo, onKeys } from './common';
import type { RaceOutcome } from './SpeedRaceScene';

/** Arcade-style: a high score! Type up to three letters for the leaderboard. */
export class InitialsScene extends Phaser.Scene {
  private letters = '';
  private slots: Phaser.GameObjects.Text[] = [];
  private outcome!: RaceOutcome;
  private message!: Phaser.GameObjects.Text;
  private kb!: OnScreenKeyboard;
  private saving = false;

  constructor() {
    super('Initials');
  }

  create(data: RaceOutcome): void {
    enterScene(this);
    this.outcome = data;
    this.letters = '';
    this.saving = false;
    this.cameras.main.setBackgroundColor('#2d2a6e');
    const stripes = bake(this, 'initials-bg', GAME_W, 1080, (g) => {
      const colors = [0x3b3690, 0x2d2a6e];
      for (let i = 0; i < 24; i++) {
        g.fillStyle(colors[i % 2], 1);
        g.fillTriangle(GAME_W / 2, 380, (i / 24) * GAME_W * 3 - GAME_W, -400, ((i + 1) / 24) * GAME_W * 3 - GAME_W, -400);
      }
    });
    const bg = this.add.image(GAME_W / 2, 380, stripes).setOrigin(0.5, 380 / 1080);
    this.tweens.add({ targets: bg, angle: 360, duration: 60000, repeat: -1 });
    const title = this.add.text(GAME_W / 2, 110, 'HIGH SCORE!', { fontFamily: FONT_TITLE, fontSize: '120px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 16 }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
    this.add.text(GAME_W / 2, 220, `${data.score.toFixed(1)} points  ·  ${data.wpm.toFixed(1)} words a minute`, { fontFamily: FONT_BODY, fontSize: '44px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.message = this.add.text(GAME_W / 2, 300, 'Type your initials (up to 3 letters), then press return', { fontFamily: FONT_BODY, fontSize: '36px', color: '#ffd6ef', fontStyle: 'bold' }).setOrigin(0.5);

    const slot = bake(this, 'initial-slot', 150, 170, (g) => {
      g.fillStyle(darken(PALETTE.purple, 0.35), 1);
      g.fillRoundedRect(0, 12, 150, 158, 30);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 150, 158, 30);
    });
    this.slots = [0, 1, 2].map((i) => {
      const x = GAME_W / 2 + (i - 1) * 190;
      this.add.image(x, 460, slot);
      return this.add.text(x, 455, '', { fontFamily: FONT_TITLE, fontSize: '110px', color: INK_CSS }).setOrigin(0.5);
    });
    this.kb = new OnScreenKeyboard(this, (GAME_W - KB_W) / 2, KB_TOP, { width: KB_W }).attach(keyboard);
    debug.keyboard = this.kb;
    confetti(this, GAME_W / 2, 200, 80);
    sfx.cheer();
    narrator.say('High score! Type your initials, then press return.');
    this.refresh();

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat || this.saving) return;
      if (e.code === 'Backspace') this.letters = this.letters.slice(0, -1);
      else if (e.code === 'Enter') return void this.save();
      else if (e.code === 'Escape') return goTo(this, 'Leaderboard', { board: this.outcome.board });
      else if (e.char && /^[a-z]$/i.test(e.char) && this.letters.length < 3) {
        this.letters += e.char.toUpperCase();
        sfx.good(this.letters.length * 2);
        this.kb.sparkle(e.code);
        narrator.say(narrator.nameOf(e.char.toLowerCase()));
      }
      this.refresh();
    });
  }

  private refresh(): void {
    this.slots.forEach((t, i) => {
      t.setText(this.letters[i] ?? '');
      if (i === this.letters.length - 1) this.tweens.add({ targets: t, scale: { from: 1.5, to: 1 }, duration: 200, ease: 'Back.easeOut' });
    });
    this.kb.setTargets(this.letters.length ? ['Enter'] : []);
    debug.info = { initials: this.letters };
  }

  private async save(): Promise<void> {
    const initials = cleanInitials(this.letters);
    if (!isAllowedInitials(initials)) {
      sfx.oops();
      this.letters = '';
      this.message.setText(initials ? "Let's pick different letters!" : 'Type at least one letter first!').setColor('#ffd23f');
      narrator.say(initials ? "Let's pick different letters!" : 'Type at least one letter first!');
      return this.refresh();
    }
    this.saving = true;
    const p = currentProfile();
    const at = Date.now();
    const board = (store.data.leaderboards[this.outcome.board] ??= []);
    insertEntry(board, { initials, score: this.outcome.score, wpm: this.outcome.wpm, accuracy: this.outcome.accuracy, profileId: p?.id, at });
    await store.commit();
    sfx.select();
    goTo(this, 'Leaderboard', { board: this.outcome.board, highlight: at });
  }
}
