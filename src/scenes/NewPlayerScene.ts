import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { ANIMAL_NAMES, ANIMALS } from '../art/critters';
import { INK, INK_CSS, OUTFIT_COLORS, PALETTE, darken, lighten } from '../art/palette';
import { bunting, workshop } from '../art/scenery';
import { critterImage, ensureCritter, setCritter } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { keyboard, type KeyInputEvent } from '../input/KeyboardInput';
import type { AgeBand, AnimalKind } from '../save/types';
import { startSitting, store } from '../state';
import { Button } from '../ui/Button';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import { confetti, enterScene, goTo, onKeys } from './common';

type Step = 'animal' | 'color' | 'name' | 'age';

const AGE_BANDS: { band: AgeBand; label: string; color: number }[] = [
  { band: '5-6', label: '5 or 6', color: PALETTE.red },
  { band: '7-8', label: '7 or 8', color: PALETTE.blue },
  { band: '9-10', label: '9 or 10', color: PALETTE.green },
];

const MAX_NAME = 12;

/** Make a new player: pick a critter, a colour, type your name, and say how old you are. */
export class NewPlayerScene extends Phaser.Scene {
  private animal: AnimalKind = 'bunny';
  private outfit = 0;
  private name = '';
  private choice = 0;
  private stepObjects: Phaser.GameObjects.GameObject[] = [];
  private heading!: Phaser.GameObjects.Text;
  private onStepKey: ((e: KeyInputEvent) => void) | null = null;
  private saving = false;

  constructor() {
    super('NewPlayer');
  }

