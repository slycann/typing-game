import Phaser from 'phaser';
import type { AnimalKind, Profile } from '../save/types';
import { itemById } from '../shop/catalog';
import { CRITTER_SIZE } from './critters';
import { itemImage } from './items';
import { critterImage, setCritter } from './textures';

export interface AvatarLook {
  animal: AnimalKind;
  outfit: number;
  wearing?: Profile['wearing'];
}

// Where accessories sit on each critter, in critter-SVG units: hat (bottom middle + tilt), back eye.
const HAT_AT: Record<AnimalKind, [number, number, number]> = {
  bunny: [128, 66, -6],
  puppy: [128, 62, -4],
  kitten: [136, 68, 0],
  bear: [126, 62, -4],
  duckling: [138, 58, 0],
};
const EYE_AT: Record<AnimalKind, [number, number]> = {
  bunny: [154, 98],
  puppy: [152, 98],
  kitten: [152, 98],
  bear: [150, 96],
  duckling: [150, 96],
};
const FEET_Y = CRITTER_SIZE.h * 0.97;

/** The player's critter wearing what they bought, with their pet beside them. Origin at the feet. */
export class Avatar extends Phaser.GameObjects.Container {
  private critter!: Phaser.GameObjects.Image;
  private extras: Phaser.GameObjects.GameObject[] = [];
  private look: AvatarLook;

  constructor(scene: Phaser.Scene, x: number, y: number, look: AvatarLook, private s = 1, private withPet = true) {
    super(scene, x, y);
    this.look = look;
    this.critter = critterImage(scene, 0, 0, look.animal, look.outfit, s);
    this.add(this.critter);
    this.dress();
    scene.add.existing(this);
  }

  setLook(look: AvatarLook): void {
    this.look = look;
    setCritter(this.critter, look.animal, look.outfit);
    this.dress();
  }

  /** Face left or right (critters are drawn facing right). */
  face(left: boolean): void {
    this.scaleX = Math.abs(this.scaleX) * (left ? -1 : 1);
  }

  private at(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - CRITTER_SIZE.w / 2) * this.s, y: (sy - FEET_Y) * this.s };
  }

  private dress(): void {
    for (const e of this.extras) e.destroy();
    this.extras = [];
    const w = this.look.wearing;
    if (!w) return;
    const { animal } = this.look;
    if (w.glasses) {
      const p = this.at(...EYE_AT[animal]);
      const g = itemImage(this.scene, w.glasses, p.x, p.y, this.s);
      this.add(g);
      this.extras.push(g);
    }
    if (w.hat) {
      const [hx, hy, tilt] = HAT_AT[animal];
      const p = this.at(hx, hy);
      const h = itemImage(this.scene, w.hat, p.x, p.y, this.s).setAngle(tilt);
      this.add(h);
      this.extras.push(h);
    }
    if (w.pet && this.withPet && itemById(w.pet).kind === 'pet') {
      const pet = itemImage(this.scene, w.pet, 150 * this.s, 0, this.s * 0.9);
      this.addAt(pet, 0);
      this.extras.push(pet);
      const flying = w.pet === 'butterfly';
      this.scene.tweens.add({
        targets: pet,
        y: flying ? -60 * this.s : -8 * this.s,
        duration: flying ? 900 : 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
