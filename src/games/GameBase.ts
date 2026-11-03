import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Letterling } from '../art/Letterling';
import { FINGER_FRIENDS, INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { GAME_NAMES, levelById, levelContent, type LevelDef } from '../curriculum/worlds';
import { debug } from '../debug';
import { applyResult, coinsFor, type LevelResult } from '../engine/Progress';
import { Rng } from '../engine/Rng';
import { starsForAccuracy, type CharStat } from '../engine/TypingSession';
import { keyboard, type KeyInputEvent } from '../input/KeyboardInput';
import { KEY_BY_CODE, strokeForChar, type Finger } from '../input/keyLayout';
import type { Profile } from '../save/types';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { enterScene, goTo, onKeys } from '../scenes/common';

export const KB_W = 1100;
export const KB_TOP = GAME_H - OnScreenKeyboard.heightFor(KB_W) - 28;
/** Bottom of the play area, just above the keyboard. */
export const PLAY_BOTTOM = KB_TOP - 30;

export const FINGER_WORDS: Record<Finger, string> = { pinky: 'pinky', ring: 'ring', middle: 'middle', index: 'pointer', thumb: 'thumb' };

export interface ResultsData extends LevelResult {
  accuracy: number;
  newBest: boolean;
  newStickers: string[];
  firstClear: boolean;
}

/**
 * Everything the mini-games share: the level intro card, the on-screen keyboard,
 * score keeping, pausing, and handing the result to the Results screen.
 */
export abstract class GameBase extends Phaser.Scene {
  protected profile!: Profile;
  protected level!: LevelDef;
  protected rng!: Rng;
  protected items: string[] = [];
  protected kb!: OnScreenKeyboard;
  protected playing = false;
  protected correct = 0;
  protected keystrokes = 0;
  /** Items that got away (bubbles that floated off, raindrops that landed). */
  protected escapedCount = 0;
  protected streak = 0;
  protected bestStreak = 0;
  private perChar = new Map<string, CharStat>();
  private lastHit = 0;
  private startedAt = 0;
  private finished = false;
  private missesInARow = 0;
  private introCard: Phaser.GameObjects.Container | null = null;
  private progressFill!: Phaser.GameObjects.Graphics;

  /** Spoken + shown on the intro card. */
  protected abstract instructions(): string;
  /** Draw the game's world (called before the keyboard is added). */
  protected abstract buildWorld(): void;
  /** Start play after the intro card. */
  protected abstract begin(): void;
  /** A printable key was pressed during play. */
  protected abstract onChar(e: KeyInputEvent): void;

  init(data: { levelId: string }): void {
    this.level = levelById(data.levelId);
    this.profile = currentProfile()!;
    this.rng = new Rng();
    this.playing = false;
    this.finished = false;
    this.correct = 0;
    this.keystrokes = 0;
    this.escapedCount = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.missesInARow = 0;
    this.perChar = new Map();
    this.introCard = null;
  }

  create(): void {
    enterScene(this);
    if (!this.profile) {
      this.scene.start('ProfileSelect');
      return;
    }
    this.items = levelContent(this.level, this.profile.ageBand, this.rng);
    this.buildWorld();
    this.kb = new OnScreenKeyboard(this, (GAME_W - KB_W) / 2, KB_TOP, { width: KB_W }).attach(keyboard).setDepth(500);
    debug.keyboard = this.kb;
    this.buildTopBar();
    this.showIntro();
    onKeys(this, (e) => this.routeKey(e));
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.guide(this.nextExpected()));
  }

  private routeKey(e: KeyInputEvent): void {
    if (e.type !== 'down' || e.repeat || this.finished) return;
    if (this.scene.isPaused()) return;
    if (e.code === 'Escape') return this.pause();
    if (!this.playing) {
      if (e.code === 'Space' || e.code === 'Enter') this.startPlay();
      return;
    }
    if (e.char !== null) {
      this.onChar(e);
      this.updateDebug();
    }
  }

  // ---- scoring helpers for subclasses ------------------------------------------------------

  /** The right key for `expected`. */
  protected hit(expected: string, e: KeyInputEvent): void {
    this.keystrokes++;
    this.correct++;
    this.streak++;
    this.missesInARow = 0;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    const s = this.stat(expected);
    s.hits++;
    s.totalMs += Math.min(10000, e.time - this.lastHit);
    this.lastHit = e.time;
    sfx.good(this.streak);
    this.kb.sparkle(e.code);
  }

  /** A wrong key while `expected` was wanted (null when anything on screen would have done). */
  protected miss(expected: string | null, e: KeyInputEvent): void {
    this.keystrokes++;
    this.streak = 0;
    this.missesInARow++;
    if (expected) this.stat(expected).misses++;
    sfx.oops();
    this.kb.wobble(e.code);
    if (expected && this.missesInARow === 2) this.fingerHint(expected);
  }

  /** Something got away without being typed. */
  protected escaped(text: string): void {
    this.escapedCount++;
    this.streak = 0;
    if (text[0]) this.stat(text[0]).misses++;
  }

  private stat(ch: string): CharStat {
    let s = this.perChar.get(ch);
    if (!s) this.perChar.set(ch, (s = { hits: 0, misses: 0, totalMs: 0 }));
    return s;
  }

  /** Glow the next key. */
  protected guide(next: string | null): void {
    const stroke = next === null ? null : strokeForChar(next);
    this.kb.setTargets(stroke ? [stroke.code, ...(stroke.shiftCode ? [stroke.shiftCode] : [])] : []);
  }

  /** What the player should type next (for hints and tests). Subclasses override. */
  protected nextExpected(): string | null {
    return null;
  }

  protected say(text: string): void {
    narrator.say(text);
  }

  protected fingerHint(expected: string): void {
    const stroke = strokeForChar(expected);
    const key = stroke && KEY_BY_CODE.get(stroke.code);
    if (!key) return;
    const what = expected === ' ' ? 'the space bar' : expected.toUpperCase();
    this.say(`Try ${what}! Use ${FINGER_FRIENDS[key.finger]}, your ${FINGER_WORDS[key.finger]} finger.`);
  }

  protected setProgress(done: number, total: number): void {
    const f = Math.max(0, Math.min(1, done / Math.max(1, total)));
    this.progressFill.clear();
    if (f <= 0) return;
    this.progressFill.fillStyle(PALETTE.green, 1);
    this.progressFill.fillRoundedRect(GAME_W / 2 - 300 + 6, 50, Math.max(36, 588 * f), 36, 18);
  }

  /** Wrap up: score it, save it, and show the Results screen. */
  protected async finish(delay = 600): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    this.playing = false;
    this.guide(null);
    const accuracy = this.correct / Math.max(1, this.keystrokes + this.escapedCount);
    const stars = Math.max(1, starsForAccuracy(accuracy, this.profile.ageBand));
    const boss = this.level.game === 'boss';
    const result: LevelResult = {
      levelId: this.level.id,
      stars,
      coins: coinsFor(stars, boss),
      correct: this.correct,
      keystrokes: this.keystrokes,
      bestStreak: this.bestStreak,
      elapsedMs: performance.now() - this.startedAt,
      perChar: this.perChar,
      rescued: boss ? ['grumble'] : this.level.newKeys,
    };
    let outcome = { newBest: false, newStickers: [] as string[], firstClear: false };
    await store.updateProfile(this.profile.id, (p) => {
      outcome = applyResult(p, result);
    });
    debug.info = { ...debug.info, finished: true, stars, accuracy };
    const data: ResultsData = { ...result, perChar: new Map(), accuracy, ...outcome };
    this.time.delayedCall(delay, () => goTo(this, 'Results', data));
  }

  // ---- chrome: top bar, intro card, pause ----------------------------------------------

  private buildTopBar(): void {
    const label = `${this.level.name}  ${GAME_NAMES[this.level.game]}`;
    const pillW = 520;
    const pill = bake(this, `game-pill-${pillW}`, pillW, 104, (g) => {
      g.fillStyle(darken(PALETTE.purple, 0.35), 1);
      g.fillRoundedRect(0, 8, pillW, 96, 48);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, pillW, 96, 48);
    });
    this.add.image(24, 20, pill).setOrigin(0, 0).setDepth(600);
    this.add.text(24 + pillW / 2, 68, label, { fontFamily: FONT_TITLE, fontSize: '40px', color: INK_CSS }).setOrigin(0.5).setDepth(601);
    const bar = bake(this, 'game-progress-bg', 600, 56, (g) => {
      g.fillStyle(darken(PALETTE.purple, 0.35), 1);
      g.fillRoundedRect(0, 6, 600, 48, 24);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 600, 48, 24);
    });
    this.add.image(GAME_W / 2, 44, bar).setOrigin(0.5, 0).setDepth(600);
    this.progressFill = this.add.graphics().setDepth(601);
    new Button(this, GAME_W - 130, 68, 'Pause', () => this.pause(), { width: 210, height: 92, fontSize: 38, color: PALETTE.teal, keyHint: 'esc' }).setDepth(600);
  }

  private showIntro(): void {
    const dim = this.add.rectangle(0, 0, GAME_W, KB_TOP - 10, INK, 0.35).setOrigin(0, 0).setDepth(699);
    const c = this.add.container(GAME_W / 2, 395).setDepth(700);
    c.once(Phaser.GameObjects.Events.DESTROY, () => dim.destroy());
    const w = 1080;
    const h = this.level.newKeys.length ? 500 : 380;
    const panel = bake(this, `intro-panel-${h}`, w, h + 14, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 14, w, h, 50);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, w, h, 50);
      g.fillStyle(PALETTE.lilac, 1);
      g.fillRoundedRect(0, 0, w, 110, { tl: 50, tr: 50, bl: 0, br: 0 });
    });
    c.add(this.add.image(0, 0, panel).setOrigin(0.5, (h / 2) / (h + 14)));
    c.add(this.add.text(0, -h / 2 + 56, GAME_NAMES[this.level.game], { fontFamily: FONT_TITLE, fontSize: '62px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 10 }).setOrigin(0.5));
    c.add(
      this.add
        .text(0, -h / 2 + 175, this.instructions(), { fontFamily: FONT_BODY, fontSize: '40px', color: INK_CSS, fontStyle: 'bold', align: 'center', wordWrap: { width: w - 120 } })
        .setOrigin(0.5),
    );
    let spoken = `${GAME_NAMES[this.level.game]}! ${this.instructions()}`;
    if (this.level.newKeys.length) {
      const keys = this.level.newKeys;
      keys.forEach((k, i) => {
        const l = new Letterling(this, (i - (keys.length - 1) / 2) * 150 - 180, h / 2 - 105, k, 100);
        c.add(l);
        this.tweens.add({ targets: l, y: l.y - 18, duration: 420, yoyo: true, repeat: -1, delay: i * 200, ease: 'Sine.easeInOut' });
      });
      const finger = KEY_BY_CODE.get(strokeForChar(keys[0])!.code)!.finger;
      const line = `New keys! Use ${FINGER_FRIENDS[finger]},\nyour ${FINGER_WORDS[finger]} fingers.`;
      c.add(this.add.text(140, h / 2 - 150, line, { fontFamily: FONT_BODY, fontSize: '36px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
      const names = keys.map((k) => narrator.nameOf(k)).join(' and ');
      spoken += ` New keys: ${names}. Use ${FINGER_FRIENDS[finger]}, your ${FINGER_WORDS[finger]} fingers.`;
    }
    const go = this.add.text(0, h / 2 - 48, 'Press space to start!', { fontFamily: FONT_TITLE, fontSize: '50px', color: '#ff5fa2', stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5);
    c.add(go);
    this.tweens.add({ targets: go, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    c.setScale(0.6);
    this.tweens.add({ targets: c, scale: 1, duration: 350, ease: 'Back.easeOut' });
    this.introCard = c;
    this.kb.setTargets(['Space']);
    this.time.delayedCall(350, () => this.say(spoken + ' Press space to start!'));
    debug.info = { mode: 'intro', level: this.level.id };
  }

  private startPlay(): void {
    if (this.playing) return;
    sfx.select();
    narrator.stop();
    this.playing = true;
    this.startedAt = performance.now();
    this.lastHit = this.startedAt;
    const card = this.introCard;
    this.introCard = null;
    if (card) this.tweens.add({ targets: card, scale: 0.4, alpha: 0, duration: 220, onComplete: () => card.destroy() });
    this.begin();
    this.updateDebug();
  }

  private pause(): void {
    if (this.finished) return;
    sfx.select();
    narrator.stop();
    this.scene.launch('Pause', { from: this.scene.key });
    this.scene.pause();
  }

  protected updateDebug(extra: Record<string, unknown> = {}): void {
    debug.info = {
      ...debug.info,
      mode: this.playing ? 'play' : this.finished ? 'done' : 'intro',
      level: this.level.id,
      expected: this.nextExpected(),
      correct: this.correct,
      keystrokes: this.keystrokes,
      escaped: this.escapedCount,
      ...extra,
    };
  }
}
