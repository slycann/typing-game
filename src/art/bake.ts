import Phaser from 'phaser';

// Phaser re-tessellates Graphics shapes every frame, which adds up fast with a whole keyboard on
// screen (and matters on older iPads). Anything that doesn't change shape is drawn once into a
// texture here and then shown as a cheap Image.

/** Draw once into a texture of the given size (0,0 is the top-left of the texture). Returns the key. */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): string {
  if (!scene.textures.exists(key)) {
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, Math.ceil(w), Math.ceil(h));
    g.destroy();
  }
  return key;
}

/** A vertical gradient texture (Graphics.generateTexture can't do gradients). */
export function gradient(scene: Phaser.Scene, key: string, w: number, h: number, stops: [number, number][]): string {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w, h)!;
    const ctx = tex.getContext();
    const grd = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) grd.addColorStop(at, '#' + color.toString(16).padStart(6, '0'));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }
  return key;
}

export function hex(color: number): string {
  return color.toString(16).padStart(6, '0');
}