  create(): void {
    enterScene(this);
    music.play('title');
    this.animal = 'bunny';
    this.outfit = Phaser.Math.Between(0, OUTFIT_COLORS.length - 1);
    this.name = '';
    this.saving = false;
    workshop(this, 900);
    bunting(this, 30);
    this.heading = this.add
      .text(GAME_W / 2, 150, '', { fontFamily: FONT_TITLE, fontSize: '88px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 14, align: 'center' })
      .setOrigin(0.5);
    // Warm up every critter texture so choosing is instant.
    for (const a of ANIMALS) void ensureCritter(this, a, this.outfit);

    onKeys(this, (e) => {
      if (e.type !== 'down') return;
      if (e.code === 'Escape') return goTo(this, store.profiles.length ? 'ProfileSelect' : 'Title');
      this.onStepKey?.(e);
    });
    this.showStep('animal');
  }

  private clearStep(): void {
    for (const o of this.stepObjects) o.destroy();
    this.stepObjects = [];
    this.onStepKey = null;
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.stepObjects.push(o);
    return o;
  }

  private showStep(step: Step): void {
    this.clearStep();
    debug.info = { step };
    if (step === 'animal') this.animalStep();
    else if (step === 'color') this.colorStep();
    else if (step === 'name') this.nameStep();
    else this.ageStep();
  }

  private say(heading: string, spoken?: string): void {
    this.heading.setText(heading).setScale(0.7);
    this.tweens.add({ targets: this.heading, scale: 1, duration: 300, ease: 'Back.easeOut' });
    narrator.say(spoken ?? heading.replace('\n', ' '));
  }

  // ---- 1. Pick a critter ----------------------------------------------------------------
  private animalStep(): void {
    this.say('Pick your critter!', 'Pick your critter! Use the arrow keys, then press return.');
    this.choice = Math.max(0, ANIMALS.indexOf(this.animal));
    const xs = ANIMALS.map((_, i) => 360 + i * 300);
    const rugs = this.keep(this.add.graphics());
    const imgs = ANIMALS.map((a, i) => {
      const img = this.keep(critterImage(this, xs[i], 760, a, this.outfit, 0.95));
      img.setInteractive({ useHandCursor: true }).on('pointerdown', () => (this.choice === i ? this.confirmAnimal() : pick(i)));
      return img;
    });
    const labels = ANIMALS.map((a, i) =>
      this.keep(this.add.text(xs[i], 830, ANIMAL_NAMES[a], { fontFamily: FONT_TITLE, fontSize: '44px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 8 }).setOrigin(0.5)),
    );
    const pick = (i: number) => {
      this.choice = Phaser.Math.Wrap(i, 0, ANIMALS.length);
      sfx.key();
      rugs.clear();
      ANIMALS.forEach((_, k) => {
        const on = k === this.choice;
        rugs.fillStyle(on ? 0xfff27a : 0xffffff, on ? 1 : 0.35);
        rugs.fillEllipse(xs[k], 770, on ? 260 : 200, on ? 70 : 50);
        this.tweens.killTweensOf(imgs[k]);
        imgs[k].y = 760;
        imgs[k].setScale((on ? 1.15 : 0.95) / 2);
        labels[k].setScale(on ? 1.15 : 0.9);
        if (on) this.tweens.add({ targets: imgs[k], y: 720, duration: 260, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
      });
      narrator.say(ANIMAL_NAMES[ANIMALS[this.choice]]);
    };
    pick(this.choice);
    this.keep(new Button(this, GAME_W / 2, 980, 'Next', () => this.confirmAnimal(), { keyHint: 'return', color: PALETTE.green }));
    this.onStepKey = (e) => {
      if (e.code === 'ArrowRight') pick(this.choice + 1);
      else if (e.code === 'ArrowLeft') pick(this.choice - 1);
      else if (e.code === 'Enter') this.confirmAnimal();
    };
  }

  private confirmAnimal(): void {
    this.animal = ANIMALS[this.choice];
    sfx.select();
    this.showStep('color');
  }

  // ---- 2. Pick a colour -----------------------------------------------------------------
  private colorStep(): void {
    this.say('Pick a colour!', 'Now pick your favourite colour!');
    for (let i = 0; i < OUTFIT_COLORS.length; i++) void ensureCritter(this, this.animal, i);
    const preview = this.keep(critterImage(this, 520, 860, this.animal, this.outfit, 1.5));
    this.tweens.add({ targets: preview, angle: { from: -3, to: 3 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const cols = 4;
    const blobs = OUTFIT_COLORS.map((c, i) => {
      const x = 1000 + (i % cols) * 190;
      const y = 400 + Math.floor(i / cols) * 210;
      const g = this.keep(this.add.graphics({ x, y }));
      g.fillStyle(darken(c, 0.3), 1);
      g.fillCircle(4, 10, 78);
      g.fillStyle(c, 1);
      g.fillCircle(0, 0, 78);
      g.fillStyle(lighten(c, 0.5), 1);
      g.fillCircle(-26, -28, 18);
      g.setInteractive(new Phaser.Geom.Circle(0, 0, 80), Phaser.Geom.Circle.Contains);
      g.on('pointerdown', () => (this.choice === i ? this.confirmColor() : pick(i)));
      return g;
    });
    const ring = this.keep(this.add.graphics());
    const pick = (i: number) => {
      this.choice = Phaser.Math.Wrap(i, 0, OUTFIT_COLORS.length);
      this.outfit = this.choice;
      sfx.key();
      setCritter(preview, this.animal, this.outfit);
      const b = blobs[this.choice];
      ring.clear();
      ring.lineStyle(14, 0xfff27a, 1);
      ring.strokeCircle(b.x, b.y, 96);
      ring.lineStyle(5, INK, 0.6);
      ring.strokeCircle(b.x, b.y, 104);
      blobs.forEach((bl, k) => bl.setScale(k === this.choice ? 1.1 : 1));
    };
    pick(this.outfit);
    this.keep(new Button(this, 1290, 900, 'Next', () => this.confirmColor(), { keyHint: 'return', color: PALETTE.green }));
    this.onStepKey = (e) => {
      if (e.code === 'ArrowRight') pick(this.choice + 1);
      else if (e.code === 'ArrowLeft') pick(this.choice - 1);
      else if (e.code === 'ArrowDown') pick(this.choice + cols);
      else if (e.code === 'ArrowUp') pick(this.choice - cols);
      else if (e.code === 'Enter') this.confirmColor();
    };
  }

  private confirmColor(): void {
    sfx.select();
    this.showStep('name');
  }

  // ---- 3. Type your name ----------------------------------------------------------------
  private nameStep(): void {
    this.say('Type your name!', 'Type your name on the keyboard. Then press return!');
    const critter = this.keep(critterImage(this, 200, 1050, this.animal, this.outfit, 1.05));
    this.tweens.add({ targets: critter, scaleY: critter.scaleY * 1.04, duration: 800, yoyo: true, repeat: -1 });
    const plate = this.keep(this.add.graphics());
    plate.fillStyle(darken(PALETTE.purple, 0.3), 1);
    plate.fillRoundedRect(GAME_W / 2 - 480, 262, 960, 170, 50);
    plate.fillStyle(0xffffff, 1);
    plate.fillRoundedRect(GAME_W / 2 - 480, 250, 960, 170, 50);
    const nameText = this.keep(
      this.add.text(GAME_W / 2, 335, '', { fontFamily: FONT_BODY, fontSize: '110px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5),
    );
    const cursor = this.keep(this.add.rectangle(GAME_W / 2, 335, 10, 100, PALETTE.hotPink));
    this.tweens.add({ targets: cursor, alpha: 0, duration: 450, yoyo: true, repeat: -1 });
    this.keep(
      this.add.text(GAME_W / 2, 470, 'A grown-up can help!  delete fixes a mistake.', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 7, fontStyle: 'bold' }).setOrigin(0.5),
    );
    const kbW = 1240;
    const kb = this.keep(new OnScreenKeyboard(this, 520, GAME_H - OnScreenKeyboard.heightFor(kbW) - 30, { width: kbW }).attach(keyboard));
    debug.keyboard = kb;
    const refresh = () => {
      const shown = this.name.length ? this.name[0].toUpperCase() + this.name.slice(1) : '';
      nameText.setText(shown);
      cursor.x = GAME_W / 2 + nameText.width / 2 + 14;
      kb.setTargets(this.name.trim().length ? ['Enter'] : []);
      debug.info = { step: 'name', name: shown };
    };
    refresh();
    this.onStepKey = (e) => {
      if (e.code === 'Backspace') {
        if (this.name.length) {
          this.name = this.name.slice(0, -1);
          sfx.oops();
        }
      } else if (e.code === 'Enter') {
        if (this.name.trim().length) return this.confirmName();
        sfx.oops();
      } else if (e.char && /^[\p{L} '-]$/u.test(e.char) && this.name.length < MAX_NAME) {
        if (e.char === ' ' && (!this.name.length || this.name.endsWith(' '))) return;
        this.name += e.char;
        sfx.good(this.name.length);
        kb.sparkle(e.code);
        narrator.say(narrator.nameOf(e.char.toLowerCase()));
      }
      refresh();
    };
  }

  private confirmName(): void {
    sfx.select();
    const shown = this.name.trim();
    narrator.say(`Hi ${shown}!`);
    this.showStep('age');
  }

  // ---- 4. How old are you? ----------------------------------------------------------------
  private ageStep(): void {
    this.say('How old are you?');
    this.keep(critterImage(this, 260, 1000, this.animal, this.outfit, 1.1));
    const balloons = AGE_BANDS.map((a, i) => {
      const x = 700 + i * 420;
      const g = this.keep(this.add.graphics({ x, y: 560 }));
      g.lineStyle(5, 0xffffff, 1);
      g.lineBetween(0, 140, 0, 330);
      g.fillStyle(darken(a.color, 0.3), 1);
      g.fillEllipse(6, 8, 270, 310);
      g.fillStyle(a.color, 1);
      g.fillEllipse(0, 0, 270, 310);
      g.fillStyle(lighten(a.color, 0.5), 1);
      g.fillEllipse(-60, -80, 50, 80);
      g.fillTriangle(-16, 166, 16, 166, 0, 146);
      const t = this.keep(this.add.text(x, 560, a.label, { fontFamily: FONT_TITLE, fontSize: '76px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 10 }).setOrigin(0.5));
      g.setInteractive(new Phaser.Geom.Ellipse(0, 0, 270, 310), Phaser.Geom.Ellipse.Contains);
      g.on('pointerdown', () => this.finish(a.band));
      this.tweens.add({ targets: [g, t], y: '-=24', duration: 1100 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { g, t };
    });
    const pick = (i: number) => {
      this.choice = Phaser.Math.Wrap(i, 0, AGE_BANDS.length);
      sfx.key();
      balloons.forEach((b, k) => {
        b.g.setScale(k === this.choice ? 1.12 : 0.92);
        b.t.setScale(k === this.choice ? 1.12 : 0.92);
      });
    };
    pick(1);
    this.keep(this.add.text(GAME_W / 2, 960, '← → then return', { fontFamily: FONT_BODY, fontSize: '40px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 8, fontStyle: 'bold' }).setOrigin(0.5));
    this.onStepKey = (e) => {
      if (e.code === 'ArrowRight') pick(this.choice + 1);
      else if (e.code === 'ArrowLeft') pick(this.choice - 1);
      else if (e.code === 'Enter') this.finish(AGE_BANDS[this.choice].band);
    };
  }

  private async finish(ageBand: AgeBand): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.onStepKey = null;
    sfx.cheer();
    confetti(this, GAME_W / 2, 400, 90);
    const profile = await store.createProfile({ name: this.name, animal: this.animal, outfit: this.outfit, ageBand });
    startSitting(profile.id);
    this.time.delayedCall(900, () => goTo(this, 'Story'));
  }
}
