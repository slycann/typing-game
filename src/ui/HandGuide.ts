import Phaser from 'phaser';
import { FINGER_COLORS, INK, darken } from '../art/palette';
import { HOME_KEYS, KEY_BY_CODE, strokeForChar, type Finger, type Hand } from '../input/keyLayout';
import type { OnScreenKeyboard } from './OnScreenKeyboard';

interface Pt {
  x: number;
  y: number;
}

interface FingerState {
  hand: Hand;
  finger: Finger;
  home: Pt;
  knuckle: Pt;
  tip: Pt;
  width: number;
}

const FINGERS: Finger[] = ['pinky', 'ring', 'middle', 'index', 'thumb'];
const GLOVE = 0xfff1dc;

/**
 * See-through cartoon hands resting on the home row. Each fingertip is a Finger Friend
 * with a little face; the right one reaches for the next key so kids learn which finger to use.
 */
export class HandGuide extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private fingers: FingerState[] = [];
  private palms: Record<Hand, Pt & { rx: number; ry: number }>;
  private busy = new Set<FingerState>();
  private blinking: FingerState | null = null;
  private u: number;

  constructor(scene: Phaser.Scene, private kb: OnScreenKeyboard) {
    super(scene, kb.x, kb.y);
    this.u = kb.unit;
    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.palms = { left: this.palmFor('left'), right: this.palmFor('right') };
    for (const hand of ['left', 'right'] as const) for (const f of FINGERS) this.fingers.push(this.makeFinger(hand, f));
    scene.add.existing(this);
    this.redraw();
    const blink = scene.time.addEvent({
      delay: 1800,
      loop: true,
      callback: () => {
        this.blinking = Phaser.Utils.Array.GetRandom(this.fingers);
        this.redraw();
        scene.time.delayedCall(140, () => {
          this.blinking = null;
          this.redraw();
        });
      },
    });
    this.once(Phaser.GameObjects.Events.DESTROY, () => blink.remove());
  }

  /** Point the right finger(s) at the key for this character; everyone else rests at home. */
  showFor(char: string | null): void {
    const stroke = char === null ? null : strokeForChar(char);
    const moves = new Map<FingerState, Pt>();
    if (stroke) {
      const key = KEY_BY_CODE.get(stroke.code);
      if (key) {
        const hand = stroke.code === 'Space' ? 'right' : key.hand;
        const f = this.get(hand, key.finger);
        moves.set(f, this.tipTarget(stroke.code));
      }
      if (stroke.shift && stroke.shiftCode) {
        const shiftHand = stroke.shiftCode === 'ShiftLeft' ? 'left' : 'right';
        moves.set(this.get(shiftHand, 'pinky'), this.tipTarget(stroke.shiftCode));
      }
    }
    this.busy = new Set(moves.keys());
    for (const f of this.fingers) this.moveTip(f, moves.get(f) ?? f.home);
  }

  rest(): void {
    this.showFor(null);
  }

  activeFingers(): string[] {
    return [...this.busy].map((f) => `${f.hand}-${f.finger}`);
  }

  private get(hand: Hand, finger: Finger): FingerState {
    return this.fingers.find((f) => f.hand === hand && f.finger === finger)!;
  }

  private tipTarget(code: string): Pt {
    const c = this.kb.keyCenter(code)!;
    return { x: c.x, y: c.y + this.u * 0.3 };
  }

  private palmFor(hand: Hand): Pt & { rx: number; ry: number } {
    const homes = (['pinky', 'ring', 'middle', 'index'] as Finger[]).map((f) => this.kb.keyCenter(HOME_KEYS[hand][f])!);
    const cx = homes.reduce((s, p) => s + p.x, 0) / homes.length + (hand === 'left' ? 0.25 : -0.25) * this.u;
    return { x: cx, y: homes[0].y + this.u * 2.75, rx: this.u * 2.0, ry: this.u * 1.25 };
  }

  private makeFinger(hand: Hand, finger: Finger): FingerState {
    const palm = this.palms[hand];
    let home: Pt;
    let knuckle: Pt;
    if (finger === 'thumb') {
      const space = this.kb.keyCenter('Space')!;
      const dir = hand === 'left' ? -1 : 1;
      home = { x: space.x + dir * this.u * 1.15, y: space.y + this.u * 0.1 };
      knuckle = { x: palm.x - dir * palm.rx * 0.75, y: palm.y - palm.ry * 0.15 };
    } else {
      home = this.tipTarget(HOME_KEYS[hand][finger]);
      knuckle = { x: home.x + (palm.x - home.x) * 0.3, y: palm.y - palm.ry * 0.55 };
    }
    const width = this.u * (finger === 'pinky' ? 0.44 : finger === 'thumb' ? 0.56 : 0.52);
    return { hand, finger, home, knuckle, tip: { ...home }, width };
  }

  private moveTip(f: FingerState, to: Pt): void {
    this.scene.tweens.killTweensOf(f.tip);
    if (f.tip.x === to.x && f.tip.y === to.y) return this.redraw();
    this.scene.tweens.add({
      targets: f.tip,
      x: to.x,
      y: to.y,
      duration: 170,
      ease: 'Quad.easeOut',
      onUpdate: () => this.redraw(),
      onComplete: () => this.redraw(),
    });
  }

  private redraw(): void {
    const g = this.gfx;
    g.clear();
    for (const hand of ['left', 'right'] as const) {
      const p = this.palms[hand];
      g.fillStyle(GLOVE, 0.5);
      g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.lineStyle(3, 0xe0c39a, 0.7);
      g.strokeEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
    }
    // Resting fingers first, then the busy ones on top.
    const order = [...this.fingers].sort((a, b) => Number(this.busy.has(a)) - Number(this.busy.has(b)));
    for (const f of order) {
      const busy = this.busy.has(f);
      const quiet = this.busy.size > 0 && !busy;
      g.lineStyle(f.width, GLOVE, quiet ? 0.35 : 0.6);
      g.lineBetween(f.knuckle.x, f.knuckle.y, f.tip.x, f.tip.y);
      g.fillStyle(GLOVE, quiet ? 0.35 : 0.6);
      g.fillCircle(f.knuckle.x, f.knuckle.y, f.width / 2);
      this.drawFriend(f, busy, quiet);
    }
  }

  /** The fingertip buddy: a coloured ball with a face. */
  private drawFriend(f: FingerState, busy: boolean, quiet: boolean): void {
    const g = this.gfx;
    const r = this.u * (busy ? 0.3 : 0.21);
    const { x, y } = f.tip;
    const color = FINGER_COLORS[f.finger];
    const alpha = quiet ? 0.55 : 1;
    if (busy) {
      g.fillStyle(0xfff27a, 0.8);
      g.fillCircle(x, y, r * 1.35);
    }
    g.fillStyle(color, alpha);
    g.fillCircle(x, y, r);
    g.lineStyle(3, darken(color, 0.3), alpha);
    g.strokeCircle(x, y, r);
    // face
    const ex = r * 0.36;
    const ey = -r * 0.15;
    if (this.blinking === f) {
      g.lineStyle(Math.max(2, r * 0.12), INK, alpha);
      g.lineBetween(x - ex - r * 0.12, y + ey, x - ex + r * 0.12, y + ey);
      g.lineBetween(x + ex - r * 0.12, y + ey, x + ex + r * 0.12, y + ey);
    } else {
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x - ex, y + ey, r * 0.24);
      g.fillCircle(x + ex, y + ey, r * 0.24);
      g.fillStyle(INK, alpha);
      g.fillCircle(x - ex, y + ey + r * 0.04, r * 0.12);
      g.fillCircle(x + ex, y + ey + r * 0.04, r * 0.12);
    }
    g.lineStyle(Math.max(2, r * 0.1), INK, alpha);
    g.beginPath();
    g.arc(x, y + r * 0.12, r * 0.38, Phaser.Math.DegToRad(20), Phaser.Math.DegToRad(160), false);
    g.strokePath();
    g.fillStyle(0xff8fab, alpha * 0.7);
    g.fillCircle(x - r * 0.62, y + r * 0.22, r * 0.14);
    g.fillCircle(x + r * 0.62, y + r * 0.22, r * 0.14);
  }
}
