import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { characterImage } from '../art/textures';
import { INK, PALETTE, darken, lighten } from '../art/palette';
import { bunting, workshop } from '../art/scenery';
import { GAME_W } from '../config';
import { confetti } from '../scenes/common';
import { TargetStrip } from '../ui/TargetStrip';
import { SequenceGame } from './SequenceGame';

const COUNTER_Y = 560;
const BOWL_X = 560;
const CAKE_X = 1450;
const LAYER_STEP = 46;
const LAYER_COLORS = [0xffb3d1, 0xffd6a5, 0xc9f2a0, 0xb3e0ff, 0xd9c3f5, 0xfff09a, 0xffc0a8, 0xa8f0e0];

/** Bake Shop: every word you type is a (sometimes very silly) ingredient. Each one adds a layer to the cake! */
export class BakeShopScene extends SequenceGame {
  private strip: TargetStrip | null = null;
  private bowl!: Phaser.GameObjects.Image;
  private layers = 0;

  constructor() {
    super('BakeShop');
  }

  protected instructions(): string {
    return "Let's bake a giant cake!\nType each ingredient to add it to the bowl.";
  }

  protected buildWorld(): void {
    this.strip = null;
    this.layers = 0;
    workshop(this, COUNTER_Y + 60);
    bunting(this, 140);
    const counter = bake(this, 'bake-counter', GAME_W, 120, (g) => {
      g.fillStyle(0xd9944f, 1);
      g.fillRect(0, 0, GAME_W, 26);
      g.fillStyle(0xffffff, 1);
      for (let x = 0; x < GAME_W; x += 60) g.fillRect(x, 26, 30, 94);
      g.fillStyle(PALETTE.pink, 1);
      for (let x = 30; x < GAME_W; x += 60) g.fillRect(x, 26, 30, 94);
    });
    this.add.image(0, COUNTER_Y, counter).setOrigin(0, 0);
    const bowl = bake(this, 'bake-bowl', 260, 150, (g) => {
      g.fillStyle(darken(PALETTE.blue, 0.2), 1);
      g.slice(130, 20, 124, 0, Math.PI, false);
      g.fillPath();
      g.fillStyle(PALETTE.blue, 1);
      g.slice(130, 14, 120, 0, Math.PI, false);
      g.fillPath();
      g.fillStyle(0xfff4dc, 1);
      g.fillEllipse(130, 16, 230, 30);
    });
    this.bowl = this.add.image(BOWL_X, COUNTER_Y - 40, bowl);
    const stand = bake(this, 'bake-stand', 360, 70, (g) => {
      g.fillStyle(0xd9d2ea, 1);
      g.fillRoundedRect(0, 0, 360, 22, 11);
      g.fillRect(160, 20, 40, 40);
      g.fillRoundedRect(110, 54, 140, 16, 8);
    });
    this.add.image(CAKE_X, COUNTER_Y - 34, stand);
    characterImage(this, 'juni', 200, COUNTER_Y + 10, 0.85);
  }

  protected showItem(text: string): void {
    this.strip?.destroy();
    this.strip = new TargetStrip(this, 800, 250, text, 900);
    this.strip.setScale(0.5);
    this.tweens.add({ targets: this.strip, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.say(`Add ${text}!`);
  }

  protected charTyped(index: number): void {
    this.strip?.setIndex(index + 1);
    this.strip?.popDone(index);
    const s = this.add.circle(BOWL_X + Phaser.Math.Between(-60, 60), COUNTER_Y - 160, 7, LAYER_COLORS[index % LAYER_COLORS.length]);
    this.tweens.add({ targets: s, y: COUNTER_Y - 60, duration: 300, ease: 'Quad.easeIn', onComplete: () => s.destroy() });
  }

  protected charMissed(index: number): void {
    this.strip?.shake(index);
  }

  protected itemDone(i: number, next: () => void): void {
    sfx.pop();
    const color = LAYER_COLORS[i % LAYER_COLORS.length];
    this.tweens.add({ targets: this.bowl, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => this.bowl.setAngle(0) });
    const blob = this.add.circle(BOWL_X, COUNTER_Y - 70, 30, color).setStrokeStyle(4, darken(color, 0.3));
    this.tweens.add({ targets: blob, x: CAKE_X, duration: 600, delay: 350, ease: 'Sine.easeInOut' });
    this.tweens.add({
      targets: blob,
      y: COUNTER_Y - 300,
      duration: 300,
      delay: 350,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        blob.destroy();
        this.addLayer(color);
        if (this.idx >= this.items.length) this.decorate();
        this.time.delayedCall(300, next);
      },
    });
  }

  private addLayer(color: number): void {
    const w = 300 - this.layers * 18;
    const key = bake(this, `cake-layer-${color.toString(16)}-${w}`, w, 70, (g) => {
      g.fillStyle(darken(color, 0.2), 1);
      g.fillRoundedRect(0, 10, w, 60, 16);
      g.fillStyle(color, 1);
      g.fillRoundedRect(0, 0, w, 58, 16);
      g.fillStyle(lighten(color, 0.6), 1);
      g.fillRoundedRect(0, 0, w, 18, 9);
      for (let x = 14; x < w - 10; x += 34) g.fillCircle(x, 18, 9);
    });
    const y = COUNTER_Y - 72 - this.layers * LAYER_STEP;
    const layer = this.add.image(CAKE_X, y - 200, key);
    this.tweens.add({ targets: layer, y, duration: 350, ease: 'Bounce.easeOut' });
    this.layers++;
  }

  /** The finished cake gets candles and a cherry. */
  private decorate(): void {
    const top = COUNTER_Y - 72 - this.layers * LAYER_STEP + 20;
    for (let k = 0; k < 3; k++) {
      const x = CAKE_X - 50 + k * 50;
      this.add.rectangle(x, top - 30, 12, 50, [PALETTE.blue, PALETTE.hotPink, PALETTE.green][k]);
      const flame = this.add.ellipse(x, top - 64, 14, 22, PALETTE.yellow);
      this.tweens.add({ targets: flame, scaleY: 1.3, duration: 200, yoyo: true, repeat: -1 });
    }
    this.add.circle(CAKE_X + 90, top - 6, 16, PALETTE.red).setStrokeStyle(3, INK);
    sfx.cheer();
    confetti(this, CAKE_X, top - 100, 80);
    this.say('What a cake! Yummy!');
  }
}
