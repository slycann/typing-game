import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { characterImage } from '../art/textures';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { backdrop } from '../art/themes';
import { FONT_BODY, GAME_W } from '../config';
import { SequenceGame } from './SequenceGame';

const TRACK_Y = 560;
const CAR_W = 112;
const ENGINE_W = 210;
const CAR_COLORS = [PALETTE.red, PALETTE.blue, PALETTE.yellow, PALETTE.green, PALETTE.purple, PALETTE.orange];

/** Word Train: each train carries a word, one letter per car. Type it and the train toots away! */
export class WordTrainScene extends SequenceGame {
  private train: Phaser.GameObjects.Container | null = null;
  private cars: Phaser.GameObjects.Container[] = [];
  private smoke!: Phaser.GameObjects.Container;

  constructor() {
    super('WordTrain');
  }

  protected instructions(): string {
    return 'All aboard! Each train carries a word.\nType it to send the train on its way.';
  }

  protected buildWorld(): void {
    this.train = null;
    this.cars = [];
    backdrop(this, this.theme, 260, { sun: [1720, 220], clouds: [[500, 230, 0.6], [1100, 190, 0.5]] });
    const track = bake(this, 'train-track', GAME_W, 60, (g) => {
      g.fillStyle(0xa96e43, 1);
      for (let x = 0; x < GAME_W; x += 46) g.fillRect(x, 16, 26, 40);
      g.fillStyle(0x8a8aa0, 1);
      g.fillRect(0, 18, GAME_W, 8);
      g.fillRect(0, 40, GAME_W, 8);
    });
    this.add.image(0, TRACK_Y + 40, track).setOrigin(0, 0);
    const platform = bake(this, 'train-platform', 360, 120, (g) => {
      g.fillStyle(0xd9a46e, 1);
      g.fillRect(0, 30, 360, 90);
      g.fillStyle(PALETTE.red, 1);
      g.fillRect(40, 0, 280, 40);
    });
    this.add.image(170, TRACK_Y + 70, platform);
    characterImage(this, 'juni', 150, TRACK_Y + 40, 0.75);
  }

  protected showItem(text: string, i: number): void {
    const c = this.add.container(GAME_W + 200, TRACK_Y);
    const engine = bake(this, 'train-engine', ENGINE_W, 180, (g) => {
      g.fillStyle(darken(PALETTE.blue, 0.2), 1);
      g.fillRoundedRect(20, 70, 190, 90, 18);
      g.fillStyle(PALETTE.blue, 1);
      g.fillRoundedRect(110, 20, 100, 100, 16);
      g.fillStyle(PALETTE.skyBottom, 1);
      g.fillRoundedRect(130, 36, 60, 44, 10);
      g.fillStyle(INK, 1);
      g.fillRect(40, 30, 34, 44);
      g.fillStyle(PALETTE.red, 1);
      g.fillTriangle(0, 160, 30, 110, 30, 160);
      for (const x of [60, 120, 180]) {
        g.fillStyle(INK, 1);
        g.fillCircle(x, 160, 20);
        g.fillStyle(0xd9d2ea, 1);
        g.fillCircle(x, 160, 8);
      }
    });
    c.add(this.add.image(0, 0, engine).setOrigin(0, 0.5));
    this.smoke = this.add.container(57, -90);
    c.add(this.smoke);
    this.cars = [...text].map((ch, k) => {
      const color = CAR_COLORS[(k + i) % CAR_COLORS.length];
      const car = bake(this, `train-car-${color.toString(16)}`, CAR_W, 150, (g) => {
        g.fillStyle(darken(color, 0.25), 1);
        g.fillRoundedRect(4, 30, CAR_W - 8, 96, 16);
        g.fillStyle(color, 1);
        g.fillRoundedRect(4, 22, CAR_W - 8, 92, 16);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(18, 34, CAR_W - 36, 66, 12);
        for (const x of [28, CAR_W - 28]) {
          g.fillStyle(INK, 1);
          g.fillCircle(x, 130, 16);
          g.fillStyle(0xd9d2ea, 1);
          g.fillCircle(x, 130, 6);
        }
      });
      const cc = this.add.container(ENGINE_W + 6 + k * CAR_W + CAR_W / 2, 6, [
        this.add.image(0, 0, car),
        this.add.text(0, -8, ch === ' ' ? '␣' : ch, { fontFamily: FONT_BODY, fontSize: '58px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5),
      ]);
      c.add(cc);
      return cc;
    });
    const width = ENGINE_W + text.length * CAR_W;
    this.train = c;
    sfx.select();
    this.tweens.add({ targets: c, x: Math.max(60, GAME_W / 2 - width / 2 + 120), duration: 900, ease: 'Cubic.easeOut' });
    this.highlight(0);
    this.say(`Here comes the ${text} train!`);
  }

  private highlight(k: number): void {
    this.cars.forEach((car, i) => {
      this.tweens.killTweensOf(car);
      car.y = 6;
      car.setScale(i === k ? 1.08 : 1);
      if (i === k) this.tweens.add({ targets: car, y: -6, duration: 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  protected charTyped(index: number): void {
    const car = this.cars[index];
    this.tweens.killTweensOf(car);
    car.y = 6;
    car.setScale(1);
    car.setAlpha(0.75);
    const t = car.list[1] as Phaser.GameObjects.Text;
    t.setColor('#1f9e4a');
    this.puff();
    this.highlight(index + 1);
  }

  protected charMissed(index: number): void {
    const car = this.cars[index];
    if (car) this.tweens.add({ targets: car, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => car.setAngle(0) });
  }

  private puff(): void {
    const p = this.add.circle(0, 0, 18, 0xffffff, 0.9);
    this.smoke.add(p);
    this.tweens.add({ targets: p, y: -90, x: 30, scale: 2.2, alpha: 0, duration: 900, onComplete: () => p.destroy() });
  }

  protected itemDone(_i: number, next: () => void): void {
    sfx.cheer();
    for (let k = 0; k < 4; k++) this.time.delayedCall(k * 120, () => this.puff());
    const train = this.train!;
    this.tweens.add({ targets: train, x: -2600, duration: 1500, delay: 300, ease: 'Cubic.easeIn', onComplete: () => train.destroy() });
    this.time.delayedCall(1100, next);
  }
}
