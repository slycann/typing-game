import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Letterling } from '../art/Letterling';
import { INK_CSS, PALETTE, darken } from '../art/palette';
import { cloud, hills, sky, sun } from '../art/scenery';
import { Avatar } from '../art/Avatar';
import { FONT_BODY, GAME_W } from '../config';
import type { KeyInputEvent } from '../input/KeyboardInput';
import { confetti } from '../scenes/common';
import { GameBase } from './GameBase';

const GAP = 230; // distance between lily pads
const PAD_Y = 520;
const START_X = 260; // the critter's spot on the near bank (track coordinates)
const VIEW_X = 560; // where we keep the critter on screen
const POND_TOP = 400;
const POND_BOTTOM = 630;

/** Key Hop: type the letter on the next lily pad to hop across the pond. No timer, no falling in. */
export class KeyHopScene extends GameBase {
  private idx = 0;
  private track!: Phaser.GameObjects.Container;
  private pads: Phaser.GameObjects.Container[] = [];
  private critter!: Avatar;
  private friends: Letterling[] = [];

  constructor() {
    super('KeyHop');
  }

  protected instructions(): string {
    return 'Type the letter on the next lily pad\nto hop across the pond!';
  }

  protected buildWorld(): void {
    this.idx = 0;
    this.pads = [];
    this.friends = [];
    sky(this);
    sun(this, 1700, 220, 60);
    cloud(this, 400, 230, 0.6);
    cloud(this, 1150, 200, 0.5);
    hills(this, 260);
    const pond = bake(this, 'hop-pond', GAME_W, POND_BOTTOM - POND_TOP + 40, (g) => {
      const h = POND_BOTTOM - POND_TOP;
      g.fillStyle(0x2f9be0, 1);
      g.fillRoundedRect(-40, 10, GAME_W + 80, h + 20, 60);
      g.fillStyle(0x4fc3ff, 1);
      g.fillRoundedRect(-40, 0, GAME_W + 80, h, 60);
      g.fillStyle(0x8fdcff, 1);
      for (let i = 0; i < 26; i++) g.fillRoundedRect((i * 173) % GAME_W, 30 + ((i * 61) % (h - 60)), 60 + (i % 3) * 30, 8, 4);
    });
    this.add.image(0, POND_TOP, pond).setOrigin(0, 0);
    // Cattails along the back edge
    const reeds = bake(this, 'hop-reeds', GAME_W, 120, (g) => {
      for (let x = 30; x < GAME_W; x += 140) {
        g.lineStyle(6, 0x3c9a3c, 1);
        g.lineBetween(x, 120, x - 6, 30);
        g.lineBetween(x + 20, 120, x + 26, 50);
        g.fillStyle(0x8a5a3c, 1);
        g.fillRoundedRect(x - 14, 20, 16, 44, 8);
      }
    });
    this.add.image(0, POND_TOP - 100, reeds).setOrigin(0, 0);

    this.track = this.add.container(VIEW_X - START_X, 0);
    // Near bank and far bank
    const bank = bake(this, 'hop-bank', 360, 200, (g) => {
      g.fillStyle(PALETTE.grassDark, 1);
      g.fillEllipse(180, 110, 360, 190);
      g.fillStyle(PALETTE.grass, 1);
      g.fillEllipse(180, 96, 340, 170);
    });
    this.track.add(this.add.image(START_X - 60, PAD_Y + 10, bank));
    const endX = this.padX(this.items.length);
    this.track.add(this.add.image(endX + 60, PAD_Y + 10, bank));
    const flag = bake(this, 'hop-flag', 120, 200, (g) => {
      g.fillStyle(0x8a5a3c, 1);
      g.fillRect(10, 0, 10, 200);
      g.fillStyle(PALETTE.hotPink, 1);
      g.fillTriangle(20, 6, 120, 40, 20, 74);
    });
    this.track.add(this.add.image(endX + 150, PAD_Y - 80, flag));
    // Friends waiting on the far bank
    const waiting = this.level.newKeys.length ? this.level.newKeys : [...new Set(this.items.filter((c) => c !== ' '))].slice(0, 2);
    waiting.forEach((k, i) => {
      const l = new Letterling(this, endX + 40 + i * 100, PAD_Y + 20, k, 90);
      this.track.add(l);
      this.friends.push(l);
      this.tweens.add({ targets: l, angle: { from: -6, to: 6 }, duration: 400, yoyo: true, repeat: -1, delay: i * 150 });
    });

    this.items.forEach((ch, i) => this.track.add(this.makePad(ch, this.padX(i), i)));
    this.critter = new Avatar(this, START_X, PAD_Y + 4, this.profile, 0.62, false);
    this.track.add(this.critter);
  }

