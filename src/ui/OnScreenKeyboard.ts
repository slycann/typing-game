import Phaser from 'phaser';
import { bake, hex } from '../art/bake';
import { FINGER_COLORS, INK, INK_CSS, darken, lighten } from '../art/palette';
import { FONT_BODY, FONT_TITLE } from '../config';
import type { KeyboardInput } from '../input/KeyboardInput';
import { KEYBOARD_HEIGHT_UNITS, KEYBOARD_WIDTH_UNITS, LAYOUT, type PlacedKey } from '../input/keyLayout';

export interface KeyboardOptions {
  width: number;
  /** Colour keys by the finger that presses them. */
  colorful?: boolean;
  /** Print letters on the keycaps. Turning this off is the "ghost keyboard" for practised keys. */
  labels?: boolean;
}

interface KeyView {
  def: PlacedKey;
  root: Phaser.GameObjects.Container; // centred on the key, used for wobble
  base: Phaser.GameObjects.Image;
  cap: Phaser.GameObjects.Container; // moves down when pressed
  capImg: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  labels: Phaser.GameObjects.Text[];
  w: number;
  h: number;
  down: boolean;
}

const STAR_COLORS = [0xffd23f, 0xff8fab, 0x7ee8fa, 0xffffff, 0xb5f57a];
const PAD = 3; // room for outlines in baked textures

/** A Mac keyboard drawn on screen that mirrors the real one key for key. */
export class OnScreenKeyboard extends Phaser.GameObjects.Container {
  readonly unit: number;
  readonly kbWidth: number;
  readonly kbHeight: number;
  private views = new Map<string, KeyView>();
  private targets = new Set<string>();
  private glowTween: Phaser.Tweens.Tween | null = null;
  private glowLevel = { a: 1 };
  private unsubscribe: (() => void) | null = null;
  private colorful: boolean;
  private showLabels: boolean;
  private depthPx: number;
  private radius: number;

  static heightFor(width: number): number {
    return (width / KEYBOARD_WIDTH_UNITS) * KEYBOARD_HEIGHT_UNITS;
  }

