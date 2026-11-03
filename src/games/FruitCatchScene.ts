import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { Avatar } from '../art/Avatar';
import { bake } from '../art/bake';
import { PALETTE, darken } from '../art/palette';
import { backdrop } from '../art/themes';
import { GAME_W } from '../config';
import { ageIndex } from '../curriculum/worlds';
import type { PowerUpId } from '../engine/PowerUps';
import { WordTargeter, type Target } from '../engine/WordTargeter';
import type { KeyInputEvent } from '../input/KeyboardInput';
import { WordLabel } from '../ui/WordLabel';
import { GameBase, PLAY_BOTTOM } from './GameBase';

interface Fruit extends Target {
  c: Phaser.GameObjects.Container;
  label: WordLabel;
  gone: boolean;
  gift?: PowerUpId;
}

const GROUND = PLAY_BOTTOM;
const FALL_MS = [10000, 7600, 5800];
const SPAWN_MS = [2600, 2000, 1500];
const MAX_FRUIT = [2, 3, 4];
const FRUIT_COLORS = [0xff5d5d, 0xff9a3c, 0x9b5de5, 0x7ed957];

/** Fruit Catch: fruit with letters on it falls from the big tree. Type it to catch it in your basket! */
export class FruitCatchScene extends GameBase {
  private fruits: Fruit[] = [];
  private targeter = new WordTargeter<Fruit>();
  private spawned = 0;
  private resolved = 0;
  private lastGuide: string | null | undefined = undefined;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private catcher!: Avatar;
  private basket!: Phaser.GameObjects.Image;

  constructor() {
    super('FruitCatch');
  }

  protected instructions(): string {
    return this.level.content === 'words'
      ? 'Fruit is falling from the tree!\nType the whole word to catch it.'
      : 'Fruit is falling from the tree!\nType what is on it to catch it in your basket.';
  }

  protected buildWorld(): void {
    this.fruits = [];
    this.targeter = new WordTargeter<Fruit>();
    this.spawned = 0;
    this.resolved = 0;
    this.lastGuide = undefined;
    this.spawnTimer = null;
    backdrop(this, this.theme, 330, { sun: [1780, 300] });
    const canopy = bake(this, 'fruit-canopy', GAME_W, 330, (g) => {
      g.fillStyle(PALETTE.trunk, 1);
      g.fillRoundedRect(120, 160, 60, 600, 20);
      g.fillRoundedRect(1740, 160, 60, 600, 20);
      g.fillStyle(0x3f9a38, 1);
      for (let x = -40; x < GAME_W + 80; x += 150) g.fillCircle(x, 150 + (x % 300 ? 30 : 0), 130);
      g.fillStyle(0x5cbf3f, 1);
      for (let x = 20; x < GAME_W; x += 150) g.fillCircle(x, 110 + (x % 300 ? 20 : 0), 100);
      for (let i = 0; i < 24; i++) {
        g.fillStyle(FRUIT_COLORS[i % 4], 1);
        g.fillCircle(60 + i * 80, 200 + ((i * 37) % 70), 14);
      }
    });
    this.add.image(0, 0, canopy).setOrigin(0, 0).setDepth(5);
    this.catcher = new Avatar(this, GAME_W / 2, GROUND, this.profile, 0.7).setDepth(20);
    const basket = bake(this, 'fruit-basket', 200, 100, (g) => {
      g.fillStyle(0xa96e43, 1);
      g.fillRoundedRect(0, 10, 200, 90, { tl: 10, tr: 10, bl: 40, br: 40 });
      g.fillStyle(0xd9a46e, 1);
      for (let x = 14; x < 190; x += 30) g.fillRect(x, 20, 14, 70);
      g.fillStyle(0x8a5a3c, 1);
      g.fillRoundedRect(0, 0, 200, 20, 10);
    });
    this.basket = this.add.image(GAME_W / 2, GROUND - 70, basket).setDepth(21);
  }

  private get age(): number {
    return ageIndex(this.profile.ageBand);
  }

  protected begin(): void {
    this.setProgress(0, this.items.length);
    this.drop();
    this.spawnTimer = this.time.addEvent({ delay: SPAWN_MS[this.age] * (this.level.content === 'words' ? 1.5 : 1), loop: true, callback: () => this.drop() });
  }

  private drop(): void {
    if (this.spawned >= this.items.length) return;
    if (this.fruits.filter((f) => !f.gone && !f.gift).length >= MAX_FRUIT[this.age]) return;
    this.makeFruit(this.items[this.spawned++]);
  }

  protected spawnGift(word: string, id: PowerUpId): boolean {
    this.makeFruit(word, id);
    return true;
  }

