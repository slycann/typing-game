import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { cloud, flower, hills, sky, sun } from '../art/scenery';
import { characterImage } from '../art/textures';
import { PALETTE } from '../art/palette';
import { ageIndex } from '../curriculum/worlds';
import type { KeyInputEvent } from '../input/KeyboardInput';
import type { PowerUpId } from '../engine/PowerUps';
import { WordTargeter, type Target } from '../engine/WordTargeter';
import { WordLabel } from '../ui/WordLabel';
import { GameBase, PLAY_BOTTOM } from './GameBase';

interface Bubble extends Target {
  c: Phaser.GameObjects.Container;
  label: WordLabel;
  gone: boolean;
  /** A golden power-up bubble. */
  gift?: PowerUpId;
}

const WAND = { x: 300, y: 420 };
// By age band: 5-6, 7-8, 9-10
const SPAWN_MS = [2400, 1800, 1350];
const RISE_MS = [11000, 8500, 6800];
const MAX_ON_SCREEN = [3, 4, 5];

/** Bubble Pop: Juni blows bubbles; type what's inside to pop them before they float away. */
export class BubblePopScene extends GameBase {
  private bubbles: Bubble[] = [];
  private targeter = new WordTargeter<Bubble>();
  private spawned = 0;
  private resolved = 0;
  private lastGuide: string | null | undefined = undefined;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private juni!: Phaser.GameObjects.Image;

  constructor() {
    super('BubblePop');
  }

  protected instructions(): string {
    return this.level.content === 'words'
      ? 'Juni is blowing bubbles!\nType the whole word to pop a bubble.'
      : 'Juni is blowing bubbles!\nType the letter inside to pop it.';
  }

  protected buildWorld(): void {
    this.bubbles = [];
    this.targeter = new WordTargeter<Bubble>();
    this.spawned = 0;
    this.resolved = 0;
    this.lastGuide = undefined;
    this.spawnTimer = null;
    sky(this);
    sun(this, 1720, 230, 60);
    cloud(this, 700, 250, 0.6);
    cloud(this, 1300, 190, 0.5);
    hills(this, 400);
    [[620, 640, PALETTE.pink], [1000, 620, PALETTE.yellow], [1450, 650, PALETTE.purple], [1780, 630, PALETTE.red]].forEach(([x, y, c]) => flower(this, x, y, c, 0.9));
    this.juni = characterImage(this, 'juni', 170, PLAY_BOTTOM + 10, 0.95);
    // bubble wand
    const wand = bake(this, 'bubble-wand', 120, 160, (g) => {
      g.lineStyle(10, 0xff5fa2, 1);
      g.lineBetween(30, 150, 70, 60);
      g.lineStyle(9, 0xff5fa2, 1);
      g.strokeCircle(82, 36, 28);
    });
    this.add.image(WAND.x - 60, WAND.y + 40, wand);
  }

  private get age(): number {
    return ageIndex(this.profile.ageBand);
  }

  protected begin(): void {
    this.setProgress(0, this.items.length);
    const words = this.level.content === 'words';
    const every = SPAWN_MS[this.age] * (words ? 1.6 : 1);
    this.spawn();
    this.spawnTimer = this.time.addEvent({ delay: every, loop: true, callback: () => this.spawn() });
  }

  private spawn(): void {
    if (this.spawned >= this.items.length) return;
    const live = this.bubbles.filter((b) => !b.gone && !b.gift);
    if (live.length >= MAX_ON_SCREEN[this.age]) return;
    this.blow(this.items[this.spawned++]);
  }

  protected spawnGift(word: string, id: PowerUpId): boolean {
    this.blow(word, id);
    return true;
  }

  protected setBig(on: boolean): void {
    super.setBig(on);
    for (const b of this.bubbles) if (!b.gone) this.tweens.add({ targets: b.label, scale: on ? 1.45 : 1, duration: 250 });
  }

