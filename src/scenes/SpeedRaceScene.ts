import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake, gradient } from '../art/bake';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { cloud, hills } from '../art/scenery';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { speedPassage } from '../curriculum/speed';
import { debug } from '../debug';
import { KB_TOP, KB_W } from '../games/GameBase';
import { awardBadges } from '../engine/Achievements';
import { markDaily } from '../engine/Daily';
import { boardKey, qualifies, speedTier, TIER_NAMES } from '../engine/Leaderboard';
import { hintsFor, unlockedKeys } from '../engine/Mastery';
import { mergeKeyStats } from '../engine/Progress';
import { Rng } from '../engine/Rng';
import { TypingSession, wpmFor } from '../engine/TypingSession';
import { keyboard, type KeyInputEvent } from '../input/KeyboardInput';
import { strokeForChar } from '../input/keyLayout';
import type { Profile } from '../save/types';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { badgeBanners, banner } from '../ui/Toast';
import { confetti, enterScene, goTo, onKeys } from './common';

type Mode = 'choose' | 'countdown' | 'race' | 'done';

const TRACK_X0 = 200;
const TRACK_X1 = 1720;
const LANE_Y = [300, 430];
const LINE_Y = 570;
/** A comfortable goal pace for each age band (words per minute), used to size the track. */
const GOAL_WPM = { '5-6': 6, '7-8': 12, '9-10': 20 } as const;
/** Grandpa Qwerty's ghost pace for a first race, as a share of the goal. */
const QWERTY_PACE = 0.6;

export interface RaceOutcome {
  board: string;
  score: number; // net words per minute (speed × accuracy), one decimal
  wpm: number;
  accuracy: number;
}

/**
 * Rocket Race: a speed test with a brand-new passage every time. Your rocket flies as you type;
 * the ghost rocket is your own best (or Grandpa Qwerty's steady pace on your first race).
 */
export class SpeedRaceScene extends Phaser.Scene {
  private profile!: Profile;
  private kb!: OnScreenKeyboard;
  private mode: Mode = 'choose';
  private seconds = 30;
  private session!: TypingSession;
  private keys: string[] = [];
  private board = '';
  private startAt = 0;
  private trackChars = 100;
  private ghostWpm = 0;
  private rocket!: Phaser.GameObjects.Container;
  private ghost!: Phaser.GameObjects.Container;
  private ghostLabel!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private wpmText!: Phaser.GameObjects.Text;
  private doneText!: Phaser.GameObjects.Text;
  private curText!: Phaser.GameObjects.Text;
  private restText!: Phaser.GameObjects.Text;
  private curBox!: Phaser.GameObjects.Image;
  private chooser: Phaser.GameObjects.Container | null = null;
  private choice = 0;
  private outcome: RaceOutcome | null = null;

  constructor() {
    super('SpeedRace');
  }