  protected setBig(on: boolean): void {
    super.setBig(on);
    for (const f of this.fruits) if (!f.gone) this.tweens.add({ targets: f.label, scale: on ? 1.4 : 1, duration: 250 });
  }

  private makeFruit(text: string, gift?: PowerUpId): void {
    const color = gift ? PALETTE.yellow : FRUIT_COLORS[this.spawned % FRUIT_COLORS.length];
    const r = text.length > 2 ? 46 + text.length * 11 : 62;
    const key = bake(this, `fruit-${color.toString(16)}-${r}`, r * 2 + 10, r * 2 + 40, (g) => {
      g.fillStyle(0x8a5a3c, 1);
      g.fillRect(r, 4, 8, 30);
      g.fillStyle(0x5cbf3f, 1);
      g.fillEllipse(r + 26, 18, 40, 18);
      g.fillStyle(darken(color, 0.25), 1);
      g.fillCircle(r + 5, r + 36, r);
      g.fillStyle(color, 1);
      g.fillCircle(r + 5, r + 30, r);
      g.fillStyle(0xffffff, 0.45);
      g.fillEllipse(r - r * 0.35, r + 30 - r * 0.4, r * 0.5, r * 0.3);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(r + 5, r + 30, r * 0.72);
    });
    const label = new WordLabel(this, 0, 18, text, text.length > 2 ? 44 : 70).setScale(this.bigLetters ? 1.4 : 1);
    const x = Phaser.Math.Between(260, GAME_W - 260);
    const c = this.add.container(x, 220, [this.add.image(0, 0, key), label]).setDepth(10).setScale(0.3);
    const f: Fruit = { text, typed: 0, c, label, gone: false, gift };
    this.fruits.push(f);
    sfx.pop();
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: GROUND - 60, duration: FALL_MS[this.age] * (text.length > 2 ? 1.4 : 1), ease: 'Quad.easeIn', onComplete: () => this.land(f) });
    this.tweens.add({ targets: c, angle: { from: -6, to: 6 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Most urgent first: the fruit closest to the ground. */
  private ordered(): Fruit[] {
    return this.fruits.filter((f) => !f.gone).sort((a, b) => b.c.y - a.c.y);
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
    if (this.spawned < this.items.length && !this.fruits.some((f) => !f.gone && !f.gift)) this.drop();
  }

  protected onChar(e: KeyInputEvent): void {
    const res = this.targeter.input(this.typedChar(e), this.ordered());
    if (res.result === 'wrong') return this.miss(res.expected, e);
    this.hit(res.expected, e);
    res.target.label.setTyped(res.target.typed);
    this.lastGuide = undefined;
    if (res.result !== 'complete') return void this.tweens.add({ targets: res.target.c, scale: 1.1, duration: 80, yoyo: true });
    this.catchFruit(res.target);
    if (res.target.gift) this.activate(res.target.gift);
    else this.resolve();
  }

  /** The critter dashes over and the fruit drops into the basket. */
  private catchFruit(f: Fruit): void {
    f.gone = true;
    this.tweens.killTweensOf(f.c);
    const x = Phaser.Math.Clamp(f.c.x, 200, GAME_W - 200);
    this.tweens.killTweensOf([this.catcher, this.basket]);
    this.catcher.face(x < this.catcher.x);
    this.tweens.add({ targets: [this.catcher, this.basket], x, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: f.c,
      x,
      y: GROUND - 90,
      scale: 0.45,
      duration: 280,
      ease: 'Quad.easeIn',
      onComplete: () => {
        sfx.pop();
        this.tweens.add({ targets: this.basket, scaleY: 0.85, duration: 80, yoyo: true });
        this.tweens.add({ targets: f.c, alpha: 0, duration: 200, onComplete: () => f.c.destroy() });
      },
    });
  }

  private land(f: Fruit): void {
    if (f.gone) return;
    f.gone = true;
    this.targeter.drop(f);
    this.lastGuide = undefined;
    this.tweens.killTweensOf(f.c);
    this.tweens.add({ targets: f.c, y: GROUND - 120, duration: 180, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: f.c, x: f.c.x + (f.c.x < GAME_W / 2 ? -400 : 400), alpha: 0, angle: 360, duration: 900, onComplete: () => f.c.destroy() });
    if (f.gift) return this.giftGone();
    this.escaped(f.text.slice(f.typed));
    this.resolve();
  }

  private resolve(): void {
    this.resolved++;
    this.setProgress(this.resolved, this.items.length);
    if (this.resolved >= this.items.length) {
      this.spawnTimer?.remove();
      this.updateDebug({ made: this.fruits.filter((f) => !f.gift).length, items: this.items.length });
      sfx.cheer();
      this.tweens.add({ targets: this.catcher, y: GROUND - 60, duration: 200, yoyo: true, repeat: 2 });
      void this.finish(1200);
    }
  }
}
