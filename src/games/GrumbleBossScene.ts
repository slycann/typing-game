import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Grumble } from '../art/Grumble';
import { INK, PALETTE } from '../art/palette';
import { flower, hills, sky } from '../art/scenery';
import { GAME_W } from '../config';
import { ageIndex } from '../curriculum/worlds';
import { WordTargeter, type Target } from '../engine/WordTargeter';
import type { KeyInputEvent } from '../input/KeyboardInput';
import { confetti } from '../scenes/common';
import { WordLabel } from '../ui/WordLabel';
import { GameBase, PLAY_BOTTOM } from './GameBase';

interface Drop extends Target {
  c: Phaser.GameObjects.Container;
  label: WordLabel;
  gone: boolean;
}

const GROUND = PLAY_BOTTOM - 10;
const FALL_MS = [17000, 13500, 10500];
const SPAWN_MS = [4200, 3300, 2600];
const MAX_DROPS = [2, 3, 4];
const FLOWER_COLORS = [PALETTE.pink, PALETTE.yellow, PALETTE.purple, PALETTE.red, PALETTE.blue, PALETTE.orange];

/**
 * Grumble's Rainy Day: Grumble sneezes raindrops with words on them. Typing a word turns its
 * raindrop into a flower, and every flower cheers Grumble up a little. Nobody loses: drops that
 * land just make a puddle.
 */