  create(): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) return void this.scene.start('ProfileSelect');
    this.profile = p;
    this.mode = 'choose';
    this.outcome = null;
    this.keys = [...unlockedKeys(p), ' '];
    this.add.image(0, 0, gradient(this, 'race-sky', GAME_W, 1080, [[0, 0x2d2a6e], [0.55, 0x7b6cf6], [1, 0xffb3d1]])).setOrigin(0, 0);
    const stars = bake(this, 'race-stars', GAME_W, 560, (g) => {
      g.fillStyle(0xffffff, 0.8);
      for (let i = 0; i < 70; i++) g.fillCircle((i * 263) % GAME_W, (i * 137) % 520, 1 + (i % 3));
    });
    this.add.image(0, 0, stars).setOrigin(0, 0);
    cloud(this, 300, 520, 0.5, false).setAlpha(0.6);
    cloud(this, 1500, 500, 0.6, false).setAlpha(0.6);
    hills(this, 620, [0x9bdc6e, 0x7ed957, 0x5cbf3f]);
    this.drawTrack();

    this.kb = new OnScreenKeyboard(this, (GAME_W - KB_W) / 2, KB_TOP, { width: KB_W }).attach(keyboard);
    debug.keyboard = this.kb;
    for (const ch of this.keys) if (ch !== ' ') this.kb.setLabelVisible(strokeForChar(ch)!.code, hintsFor(p, ch).label);

    this.timerText = this.add.text(GAME_W - 60, 60, '', { fontFamily: FONT_TITLE, fontSize: '72px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 12 }).setOrigin(1, 0.5);
    this.wpmText = this.add.text(GAME_W - 60, 130, '', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(1, 0.5);
    this.add.text(60, 60, 'Rocket Race', { fontFamily: FONT_TITLE, fontSize: '64px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 11 }).setOrigin(0, 0.5);
    this.add.text(60, 125, `${TIER_NAMES[speedTier(this.keys)]} race`, { fontFamily: FONT_BODY, fontSize: '32px', color: '#ffd23f', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.makeLine();
    this.showChooser();

    onKeys(this, (e) => this.handleKey(e));
  }

  private drawTrack(): void {
    const track = bake(this, 'race-track', TRACK_X1 - TRACK_X0 + 120, 260, (g) => {
      for (const y of [60, 190]) {
        g.fillStyle(0xffffff, 0.12);
        g.fillRoundedRect(0, y - 46, TRACK_X1 - TRACK_X0 + 120, 92, 46);
      }
      g.fillStyle(0xffffff, 1);
      for (let y = 0; y < 260; y += 26) {
        g.fillRect(TRACK_X1 - TRACK_X0 + 60, y, 13, 13);
        g.fillRect(TRACK_X1 - TRACK_X0 + 73, y + 13, 13, 13);
      }
    });
    this.add.image(TRACK_X0 - 60, LANE_Y[0] - 60, track).setOrigin(0, 0);
    this.ghost = this.makeRocket(TRACK_X0, LANE_Y[0], 0x9b8cff, 0.55);
    this.rocket = this.makeRocket(TRACK_X0, LANE_Y[1], PALETTE.red, 1);
    const best = this.profile.bestSpeed[boardKey(speedTier(this.keys), 30)] ?? 0;
    const laneStyle = { fontFamily: FONT_BODY, fontSize: '28px', color: '#ffffff', fontStyle: 'bold' };
    this.ghostLabel = this.add.text(TRACK_X0 - 40, LANE_Y[0] - 70, best > 0 ? 'Your best' : 'Grandpa Qwerty', laneStyle).setAlpha(0.8);
    this.add.text(TRACK_X0 - 40, LANE_Y[1] - 70, 'You!', laneStyle);
  }

  private makeRocket(x: number, y: number, color: number, alpha: number): Phaser.GameObjects.Container {
    const key = bake(this, `rocket-${color.toString(16)}`, 200, 90, (g) => {
      g.fillStyle(PALETTE.orange, 1);
      g.fillTriangle(0, 45, 40, 28, 40, 62);
      g.fillStyle(PALETTE.yellow, 1);
      g.fillTriangle(14, 45, 40, 34, 40, 56);
      g.fillStyle(darken(color, 0.25), 1);
      g.fillTriangle(50, 18, 90, 26, 70, 2);
      g.fillTriangle(50, 72, 90, 64, 70, 88);
      g.fillStyle(0xeef3ff, 1);
      g.fillRoundedRect(40, 22, 120, 46, 23);
      g.fillStyle(color, 1);
      g.fillTriangle(150, 22, 150, 68, 198, 45);
      g.fillStyle(PALETTE.skyTop, 1);
      g.fillCircle(118, 45, 13);
      g.lineStyle(4, darken(color, 0.25), 1);
      g.strokeCircle(118, 45, 13);
    });
    const c = this.add.container(x, y, [this.add.image(0, 0, key)]).setAlpha(alpha);
    this.tweens.add({ targets: c, y: y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return c;
  }

  /** The text being typed: done letters slide off to the left, the current letter sits in a box. */
  private makeLine(): void {
    const plate = bake(this, 'race-line', 1500, 120, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 10, 1500, 110, 55);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 1500, 110, 55);
    });
    this.add.image(GAME_W / 2, LINE_Y, plate);
    this.curBox = this.add.image(GAME_W / 2, LINE_Y, bake(this, 'race-cur', 70, 90, (g) => {
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRoundedRect(0, 0, 70, 90, 18);
    }));
    const style = { fontFamily: FONT_BODY, fontSize: '64px', fontStyle: 'bold' };
    this.doneText = this.add.text(GAME_W / 2 - 35, LINE_Y, '', { ...style, color: '#1f9e4a' }).setOrigin(1, 0.5);
    this.curText = this.add.text(GAME_W / 2, LINE_Y, '', { ...style, color: INK_CSS }).setOrigin(0.5);
    this.restText = this.add.text(GAME_W / 2 + 35, LINE_Y, '', { ...style, color: INK_CSS }).setOrigin(0, 0.5);
  }

  private renderLine(): void {
    const t = this.session.target;
    const i = this.session.index;
    const show = (s: string) => s.replace(/ /g, '·');
    this.doneText.setText(show(t.slice(Math.max(0, i - 16), i)));
    this.curText.setText(i < t.length ? (t[i] === ' ' ? '␣' : t[i]) : '');
    this.restText.setText(show(t.slice(i + 1, i + 24)));
  }

  // ---- choose a length -------------------------------------------------------------------

  private showChooser(): void {
    this.choice = this.profile.ageBand === '9-10' ? 1 : 0;
    const c = this.add.container(GAME_W / 2, 400).setDepth(50);
    const key = bake(this, 'race-chooser', 1000, 300, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 14, 1000, 286, 50);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 1000, 286, 50);
    });
    c.add(this.add.image(0, 0, key));
    c.add(this.add.text(0, -90, 'How long is the race?', { fontFamily: FONT_TITLE, fontSize: '54px', color: INK_CSS }).setOrigin(0.5));
    const opts = [30, 60].map((sec, i) => {
      const b = new Button(this, (i - 0.5) * 380, 30, `${sec} seconds`, () => this.pick(i, true), { width: 340, height: 110, fontSize: 44, color: i ? PALETTE.purple : PALETTE.blue });
      c.add(b);
      return b;
    });
    c.add(this.add.text(0, 118, '← → then return', { fontFamily: FONT_BODY, fontSize: '30px', color: '#7a6a9a', fontStyle: 'bold' }).setOrigin(0.5));
    this.chooser = c;
    c.setData('opts', opts);
    this.pick(this.choice, false);
    narrator.say('Rocket Race! How long is the race? Thirty seconds, or sixty seconds?');
    this.kb.setTargets(['ArrowLeft', 'ArrowRight', 'Enter']);
    debug.info = { mode: 'choose' };
  }

  private pick(i: number, go: boolean): void {
    this.choice = i;
    const opts = this.chooser?.getData('opts') as Button[] | undefined;
    opts?.forEach((b, k) => b.setFocused(k === i));
    if (go) this.startCountdown();
  }

  // ---- race ------------------------------------------------------------------------------

  private startCountdown(): void {
    if (this.mode !== 'choose') return;
    sfx.select();
    this.mode = 'countdown';
    this.seconds = this.choice ? 60 : 30;
    this.chooser?.destroy();
    this.chooser = null;
    const rng = new Rng();
    // Long enough that even a very fast typist won't run out before the timer does.
    this.session = new TypingSession(speedPassage(this.keys, rng, this.seconds === 60 ? 120 : 60));
    this.board = boardKey(speedTier(this.keys), this.seconds);
    const goal = GOAL_WPM[this.profile.ageBand];
    const best = this.profile.bestSpeed[this.board] ?? 0;
    this.ghostWpm = best > 0 ? best : goal * QWERTY_PACE;
    this.ghostLabel.setText(best > 0 ? 'Your best' : 'Grandpa Qwerty');
    this.trackChars = (Math.max(goal, best) * 1.25 * 5 * this.seconds) / 60;
    this.timerText.setText(`${this.seconds}`);
    this.wpmText.setText(best > 0 ? `Your best: ${best.toFixed(1)} wpm` : "Beat Grandpa Qwerty's rocket!");
    this.renderLine();
    let n = 3;
    const big = this.add.text(GAME_W / 2, 330, '3', { fontFamily: FONT_TITLE, fontSize: '220px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 18 }).setOrigin(0.5).setDepth(60);
    narrator.say('Three');
    sfx.select();
    this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        n--;
        if (n > 0) {
          big.setText(String(n)).setScale(1.3);
          this.tweens.add({ targets: big, scale: 1, duration: 300 });
          narrator.say(n === 2 ? 'Two' : 'One');
          sfx.select();
        } else if (n === 0) {
          big.setText('GO!');
          sfx.cheer();
          this.go();
        } else {
          big.destroy();
        }
      },
    });
    debug.info = { mode: 'countdown' };
  }

  private go(): void {
    this.mode = 'race';
    this.startAt = performance.now();
    debug.info = { mode: 'race', board: this.board };
    this.showNext();
  }

  update(): void {
    if (this.mode !== 'race') return;
    const now = performance.now();
    const elapsed = (now - this.startAt) / 1000;
    const left = Math.max(0, this.seconds - elapsed);
    this.timerText.setText(`${Math.ceil(left)}`);
    this.timerText.setColor(left <= 5 ? '#ff5d5d' : '#ffd23f');
    const wpm = wpmFor(this.session.correct, now - this.startAt);
    this.wpmText.setText(`${wpm.toFixed(1)} words a minute`);
    const ghostChars = (this.ghostWpm * 5 * elapsed) / 60;
    this.ghost.x = this.trackX(ghostChars);
    this.rocket.x = Phaser.Math.Linear(this.rocket.x, this.trackX(this.session.correct), 0.25);
    if (left <= 0) this.finish();
  }

  private trackX(chars: number): number {
    return TRACK_X0 + Math.min(1, chars / this.trackChars) * (TRACK_X1 - TRACK_X0);
  }

  private handleKey(e: KeyInputEvent): void {
    if (e.type !== 'down' || e.repeat) return;
    if (e.code === 'Escape') return goTo(this, 'WorldMap');
    if (this.mode === 'choose') {
      if (e.code === 'ArrowLeft') this.pick(0, false);
      else if (e.code === 'ArrowRight') this.pick(1, false);
      else if (e.code === 'Enter' || e.code === 'Space') this.startCountdown();
      return;
    }
    if (this.mode === 'done') {
      if (e.code === 'Enter') this.next();
      else if (e.code === 'Space') goTo(this, 'SpeedRace');
      return;
    }
    if (this.mode !== 'race' || e.char === null) return;
    const out = this.session.input(e.capsLock ? e.char.toLowerCase() : e.char, e.time);
    if (out.result === 'correct') {
      this.kb.sparkle(e.code);
      sfx.key();
      if (this.session.done) return void this.finish();
    } else if (out.result === 'wrong') {
      sfx.oops();
      this.kb.wobble(e.code);
      this.tweens.add({ targets: this.curBox, angle: { from: -8, to: 8 }, duration: 50, yoyo: true, repeat: 1, onComplete: () => this.curBox.setAngle(0) });
    }
    this.showNext();
  }

  private showNext(): void {
    this.renderLine();
    const ch = this.session.expected;
    const stroke = ch ? strokeForChar(ch) : null;
    this.kb.setTargets(stroke && ch && hintsFor(this.profile, ch).glow ? [stroke.code] : []);
    debug.info = { ...debug.info, expected: ch, correct: this.session.correct };
  }

  private async finish(): Promise<void> {
    if (this.mode !== 'race') return;
    this.mode = 'done';
    this.kb.setTargets([]);
    const ms = Math.min(this.seconds * 1000, performance.now() - this.startAt);
    const wpm = wpmFor(this.session.correct, ms);
    const accuracy = this.session.accuracy();
    const score = Math.round(wpm * accuracy * 10) / 10;
    const best = this.profile.bestSpeed[this.board] ?? 0;
    const beatGhost = this.rocket.x >= this.ghost.x;
    const coins = 2 + Math.round(score / 2);
    let dailyDone = false;
    let badges: ReturnType<typeof awardBadges> = [];
    await store.updateProfile(this.profile.id, (p) => {
      p.bestSpeed[this.board] = Math.max(best, score);
      mergeKeyStats(p, this.session.perChar);
      p.coins += coins;
      p.xp += this.session.correct;
      p.playMs += ms;
      dailyDone = markDaily(p, 'race');
      badges = awardBadges(p);
    });
    this.outcome = { board: this.board, score, wpm, accuracy };
    const high = qualifies(store.data.leaderboards[this.board] ?? [], score);

    sfx.cheer();
    if (beatGhost) confetti(this, this.rocket.x, LANE_Y[1], 70);
    const c = this.add.container(GAME_W / 2, 330).setDepth(50);
    const key = bake(this, 'race-result', 1100, 330, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 14, 1100, 316, 50);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 1100, 316, 50);
    });
    c.add(this.add.image(0, 0, key));
    const title = score > best && best > 0 ? 'New personal best!' : beatGhost ? 'You beat the ghost rocket!' : 'Time!';
    c.add(this.add.text(0, -100, title, { fontFamily: FONT_TITLE, fontSize: '60px', color: '#ff5fa2' }).setOrigin(0.5));
    c.add(this.add.text(0, -10, `${wpm.toFixed(1)} words a minute  ·  ${Math.round(accuracy * 100)}% right`, { fontFamily: FONT_BODY, fontSize: '44px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
    c.add(this.add.text(0, 60, `Score ${score.toFixed(1)}   +${coins} coins`, { fontFamily: FONT_BODY, fontSize: '40px', color: '#7a5fc0', fontStyle: 'bold' }).setOrigin(0.5));
    const next = this.add.text(0, 122, high ? 'High score! Press return to sign the leaderboard!' : 'Press return for the leaderboard, space to race again', { fontFamily: FONT_BODY, fontSize: '32px', color: '#1f9e4a', fontStyle: 'bold' }).setOrigin(0.5);
    c.add(next);
    this.tweens.add({ targets: next, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    c.setScale(0.5);
    this.tweens.add({ targets: c, scale: 1, duration: 350, ease: 'Back.easeOut' });
    narrator.say(`${title} ${Math.round(wpm)} words a minute! ${high ? 'You got a high score! Press return to sign the leaderboard.' : 'Press return to see the leaderboard.'}`);
    this.kb.setTargets(['Enter']);
    if (dailyDone) banner(this, "Today's adventure done!", '+15 bonus coins!', 1500, false);
    badgeBanners(this, badges, dailyDone ? 5000 : 1500);
    debug.info = { mode: 'done', ...this.outcome, high };
  }

  private next(): void {
    if (!this.outcome) return;
    sfx.select();
    const high = qualifies(store.data.leaderboards[this.outcome.board] ?? [], this.outcome.score);
    goTo(this, high ? 'Initials' : 'Leaderboard', { ...this.outcome });
  }
}