  private padX(i: number): number {
    return START_X + (i + 1) * GAP;
  }

  private makePad(ch: string, x: number, i: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, PAD_Y);
    if (ch === ' ') {
      const log = bake(this, 'hop-log', 210, 84, (g) => {
        g.fillStyle(0x8a5a3c, 1);
        g.fillRoundedRect(0, 12, 210, 70, 34);
        g.fillStyle(0xb57a4c, 1);
        g.fillRoundedRect(0, 4, 210, 66, 33);
        g.fillStyle(0xd9a46e, 1);
        g.fillEllipse(180, 37, 40, 56);
        g.lineStyle(4, 0x8a5a3c, 1);
        g.strokeEllipse(180, 37, 22, 32);
      });
      c.add(this.add.image(0, 0, log));
      c.add(this.add.text(-14, -2, 'space', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    } else {
      const pad = bake(this, 'hop-pad', 190, 104, (g) => {
        g.fillStyle(darken(0x5cbf3f, 0.25), 1);
        g.fillEllipse(95, 58, 186, 92);
        g.fillStyle(0x5cbf3f, 1);
        g.fillEllipse(95, 50, 186, 90);
        g.fillStyle(0x4fc3ff, 1);
        g.fillTriangle(95, 50, 150, 8, 176, 26);
        g.fillStyle(0x86dd5c, 1);
        g.fillEllipse(80, 46, 110, 48);
      });
      c.add(this.add.image(0, 0, pad));
      c.add(this.add.text(-6, -4, ch, { fontFamily: FONT_BODY, fontSize: '72px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
    }
    this.tweens.add({ targets: c, y: PAD_Y + 6, duration: 1200 + (i % 3) * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 130 });
    this.pads.push(c);
    return c;
  }

  protected begin(): void {
    this.setProgress(0, this.items.length);
    this.guide(this.items[0]);
  }

  protected nextExpected(): string | null {
    return this.playing ? (this.items[this.idx] ?? null) : null;
  }

  protected onChar(e: KeyInputEvent): void {
    const expected = this.items[this.idx];
    if (expected === undefined) return;
    const typed = e.capsLock && e.char ? e.char.toLowerCase() : e.char;
    if (typed !== expected) {
      this.miss(expected, e);
      this.tweens.killTweensOf(this.critter);
      this.critter.setAngle(0);
      this.tweens.add({ targets: this.critter, angle: { from: -12, to: 12 }, duration: 70, yoyo: true, repeat: 2, onComplete: () => this.critter.setAngle(0) });
      this.splash(this.critter.x, PAD_Y + 30, 5);
      return;
    }
    this.hit(expected, e);
    const pad = this.pads[this.idx];
    this.idx++;
    this.setProgress(this.idx, this.items.length);
    this.hopTo(this.padX(this.idx - 1), () => {
      this.tweens.add({ targets: pad, scaleY: 0.85, duration: 90, yoyo: true });
      this.ripple(this.padX(this.idx - 1));
    });
    if (this.idx >= this.items.length) {
      this.guide(null);
      this.time.delayedCall(450, () => this.celebrate());
    } else {
      this.guide(this.items[this.idx]);
    }
  }

  private hopTo(x: number, onLand?: () => void): void {
    const c = this.critter;
    this.tweens.killTweensOf(c);
    c.setAngle(0);
    const fromY = PAD_Y + 4;
    c.y = fromY;
    this.tweens.add({ targets: c, x, duration: 260, ease: 'Linear' });
    this.tweens.add({ targets: c, y: fromY - 110, duration: 130, ease: 'Quad.easeOut', yoyo: true, onComplete: () => onLand?.() });
    this.tweens.killTweensOf(this.track);
    this.tweens.add({ targets: this.track, x: VIEW_X - x, duration: 380, ease: 'Sine.easeInOut' });
  }

  private celebrate(): void {
    const endX = this.padX(this.items.length);
    this.hopTo(endX - 40, () => {
      sfx.cheer();
      for (const l of this.friends) l.dance(4);
      confetti(this, VIEW_X, 380, 70);
    });
    void this.finish(1800);
  }

  private ripple(x: number): void {
    const r = this.add.ellipse(x, PAD_Y + 40, 120, 30).setStrokeStyle(4, 0xffffff, 0.8);
    this.track.addAt(r, 2);
    this.tweens.add({ targets: r, scale: 2, alpha: 0, duration: 600, onComplete: () => r.destroy() });
  }

  private splash(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const d = this.add.circle(x, y, 8, 0x8fdcff);
      this.track.add(d);
      this.tweens.add({ targets: d, x: x + Phaser.Math.Between(-60, 60), y: y - Phaser.Math.Between(30, 80), alpha: 0, duration: 400, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
  }
}