export class GrumbleBossScene extends GameBase {
  private grumble!: Grumble;
  private sunny!: Phaser.GameObjects.Image;
  private drops: Drop[] = [];
  private targeter = new WordTargeter<Drop>();
  private spawned = 0;
  private resolved = 0;
  private cheered = 0;
  private lastGuide: string | null | undefined = undefined;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super('GrumbleBoss');
  }

  protected instructions(): string {
    return "Oh no! Grumble is making it rain.\nType the words on the raindrops to turn them\ninto flowers. Can you cheer Grumble up?";
  }

  protected buildWorld(): void {
    this.drops = [];
    this.targeter = new WordTargeter<Drop>();
    this.spawned = 0;
    this.resolved = 0;
    this.cheered = 0;
    this.lastGuide = undefined;
    this.spawnTimer = null;
    sky(this, 0x7f8fbf, 0xc9d3ee);
    // The sunny sky fades in as Grumble cheers up.
    this.sunny = sky(this).setAlpha(0);
    hills(this, 470, [0x8fd36a, 0x6cbf4f, 0x55a844]);
    this.grumble = new Grumble(this, GAME_W / 2, 290, 1.05);
  }

  private get age(): number {
    return ageIndex(this.profile.ageBand);
  }

  protected begin(): void {
    this.setProgress(0, this.items.length);
    this.sneezeDrop();
    this.spawnTimer = this.time.addEvent({ delay: SPAWN_MS[this.age], loop: true, callback: () => this.sneezeDrop() });
  }

  private sneezeDrop(): void {
    if (this.spawned >= this.items.length) return;
    if (this.drops.filter((d) => !d.gone).length >= MAX_DROPS[this.age]) return;
    const text = this.items[this.spawned++];
    this.grumble.sneeze(() => this.makeDrop(text));
  }

  private makeDrop(text: string): void {
    const key = bake(this, 'rain-drop', 110, 140, (g) => {
      g.fillStyle(0x2f7fd6, 1);
      g.fillCircle(55, 92, 44);
      g.fillTriangle(15, 80, 95, 80, 55, 6);
      g.fillStyle(0x6fc0ff, 1);
      g.fillCircle(55, 86, 42);
      g.fillTriangle(17, 74, 93, 74, 55, 2);
      g.fillStyle(0xffffff, 0.8);
      g.fillEllipse(38, 78, 14, 26);
    });
    const labelW = Math.max(150, 40 + text.length * 34);
    const pill = bake(this, `rain-pill-${labelW}`, labelW, 76, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 6, labelW, 70, 35);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, labelW, 70, 35);
    });
    const label = new WordLabel(this, 0, 92, text, 50);
    const c = this.add.container(this.grumble.x + Phaser.Math.Between(-120, 120), this.grumble.y + 60, [
      this.add.image(0, 0, key),
      this.add.image(0, 95, pill),
      label,
    ]);
    const d: Drop = { text, typed: 0, c, label, gone: false };
    this.drops.push(d);
    const x = Phaser.Math.Between(260, GAME_W - 260);
    this.tweens.add({ targets: c, x, duration: 1200, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: c, y: GROUND - 130, duration: FALL_MS[this.age], ease: 'Linear', onComplete: () => this.land(d) });
    this.tweens.add({ targets: c, angle: { from: -4, to: 4 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Most urgent first: the drop closest to the ground. */
  private ordered(): Drop[] {
    return this.drops.filter((d) => !d.gone).sort((a, b) => b.c.y - a.c.y);
  }

  protected nextExpected(): string | null {
    return this.playing ? this.targeter.expected(this.ordered()) : null;
  }

  update(): void {
    if (!this.playing) return;
    const next = this.nextExpected();
    if (next !== this.lastGuide) {
      this.lastGuide = next;
      this.guide(next);
      this.updateDebug();
    }
    if (this.spawned < this.items.length && !this.drops.some((d) => !d.gone) && !this.grumble.mood.startsWith('sneezy')) this.sneezeDrop();
  }

  protected onChar(e: KeyInputEvent): void {
    const typed = e.capsLock && e.char ? e.char.toLowerCase() : e.char!;
    const res = this.targeter.input(typed, this.ordered());
    if (res.result === 'wrong') {
      this.miss(res.expected, e);
      return;
    }
    this.hit(res.expected, e);
    res.target.label.setTyped(res.target.typed);
    if (res.result === 'complete') this.bloom(res.target);
    else this.tweens.add({ targets: res.target.c, scale: 1.1, duration: 80, yoyo: true });
    this.lastGuide = undefined;
  }

  /** A typed word: the raindrop becomes a flower and Grumble feels a little better. */
  private bloom(d: Drop): void {
    d.gone = true;
    this.tweens.killTweensOf(d.c);
    sfx.good(this.cheered + 2);
    const fx = d.c.x;
    this.tweens.add({ targets: d.c, y: GROUND - 40, scale: 0.3, alpha: 0, duration: 300, ease: 'Quad.easeIn', onComplete: () => d.c.destroy() });
    this.time.delayedCall(280, () => {
      const f = flower(this, fx, GROUND + 30, FLOWER_COLORS[this.cheered % FLOWER_COLORS.length], 0.2);
      this.tweens.add({ targets: f, scale: 1.6, duration: 450, ease: 'Back.easeOut' });
    });
    this.cheered++;
    this.grumble.wiggle();
    const frac = this.cheered / this.items.length;
    this.tweens.add({ targets: this.sunny, alpha: frac * 0.9, duration: 600 });
    const mood = frac >= 0.85 ? 'happy' : frac >= 0.35 ? 'okay' : 'grumpy';
    if (mood !== this.grumble.restMood) {
      this.grumble.restMood = mood;
      if (this.grumble.mood !== 'sneezy') this.grumble.setMood(mood);
      if (mood === 'okay') narrator.say('Grumble is starting to smile!');
    }
    this.resolve();
  }

  /** A drop that reached the ground just makes a puddle. */
  private land(d: Drop): void {
    if (d.gone) return;
    d.gone = true;
    this.targeter.drop(d);
    this.escaped(d.text.slice(d.typed));
    const { x } = d.c;
    d.c.destroy();
    const puddle = this.add.ellipse(x, GROUND + 20, 160, 36, 0x6fc0ff, 0.8);
    this.tweens.add({ targets: puddle, alpha: 0, scaleX: 1.4, delay: 600, duration: 900, onComplete: () => puddle.destroy() });
    for (let i = 0; i < 6; i++) {
      const s = this.add.circle(x, GROUND, 8, 0x6fc0ff);
      this.tweens.add({ targets: s, x: x + Phaser.Math.Between(-70, 70), y: GROUND - Phaser.Math.Between(30, 90), alpha: 0, duration: 420, onComplete: () => s.destroy() });
    }
    this.lastGuide = undefined;
    this.resolve();
  }

  private resolve(): void {
    this.resolved++;
    this.setProgress(this.resolved, this.items.length);
    if (this.resolved < this.items.length) return;
    this.spawnTimer?.remove();
    this.updateDebug({ made: this.drops.length, items: this.items.length });
    this.grumble.restMood = 'happy';
    this.grumble.setMood('happy');
    this.tweens.add({ targets: this.sunny, alpha: 1, duration: 800 });
    sfx.cheer();
    confetti(this, GAME_W / 2, 300, 100);
    narrator.say('You did it! Grumble is happy! Thank you, will you be my friend?');
    void this.finish(2600);
  }
}