  /** (x, y) is the top-left corner of the keys. */
  constructor(scene: Phaser.Scene, x: number, y: number, opts: KeyboardOptions) {
    super(scene, x, y);
    this.kbWidth = opts.width;
    this.unit = opts.width / KEYBOARD_WIDTH_UNITS;
    this.kbHeight = this.unit * KEYBOARD_HEIGHT_UNITS;
    this.colorful = opts.colorful ?? true;
    this.showLabels = opts.labels ?? true;
    this.depthPx = Math.max(4, Math.round(this.unit * 0.09));
    this.radius = Math.round(this.unit * 0.16);

    this.add(this.makeBody());
    for (const def of LAYOUT) this.addKey(def);
    scene.add.existing(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.unsubscribe?.();
      this.glowTween?.remove();
    });
  }

  /** Mirror a real keyboard: keys go down and come back up as they are pressed. */
  attach(input: KeyboardInput): this {
    this.unsubscribe?.();
    this.unsubscribe = input.on((e) => {
      if (e.type === 'down' && !e.repeat) this.press(e.code);
      else if (e.type === 'up') this.release(e.code);
    });
    return this;
  }

  press(code: string): void {
    const v = this.views.get(code);
    if (!v || v.down) return;
    v.down = true;
    this.scene.tweens.killTweensOf(v.cap);
    this.scene.tweens.add({ targets: v.cap, y: this.depthPx, duration: 50, ease: 'Quad.easeOut' });
    this.paint(v);
  }

  release(code: string): void {
    const v = this.views.get(code);
    if (!v || !v.down) return;
    v.down = false;
    this.scene.tweens.killTweensOf(v.cap);
    this.scene.tweens.add({ targets: v.cap, y: 0, duration: 160, ease: 'Back.easeOut' });
    this.paint(v);
  }

  pressedCodes(): string[] {
    return [...this.views.values()].filter((v) => v.down).map((v) => v.def.code);
  }

  /** Make the key(s) to press next glow. */
  setTargets(codes: Iterable<string>): void {
    const next = new Set(codes);
    for (const code of this.targets) if (!next.has(code)) this.views.get(code)?.glow.setVisible(false);
    this.targets = next;
    for (const code of next) this.views.get(code)?.glow.setVisible(true).setAlpha(this.glowLevel.a);
    if (next.size && !this.glowTween) {
      this.glowTween = this.scene.tweens.add({
        targets: this.glowLevel,
        a: 0.25,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          for (const c of this.targets) this.views.get(c)?.glow.setAlpha(this.glowLevel.a);
        },
      });
    }
  }

  getTargets(): string[] {
    return [...this.targets];
  }

  setHints(opts: { colorful?: boolean; labels?: boolean }): void {
    if (opts.colorful !== undefined) this.colorful = opts.colorful;
    if (opts.labels !== undefined) this.showLabels = opts.labels;
    for (const v of this.views.values()) {
      this.paint(v);
      for (const t of v.labels) t.setVisible(this.showLabels || v.def.kind !== 'char');
    }
  }

  /** Centre of a key in this container's coordinates. */
  keyCenter(code: string): { x: number; y: number; w: number; h: number } | null {
    const v = this.views.get(code);
    if (!v) return null;
    return { x: v.root.x, y: v.root.y, w: v.w, h: v.h };
  }

  /** Centre of a key in scene coordinates. */
  keyWorld(code: string): { x: number; y: number } | null {
    const c = this.keyCenter(code);
    if (!c) return null;
    const m = this.getWorldTransformMatrix();
    return { x: m.tx + c.x * m.a, y: m.ty + c.y * m.d };
  }

  /** Happy burst of stars from a key. */
  sparkle(code: string): void {
    const c = this.keyCenter(code);
    if (!c) return;
    const size = Math.round(this.unit * 0.34);
    for (let i = 0; i < 7; i++) {
      const color = STAR_COLORS[i % STAR_COLORS.length];
      const key = bake(this.scene, `star-${hex(color)}-${size}`, size, size, (g) => {
        g.fillStyle(color, 1);
        drawStar(g, size / 2, size / 2, 5, size / 2, size / 4.4);
      });
      const star = this.scene.add.image(c.x, c.y, key);
      this.add(star);
      const ang = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const dist = this.unit * (0.8 + Math.random() * 0.5);
      this.scene.tweens.add({
        targets: star,
        x: c.x + Math.cos(ang) * dist,
        y: c.y + Math.sin(ang) * dist - this.unit * 0.3,
        angle: 180,
        alpha: 0,
        scale: 0.4,
        duration: 520,
        ease: 'Cubic.easeOut',
        onComplete: () => star.destroy(),
      });
    }
  }

  /** Gentle "not that one" wiggle with a soft pink flash. */
  wobble(code: string): void {
    const v = this.views.get(code);
    if (!v) return;
    this.scene.tweens.killTweensOf(v.root);
    v.root.setAngle(0);
    this.scene.tweens.add({ targets: v.root, angle: { from: -7, to: 7 }, duration: 60, yoyo: true, repeat: 2, onComplete: () => v.root.setAngle(0) });
    const key = bake(this.scene, `kbflash-${v.w}x${v.h}`, v.w, v.h, (g) => {
      g.fillStyle(0xff8fab, 0.7);
      g.fillRoundedRect(0, 0, v.w, v.h, this.radius);
    });
    const flash = this.scene.add.image(0, 0, key);
    v.cap.add(flash);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
  }

  private makeBody(): Phaser.GameObjects.Image {
    const pad = Math.round(this.unit * 0.28);
    const r = this.unit * 0.45;
    const w = Math.round(this.kbWidth + pad * 2);
    const h = Math.round(this.kbHeight + pad * 2);
    const lip = Math.round(this.unit * 0.14);
    const key = bake(this.scene, `kbbody-${w}x${h}`, w, h + lip, (g) => {
      g.fillStyle(0x5a46c9, 1);
      g.fillRoundedRect(0, lip, w, h, r);
      g.fillStyle(0x8f7cf7, 1);
      g.fillRoundedRect(0, 0, w, h, r);
      g.fillStyle(0xa99bff, 1);
      g.fillRoundedRect(6, 6, w - 12, this.unit * 0.18, r * 0.5);
    });
    return this.scene.add.image(-pad, -pad, key).setOrigin(0, 0);
  }

  private addKey(def: PlacedKey): void {
    const gap = this.unit * 0.09;
    const w = Math.round(def.w * this.unit - gap);
    const h = Math.round(def.h * this.unit - gap);
    const cx = def.x * this.unit + (def.w * this.unit) / 2;
    const cy = def.y * this.unit + (def.h * this.unit) / 2;
    const root = this.scene.add.container(cx, cy);
    const base = this.scene.add.image(0, this.depthPx, '__WHITE');
    const cap = this.scene.add.container(0, 0);
    const capImg = this.scene.add.image(0, 0, '__WHITE');
    const glowW = Math.round(this.unit * 0.14);
    const glowKey = bake(this.scene, `kbglow-${w}x${h}`, w + glowW * 2 + 8, h + glowW * 2 + 8, (g) => {
      const o = glowW + 4;
      g.lineStyle(this.unit * 0.12, 0xfff27a, 1);
      g.strokeRoundedRect(o - 4, o - 4, w + 8, h + 8, this.radius + 4);
      g.lineStyle(this.unit * 0.05, 0xff5fa2, 1);
      g.strokeRoundedRect(o - 4, o - 4, w + 8, h + 8, this.radius + 4);
    });
    const glow = this.scene.add.image(0, 0, glowKey).setVisible(false);

    const labels = this.makeLabels(def, w, h);
    cap.add([capImg, ...labels]);
    if (def.homeBump) {
      const bw = Math.round(this.unit * 0.26);
      const bh = Math.max(3, Math.round(this.unit * 0.05));
      const bumpKey = bake(this.scene, `kbbump-${bw}x${bh}`, bw, bh, (g) => {
        g.fillStyle(INK, 0.55);
        g.fillRoundedRect(0, 0, bw, bh, 2);
      });
      cap.add(this.scene.add.image(0, h * 0.3 + bh / 2, bumpKey));
    }
    root.add([base, cap, glow]);
    this.add(root);
    const view: KeyView = { def, root, base, cap, capImg, glow, labels, w, h, down: false };
    this.views.set(def.code, view);
    this.paint(view);
  }

  private makeLabels(def: PlacedKey, w: number, h: number): Phaser.GameObjects.Text[] {
    const u = this.unit;
    if (def.kind === 'char' && def.code !== 'Space') {
      if (def.shiftLabel) {
        return [
          this.scene.add.text(0, -h * 0.2, def.shiftLabel, { fontFamily: FONT_BODY, fontSize: `${Math.round(u * 0.26)}px`, color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5),
          this.scene.add.text(0, h * 0.18, def.label, { fontFamily: FONT_BODY, fontSize: `${Math.round(u * 0.3)}px`, color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5),
        ];
      }
      return [this.scene.add.text(0, -h * 0.04, def.label, { fontFamily: FONT_TITLE, fontSize: `${Math.round(u * 0.44)}px`, color: INK_CSS }).setOrigin(0.5)];
    }
    const text = def.code === 'Space' ? 'space' : def.label;
    const size = def.h < 1 ? u * 0.2 : u * 0.19;
    const t = this.scene.add.text(0, 0, text, { fontFamily: FONT_BODY, fontSize: `${Math.round(size)}px`, color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5);
    if (def.h >= 1 && def.code !== 'Space') t.setPosition(-w / 2 + u * 0.12, h / 2 - u * 0.14).setOrigin(0, 1);
    return [t];
  }

  private capColor(def: PlacedKey): number {
    if (def.kind === 'char' || def.code === 'Space') {
      return this.colorful ? lighten(FINGER_COLORS[def.finger], 0.38) : 0xfff4dc;
    }
    return 0xe4ddff;
  }

  private paint(v: KeyView): void {
    const color = this.capColor(v.def);
    const { w, h } = v;
    const r = this.radius;
    const baseColor = darken(color, 0.35);
    v.base.setTexture(
      bake(this.scene, `kbbase-${w}x${h}-${hex(baseColor)}`, w + PAD * 2, h + PAD * 2, (g) => {
        g.fillStyle(baseColor, 1);
        g.fillRoundedRect(PAD, PAD, w, h, r);
      }),
    );
    const fill = v.down ? lighten(color, 0.35) : color;
    v.capImg.setTexture(
      bake(this.scene, `kbcap-${w}x${h}-${hex(color)}-${v.down ? 1 : 0}`, w + PAD * 2, h + PAD * 2, (g) => {
        g.fillStyle(fill, 1);
        g.fillRoundedRect(PAD, PAD, w, h, r);
        g.fillStyle(0xffffff, v.down ? 0.1 : 0.35);
        g.fillRoundedRect(PAD + w * 0.08, PAD + h * 0.06, w * 0.84, h * 0.16, r * 0.6);
        g.lineStyle(Math.max(2, this.unit * 0.03), darken(color, 0.2), 1);
        g.strokeRoundedRect(PAD, PAD, w, h, r);
      }),
    );
  }
}

export function drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, points: number, outer: number, inner: number): void {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * rad, y + Math.sin(a) * rad));
  }
  g.fillPoints(pts, true);
}
