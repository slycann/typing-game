import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { Letterling } from '../art/Letterling';
import { FINGER_FRIENDS, INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { workshop } from '../art/scenery';
import { characterImage, critterImage } from '../art/textures';
import { drawStar } from '../ui/OnScreenKeyboard';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { KEY_STAGES, keysThrough, type KeyStage } from '../curriculum/keyStages';
import { letterDrill, wordDrill } from '../curriculum/drills';
import { debug } from '../debug';
import { Rng } from '../engine/Rng';
import { starsForAccuracy, TypingSession } from '../engine/TypingSession';
import { keyboard, type KeyInputEvent } from '../input/KeyboardInput';
import { KEY_BY_CODE, strokeForChar, type Finger } from '../input/keyLayout';
import type { Profile } from '../save/types';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { SpeechBubble } from '../ui/SpeechBubble';
import { TargetStrip } from '../ui/TargetStrip';
import { confetti, enterScene, goTo, onKeys } from './common';

type Mode = 'intro' | 'drill' | 'results';

const FINGER_WORDS: Record<Finger, string> = { pinky: 'pinky', ring: 'ring', middle: 'middle', index: 'pointer', thumb: 'thumb' };
const PRAISE = ['Super typing!', 'Wow, great job!', "You're a keyboard star!", 'Hooray! Well done!', 'Brilliant!'];
const GROUPS_BY_AGE = { '5-6': 3, '7-8': 4, '9-10': 5 } as const;
const WORLD1 = KEY_STAGES.filter((s) => s.world === 1);

/** Grandpa Qwerty's Key Workshop: home-row warm-ups that grow with the player. */
export class WorkshopScene extends Phaser.Scene {
  private profile!: Profile;
  private kb!: OnScreenKeyboard;
  private bubble!: SpeechBubble;
  private stageLabel!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private coinIcon!: Phaser.GameObjects.Graphics;
  private strip: TargetStrip | null = null;
  private results: Phaser.GameObjects.Container | null = null;
  private session: TypingSession | null = null;
  private stage: KeyStage = WORLD1[0];
  private mode: Mode = 'intro';
  private rng = new Rng();
  private streak = 0;
  private missesInARow = 0;
  private capsWarned = false;

  constructor() {
    super('Workshop');
  }

  create(): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) {
      this.scene.start('ProfileSelect');
      return;
    }
    this.profile = p;
    this.mode = 'intro';
    this.strip = null;
    this.results = null;
    this.session = null;
    this.streak = 0;
    this.missesInARow = 0;
    this.capsWarned = false;

    this.drawRoom();
    this.makeHud();
    const qwerty = characterImage(this, 'qwerty', 1730, 600, 0.78);
    this.tweens.add({ targets: qwerty, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1 });
    this.bubble = new SpeechBubble(this, 1090, 470, 760, 'right');
    this.stageLabel = this.add
      .text(GAME_W / 2, 84, '', { fontFamily: FONT_TITLE, fontSize: '54px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 10 })
      .setOrigin(0.5);

    const kbW = 1250;
    this.kb = new OnScreenKeyboard(this, (GAME_W - kbW) / 2, GAME_H - OnScreenKeyboard.heightFor(kbW) - 36, { width: kbW }).attach(keyboard);
    debug.keyboard = this.kb;

    const name = this.profile.name;
    if (!this.profile.seen.includes('workshop')) {
      void store.updateProfile(this.profile.id, (p) => p.seen.push('workshop'));
      this.bubble.say(`Hello ${name}! I'm Grandpa Qwerty.\nRest your fingers on the home row.\nFeel the bumps on F and J?\nPress space with your thumb to start!`);
    } else {
      this.bubble.say(`Welcome back, ${name}!\nPress space to start!`);
    }
    this.stageLabel.setText('Key Workshop');
    this.kb.setTargets(['Space']);
    this.updateDebug();

    onKeys(this, (e) => this.handleKey(e));
  }

  private handleKey(e: KeyInputEvent): void {
    if (e.type !== 'down' || e.repeat) return;
    if (e.code === 'Escape') return goTo(this, 'WorldMap', { focus: 0 });
    if (this.mode !== 'drill') {
      if (e.code === 'Space' || e.code === 'Enter') return this.startDrill();
      if (e.char?.trim()) {
        sfx.key();
        this.kb.sparkle(e.code);
      }
      return;
    }
    if (e.char === null || !this.session) return;

    const isLetter = /^[a-z]$/i.test(e.char);
    if (e.capsLock && isLetter) {
      this.session.setIgnoreCase(true);
      if (!this.capsWarned) {
        this.capsWarned = true;
        this.bubble.say('Caps Lock is on!\nPress the caps lock key to turn it off.');
        this.kb.setTargets([...this.kb.getTargets(), 'CapsLock']);
      }
    } else {
      this.session.setIgnoreCase(false);
    }

    const out = this.session.input(e.char, e.time);
    if (out.result === 'correct') {
      this.streak++;
      this.missesInARow = 0;
      sfx.good(this.streak);
      this.kb.sparkle(e.code);
      this.strip?.setIndex(this.session.index);
      this.strip?.popDone(out.index);
      if (out.expected !== ' ') this.flyLetterling(e.code, out.expected!);
      if (out.done) {
        void this.finishDrill();
        return;
      }
    } else if (out.result === 'wrong') {
      this.streak = 0;
      this.missesInARow++;
      sfx.oops();
      this.kb.wobble(e.code);
      this.strip?.shake(out.index);
      if (this.missesInARow === 2) this.fingerHint(out.expected!);
    }
    this.showNext();
  }

  private pickStage(): KeyStage {
    // The first warm-up without 2+ stars; once all are done, any of them.
    const next = WORLD1.find((s) => (this.profile.stars[`warmup-${s.id}`] ?? 0) < 2);
    return next ?? this.rng.pick(WORLD1);
  }

  private startDrill(): void {
    sfx.select();
    this.results?.destroy();
    this.results = null;
    this.stage = this.pickStage();
    const keys = keysThrough(this.stage.id);
    const groups = GROUPS_BY_AGE[this.profile.ageBand];
    const allDone = WORLD1.every((s) => (this.profile.stars[`warmup-${s.id}`] ?? 0) >= 2);
    const words = allDone && this.profile.drillsDone % 2 === 1 ? wordDrill(keys, this.rng, groups - 1) : null;
    const text = words ?? letterDrill(keys, this.stage.keys, this.rng, groups);

    this.session = new TypingSession(text);
    this.strip?.destroy();
    this.strip = new TargetStrip(this, GAME_W / 2, 250, text, 1240);
    this.strip.setScale(0.4);
    this.tweens.add({ targets: this.strip, scale: 1, duration: 350, ease: 'Back.easeOut' });
    this.stageLabel.setText(words ? 'Word Warm-up' : `Warm-up: ${this.stage.name}`);
    this.mode = 'drill';
    this.streak = 0;
    this.missesInARow = 0;
    const intro = words ? "Let's type some real words!" : `Let's practise ${this.stage.name}!`;
    this.bubble.say(intro);
    this.showNext();
  }

  /** Glow the next key and send the right Finger Friend to it. */
  private showNext(): void {
    const ch = this.session?.expected ?? null;
    const stroke = ch === null ? null : strokeForChar(ch);
    const targets = stroke ? [stroke.code, ...(stroke.shiftCode ? [stroke.shiftCode] : [])] : [];
    if (this.capsWarned && keyboard.isDown('CapsLock')) targets.push('CapsLock');
    this.kb.setTargets(targets);
    this.updateDebug();
  }

  private fingerHint(expected: string): void {
    const stroke = strokeForChar(expected);
    const key = stroke && KEY_BY_CODE.get(stroke.code);
    if (!key) return;
    const friend = FINGER_FRIENDS[key.finger];
    const what = expected === ' ' ? 'the space bar' : `the glowing ${expected.toUpperCase()} key`;
    this.bubble.say(`Try ${what}!\nUse ${friend}, your ${FINGER_WORDS[key.finger]} finger.`);
  }

  private flyLetterling(code: string, ch: string): void {
    const from = this.kb.keyWorld(code);
    if (!from) return;
    const l = new Letterling(this, from.x, from.y, ch, 70).setScale(0.4).setDepth(50);
    this.tweens.add({ targets: l, scale: 0.9, y: from.y - 190, duration: 340, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: l, alpha: 0, angle: Phaser.Math.Between(-40, 40), delay: 380, duration: 360, onComplete: () => l.destroy() });
  }

  private async finishDrill(): Promise<void> {
    const s = this.session!;
    this.mode = 'results';
    this.kb.setTargets([]);
    const accuracy = s.accuracy();
    const stars = Math.max(1, starsForAccuracy(accuracy, this.profile.ageBand));
    const coins = stars * 2 + 1;
    const levelId = `warmup-${this.stage.id}`;
    await store.updateProfile(this.profile.id, (p) => {
      p.coins += coins;
      p.xp += s.correct;
      p.drillsDone++;
      p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars);
      p.playMs += s.elapsedMs(performance.now());
      for (const [ch, st] of s.perChar) {
        const k = (p.keyStats[ch] ??= { hits: 0, misses: 0, totalMs: 0 });
        k.hits += st.hits;
        k.misses += st.misses;
        k.totalMs += st.totalMs;
      }
    });

    sfx.cheer();
    confetti(this, GAME_W / 2, 250, 70);
    this.time.delayedCall(250, () => {
      this.strip?.destroy();
      this.strip = null;
      this.showResults(stars, s.correct, s.keystrokes, coins);
    });
    this.updateDebug({ lastStars: stars, lastAccuracy: accuracy });
  }

  private showResults(stars: number, right: number, tries: number, coins: number): void {
    const panel = this.add.container(GAME_W / 2, 255);
    const g = this.add.graphics();
    g.fillStyle(darken(PALETTE.purple, 0.35), 1);
    g.fillRoundedRect(-430, -150 + 12, 860, 300, 50);
    g.fillStyle(PALETTE.lilac, 1);
    g.fillRoundedRect(-430, -150, 860, 300, 50);
    panel.add(g);
    for (let i = 0; i < 3; i++) {
      const star = this.add.graphics({ x: -180 + i * 180, y: -40 });
      star.fillStyle(INK, 0.25);
      drawStar(star, 0, 6, 5, 78, 36);
      star.fillStyle(i < stars ? PALETTE.yellow : 0xffffff, i < stars ? 1 : 0.6);
      drawStar(star, 0, 0, 5, 74, 34);
      star.setScale(0);
      panel.add(star);
      this.tweens.add({ targets: star, scale: 1, angle: 360, delay: 200 + i * 260, duration: 420, ease: 'Back.easeOut', onStart: () => i < stars && sfx.good(i * 2) });
    }
    const mistakes = tries - right;
    const line = mistakes === 0 ? `Every key right! +${coins} coins` : `${right} keys right! +${coins} coins`;
    panel.add(this.add.text(0, 90, line, { fontFamily: FONT_BODY, fontSize: '46px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
    panel.setScale(0.5);
    this.tweens.add({ targets: panel, scale: 1, duration: 350, ease: 'Back.easeOut' });
    this.results = panel;
    this.flyCoins(coins);

    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    this.bubble.say(`${praise}\nPress space for more!`, { spoken: `${praise} You got ${stars} star${stars === 1 ? '' : 's'}! Press space for more!` });
    this.stageLabel.setText('');
    this.kb.setTargets(['Space']);
  }

  private flyCoins(n: number): void {
    const target = { x: this.coinIcon.x, y: this.coinIcon.y };
    let shown = this.profile.coins - n;
    for (let i = 0; i < n; i++) {
      const c = this.add.circle(GAME_W / 2 + Phaser.Math.Between(-200, 200), 300, 20, PALETTE.yellow).setStrokeStyle(5, 0xd9a400).setDepth(100);
      this.tweens.add({
        targets: c,
        x: target.x,
        y: target.y,
        delay: 700 + i * 90,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          c.destroy();
          shown++;
          this.coinText.setText(String(shown));
          sfx.coin();
          this.tweens.add({ targets: this.coinIcon, scale: { from: 1.4, to: 1 }, duration: 160 });
        },
      });
    }
  }

  private drawRoom(): void {
    workshop(this, 560);
    // round window onto the meadow
    const w = this.add.graphics({ x: 170, y: 420 });
    w.fillStyle(0xa96e43, 1);
    w.fillCircle(0, 0, 112);
    w.fillStyle(PALETTE.skyTop, 1);
    w.fillCircle(0, 0, 96);
    w.fillStyle(PALETTE.grass, 1);
    w.fillEllipse(0, 78, 220, 120);
    w.fillStyle(PALETTE.sun, 1);
    w.fillCircle(40, -38, 22);
    w.lineStyle(9, 0xa96e43, 1);
    w.lineBetween(-96, 0, 96, 0);
    w.lineBetween(0, -96, 0, 96);
  }

  private makeHud(): void {
    const g = this.add.graphics();
    g.fillStyle(darken(PALETTE.blue, 0.35), 1);
    g.fillRoundedRect(24, 32, 470, 120, 60);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(24, 24, 470, 120, 60);
    g.fillStyle(PALETTE.lilac, 1);
    g.fillCircle(84, 84, 52);
    critterImage(this, 84, 140, this.profile.animal, this.profile.outfit, 0.33);
    this.add.text(150, 84, this.profile.name, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0, 0.5);
    this.coinIcon = this.add.graphics({ x: 400, y: 84 });
    this.coinIcon.fillStyle(0xd9a400, 1);
    this.coinIcon.fillCircle(0, 3, 26);
    this.coinIcon.fillStyle(PALETTE.yellow, 1);
    this.coinIcon.fillCircle(0, 0, 26);
    this.coinIcon.fillStyle(0xffffff, 0.6);
    this.coinIcon.fillCircle(-8, -8, 7);
    this.coinText = this.add.text(434, 84, String(this.profile.coins), { fontFamily: FONT_BODY, fontSize: '42px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5);
    new Button(this, 1800, 84, 'Map', () => goTo(this, 'WorldMap', { focus: 0 }), { width: 200, height: 96, fontSize: 40, color: PALETTE.teal });
  }

  private updateDebug(extra: Record<string, unknown> = {}): void {
    debug.info = {
      ...debug.info,
      mode: this.mode,
      target: this.session?.target ?? null,
      index: this.session?.index ?? 0,
      expected: this.session?.expected ?? null,
      coins: this.profile.coins,
      ...extra,
    };
  }
}
