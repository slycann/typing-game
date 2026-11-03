import Phaser from 'phaser';
import { bake } from './bake';
import { INK } from './palette';

export type GrumbleMood = 'grumpy' | 'okay' | 'sneezy' | 'happy';

/** Grumble the Raincloud: lonely, a bit grumpy, and secretly lovely. */
export class Grumble extends Phaser.GameObjects.Container {
  private cloudImg: Phaser.GameObjects.Image;
  private faceG: Phaser.GameObjects.Graphics;
  mood: GrumbleMood = 'grumpy';
  /** The mood to return to after sneezing. */
  restMood: GrumbleMood = 'grumpy';
  private baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, scale = 1) {
    super(scene, x, y);
    this.cloudImg = scene.add.image(0, 0, '__WHITE');
    this.faceG = scene.add.graphics();
    this.add([this.cloudImg, this.faceG]);
    this.drawBody();
    this.setMood('grumpy');
    this.setScale(scale);
    this.baseScale = scale;
    scene.add.existing(this);
    scene.tweens.add({ targets: this, y: y - 14, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  setMood(mood: GrumbleMood): void {
    this.mood = mood;
    const g = this.faceG;
    g.clear();
    if (mood === 'sneezy') {
      g.lineStyle(7, INK, 1);
      g.lineBetween(-46, -12, -24, -4);
      g.lineBetween(-46, 4, -24, -4);
      g.lineBetween(46, -12, 24, -4);
      g.lineBetween(46, 4, 24, -4);
      g.fillStyle(INK, 1);
      g.fillEllipse(0, 34, 44, 34);
      return;
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-34, -6, 16);
    g.fillCircle(34, -6, 16);
    g.fillStyle(INK, 1);
    g.fillCircle(-32, -3, 8);
    g.fillCircle(36, -3, 8);
    g.fillStyle(0xff8fab, 0.6);
    g.fillCircle(-62, 22, 12);
    g.fillCircle(62, 22, 12);
    g.lineStyle(7, INK, 1);
    if (mood === 'grumpy') {
      g.lineBetween(-54, -34, -18, -24);
      g.lineBetween(54, -34, 18, -24);
      g.beginPath();
      g.arc(0, 46, 22, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340));
      g.strokePath();
    } else if (mood === 'okay') {
      g.lineBetween(-50, -30, -20, -28);
      g.lineBetween(50, -30, 20, -28);
      g.lineBetween(-16, 34, 16, 34);
    } else {
      g.beginPath();
      g.arc(0, 18, 26, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160));
      g.strokePath();
    }
  }

  /** A little "hee!" wiggle when something nice happens. */
  wiggle(): void {
    if (this.mood === 'sneezy') return;
    const s = this.baseScale;
    this.scene.tweens.add({ targets: this, scaleX: s * 1.08, scaleY: s * 0.94, angle: { from: -4, to: 4 }, duration: 120, yoyo: true, onComplete: () => this.setAngle(0).setScale(s) });
  }

  /** Wind up and AH-CHOO! Calls back at the moment of the sneeze. */
  sneeze(onAchoo: () => void): void {
    if (this.mood === 'sneezy') return void onAchoo();
    this.setMood('sneezy');
    this.setScale(this.baseScale).setAngle(0);
    let achooed = false; // onYoyo fires once per tweened property
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.12,
      scaleY: this.baseScale * 0.9,
      duration: 420,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onYoyo: () => {
        if (achooed) return;
        achooed = true;
        onAchoo();
      },
      onComplete: () => {
        this.setScale(this.baseScale);
        this.setMood(this.restMood);
      },
    });
  }

  private drawBody(): void {
    const key = bake(this.scene, 'grumble-body', 380, 280, (g) => {
      const ox = 190, oy = 150;
      const puffs: [number, number, number][] = [[-90, 10, 62], [-40, -40, 70], [30, -50, 76], [90, -6, 64], [0, 20, 78], [-110, 40, 44], [110, 40, 46]];
      g.fillStyle(0x7d8bb5, 1);
      for (const [x, y, r] of puffs) g.fillCircle(ox + x + 4, oy + y + 10, r);
      g.fillStyle(0xa5b4dc, 1);
      for (const [x, y, r] of puffs) g.fillCircle(ox + x, oy + y, r);
      g.fillStyle(0xc2cdee, 1);
      g.fillCircle(ox - 40, oy - 60, 30);
      g.fillCircle(ox + 20, oy - 72, 26);
    });
    this.cloudImg.setTexture(key).setOrigin(190 / 380, 150 / 280);
  }
}