  private blow(text: string, gift?: PowerUpId): void {
    const words = text.length > 1;
    const size = words ? Math.max(170, 60 + text.length * 40) : 150;
    const key = bake(this, `bubble-${size}-${gift ? 'gold' : 'plain'}`, size + 8, size + 8, (g) => {
      const r = size / 2;
      const cx = r + 4;
      g.fillStyle(gift ? 0xffd23f : 0xbfe9ff, gift ? 0.75 : 0.45);
      g.fillCircle(cx, cx, r);
      g.lineStyle(6, 0xffffff, 0.95);
      g.strokeCircle(cx, cx, r);
      g.lineStyle(5, 0x9fd8ff, 0.8);
      g.strokeCircle(cx, cx, r - 7);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(cx - r * 0.42, cx - r * 0.45, r * 0.42, r * 0.24);
      g.fillStyle(0xffc6ec, 0.5);
      g.fillEllipse(cx + r * 0.4, cx + r * 0.45, r * 0.3, r * 0.14);
    });
    const label = new WordLabel(this, 0, 0, text, words ? 50 : 76).setScale(this.bigLetters ? 1.45 : 1);
    const c = this.add.container(WAND.x, WAND.y, [this.add.image(0, 0, key), label]).setScale(0.2);
    const b: Bubble = { text, typed: 0, c, label, gone: false, gift };
    this.bubbles.push(b);
    sfx.pop();
    this.tweens.add({ targets: this.juni, scaleY: this.juni.scaleY * 0.94, duration: 120, yoyo: true });

    const startX = Phaser.Math.Between(560, 1700);
    const startY = PLAY_BOTTOM - size / 2 - 10;
    const rise = RISE_MS[this.age] * (words ? 1.4 : 1);
    this.tweens.add({
      targets: c,
      x: startX,
      y: startY,
      scale: 1,
      duration: 650,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: c, x: startX + Phaser.Math.Between(-90, 90), duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: c, y: -size, duration: rise, ease: 'Linear', onComplete: () => this.floatAway(b) });
      },
    });
  }

  /** Most urgent first: the bubble closest to floating off the top. */
  private ordered(): Bubble[] {
    return this.bubbles.filter((b) => !b.gone).sort((a, b) => a.c.y - b.c.y);
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
    // Don't keep kids waiting when the sky is empty.
    if (this.spawned < this.items.length && !this.bubbles.some((b) => !b.gone && !b.gift)) this.spawn();
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
    if (res.result === 'complete' && res.target.gift) {
      this.pop(res.target, false);
      this.activate(res.target.gift);
    } else if (res.result === 'complete') this.pop(res.target);
    else this.tweens.add({ targets: res.target.c, scale: 1.08, duration: 80, yoyo: true });
    this.lastGuide = undefined;
  }

  private pop(b: Bubble, counts = true): void {
    b.gone = true;
    this.tweens.killTweensOf(b.c);
    sfx.pop();
    const { x, y } = b.c;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = this.add.circle(x, y, 9, i % 2 ? 0xffffff : 0xbfe9ff);
      this.tweens.add({ targets: d, x: x + Math.cos(a) * 110, y: y + Math.sin(a) * 110, alpha: 0, scale: 0.3, duration: 380, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
    this.tweens.add({ targets: b.c, scale: 1.4, alpha: 0, duration: 160, onComplete: () => b.c.destroy() });
    if (counts) this.resolve();
  }

  private floatAway(b: Bubble): void {
    if (b.gone) return;
    b.gone = true;
    this.targeter.drop(b);
    b.c.destroy();
    this.lastGuide = undefined;
    if (b.gift) return this.giftGone();
    this.escaped(b.text.slice(b.typed));
    this.resolve();
  }

  private resolve(): void {
    this.resolved++;
    this.setProgress(this.resolved, this.items.length);
    if (this.resolved >= this.items.length) {
      this.spawnTimer?.remove();
      this.updateDebug({ made: this.bubbles.filter((b) => !b.gift).length, items: this.items.length });
      void this.finish(900);
    }
  }
}
