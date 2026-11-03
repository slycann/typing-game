import Phaser from 'phaser';
import type { AnimalKind } from '../save/types';
import { CRITTER_SIZE, critterSvg, JUNI, TORTOISE_SIZE, tortoiseSvg } from './critters';
import { OUTFIT_COLORS } from './palette';

const RESOLUTION = 2; // textures are drawn at 2x so they stay crisp when scaled up
const pending = new Map<string, Promise<void>>();

/** Rasterize an SVG string into a Phaser texture (once per key). */
export function svgTexture(scene: Phaser.Scene, key: string, svg: string, w: number, h: number): Promise<void> {
  if (scene.textures.exists(key)) return Promise.resolve();
  const existing = pending.get(key);
  if (existing) return existing;
  const sized = svg.replace('<svg ', `<svg width="${w * RESOLUTION}" height="${h * RESOLUTION}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  const img = new Image();
  const p = new Promise<void>((resolve, reject) => {
    img.onload = () => {
      if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
      URL.revokeObjectURL(url);
      pending.delete(key);
      resolve();
    };
    img.onerror = () => {
      pending.delete(key);
      reject(new Error(`Could not draw ${key}`));
    };
  });
  pending.set(key, p);
  img.src = url;
  return p;
}

export function critterKey(kind: AnimalKind, outfit: number): string {
  return `critter-${kind}-${outfit}`;
}

export function ensureCritter(scene: Phaser.Scene, kind: AnimalKind, outfit: number): Promise<void> {
  const color = OUTFIT_COLORS[outfit % OUTFIT_COLORS.length];
  return svgTexture(scene, critterKey(kind, outfit), critterSvg(kind, color), CRITTER_SIZE.w, CRITTER_SIZE.h);
}

/** An Image of a critter that fills in as soon as its texture is ready. Origin is at the feet. */
export function critterImage(scene: Phaser.Scene, x: number, y: number, kind: AnimalKind, outfit: number, scale = 1): Phaser.GameObjects.Image {
  const key = critterKey(kind, outfit);
  const img = scene.add.image(x, y, scene.textures.exists(key) ? key : '__WHITE').setOrigin(0.5, 0.97);
  img.setScale(scale / RESOLUTION);
  if (!scene.textures.exists(key)) {
    img.setVisible(false);
    void ensureCritter(scene, kind, outfit).then(() => {
      if (img.scene) img.setTexture(key).setVisible(true);
    });
  }
  return img;
}

export function setCritter(img: Phaser.GameObjects.Image, kind: AnimalKind, outfit: number): void {
  const key = critterKey(kind, outfit);
  void ensureCritter(img.scene, kind, outfit).then(() => {
    if (img.scene) img.setTexture(key).setVisible(true);
  });
}

/** Textures every scene can count on. */
export async function loadCoreTextures(scene: Phaser.Scene): Promise<void> {
  await Promise.all([
    svgTexture(scene, 'juni', critterSvg(JUNI.kind, JUNI.outfit, JUNI.fur), CRITTER_SIZE.w, CRITTER_SIZE.h),
    svgTexture(scene, 'qwerty', tortoiseSvg(), TORTOISE_SIZE.w, TORTOISE_SIZE.h),
  ]);
}

export function characterImage(scene: Phaser.Scene, key: 'juni' | 'qwerty', x: number, y: number, scale = 1): Phaser.GameObjects.Image {
  return scene.add.image(x, y, key).setOrigin(0.5, 0.97).setScale(scale / RESOLUTION);
}
