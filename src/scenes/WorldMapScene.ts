import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Grumble } from '../art/Grumble';
import { INK, INK_CSS, PALETTE, darken, lighten } from '../art/palette';
import { cloud, flower, hills, sky, sun, tree } from '../art/scenery';
import { critterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { COMING_SOON, GAME_NAMES, GAME_SCENES, WORLDS, type LevelDef } from '../curriculum/worlds';
import { debug } from '../debug';
import { currentLevelIndex, isLevelUnlocked, totalStars } from '../engine/Progress';
import type { Profile } from '../save/types';
import { currentProfile } from '../state';
import { Button } from '../ui/Button';
import { ProfileBadge } from '../ui/Hud';
import { drawStar } from '../ui/OnScreenKeyboard';
import { enterScene, goTo, onKeys } from './common';

interface Stop {
  x: number;
  y: number;
  level: LevelDef | null; // null = Grandpa Qwerty's Workshop
  node: Phaser.GameObjects.Container;
}

const POSITIONS: [number, number][] = [
  [180, 390], [520, 390], [820, 390], [1120, 390], [1420, 390], [1720, 390],
  [1720, 610], [1420, 610], [1120, 610], [820, 610], [520, 610],
  [520, 830], [900, 830],
];
const SIGN: [number, number] = [1150, 830];
const NODE_COLORS = { fingerFitness: PALETTE.orange, keyHop: PALETTE.green, bubblePop: PALETTE.blue, boss: PALETTE.purple } as const;

/** Home Row Meadow: a winding path of levels. Arrow keys walk your critter; return plays. */
export class WorldMapScene extends Phaser.Scene {
  private profile!: Profile;
  private stops: Stop[] = [];
  private sel = 0;
  private avatar!: Phaser.GameObjects.Image;
  private card!: Phaser.GameObjects.Container;
  private hopping = false;

  constructor() {
    super('WorldMap');
  }

  create(data: { focus?: number }): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) {
      this.scene.start('ProfileSelect');
      return;
    }
    this.profile = p;
    this.stops = [];
    this.hopping = false;
    const world = WORLDS[0];

    sky(this);
    sun(this, 1790, 110, 60);
    cloud(this, 620, 120, 0.6);
    cloud(this, 1250, 90, 0.5);
    hills(this, 150);
    tree(this, 90, 560, 0.8);
    tree(this, 1850, 700, 0.9, 0x5fd35f);
    tree(this, 1100, 960, 0.7);
    [[300, 440, PALETTE.pink], [900, 430, PALETTE.yellow], [1500, 680, PALETTE.purple], [620, 700, PALETTE.red], [1180, 680, PALETTE.blue], [260, 990, PALETTE.yellow]].forEach(([x, y, c]) =>
      flower(this, x, y, c, 0.8),
    );
    this.drawPath();

    this.add
      .text(GAME_W / 2, 70, world.name, { fontFamily: FONT_TITLE, fontSize: '76px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 })
      .setOrigin(0.5);
    new ProfileBadge(this, this.profile);
    new Button(this, GAME_W - 130, 70, 'Home', () => goTo(this, 'ProfileSelect'), { width: 210, height: 92, fontSize: 40, color: PALETTE.teal });
    this.add
      .text(GAME_W - 260, 70, `★ ${totalStars(this.profile)}`, { fontFamily: FONT_TITLE, fontSize: '48px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 9 })
      .setOrigin(1, 0.5);

    const all: (LevelDef | null)[] = [null, ...world.levels];
    all.forEach((level, i) => {
      const [x, y] = POSITIONS[i];
      this.stops.push({ x, y, level, node: this.makeNode(level, x, y, i) });
    });
    this.makeSign();

    this.sel = Phaser.Math.Clamp(data?.focus ?? currentLevelIndex(this.profile, 1) + 1, 0, this.stops.length - 1);
    const s = this.stops[this.sel];
    this.avatar = critterImage(this, s.x, s.y - 30, this.profile.animal, this.profile.outfit, 0.62).setDepth(50);
    this.tweens.add({ targets: this.avatar, scaleY: this.avatar.scaleY * 1.04, duration: 700, yoyo: true, repeat: -1 });
    this.card = this.add.container(1560, 975).setDepth(60);
    this.showCard();
    this.time.delayedCall(400, () => narrator.say(`${world.name}! Use the arrow keys to pick a level, then press return.`));

    onKeys(this, (e) => {
      if (e.type !== 'down') return;
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') this.move(1);
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') this.move(-1);
      else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) this.enter();
      else if (e.code === 'Escape') goTo(this, 'ProfileSelect');
    });
  }

  private unlocked(i: number): boolean {
    const l = this.stops[i].level;
    return !l || isLevelUnlocked(this.profile, l);
  }

  private move(dir: number): void {
    if (this.hopping) return;
    const next = this.sel + dir;
    if (next < 0 || next >= this.stops.length) return;
    if (!this.unlocked(next)) {
      sfx.oops();
      this.tweens.add({ targets: this.avatar, x: this.avatar.x + 12 * dir, duration: 70, yoyo: true, repeat: 1 });
      narrator.say(`That one is locked. Get a star on level ${this.stops[next - 1].level?.name ?? ''} first!`);
      return;
    }
    this.sel = next;
    this.hopping = true;
    sfx.key();
    const s = this.stops[next];
    const midY = Math.min(this.avatar.y, s.y - 30) - 90;
    this.tweens.add({ targets: this.avatar, x: s.x, duration: 260, ease: 'Linear' });
    this.tweens.add({
      targets: this.avatar,
      y: midY,
      duration: 130,
      ease: 'Quad.easeOut',
      onComplete: () =>
        this.tweens.add({
          targets: this.avatar,
          y: s.y - 30,
          duration: 130,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.hopping = false;
            this.showCard();
          },
        }),
    });
    const prev = this.stops[next - dir];
    if (s.x !== prev.x) this.avatar.setFlipX(s.x < prev.x); // face the way we're hopping
  }

  private enter(): void {
    const s = this.stops[this.sel];
    if (!this.unlocked(this.sel)) return;
    sfx.select();
    narrator.stop();
    if (!s.level) goTo(this, 'Workshop');
    else goTo(this, GAME_SCENES[s.level.game], { levelId: s.level.id });
  }

  private showCard(): void {
    const s = this.stops[this.sel];
    this.card.removeAll(true);
    const w = 680;
    const h = 190;
    const key = bake(this, 'map-card', w, h + 12, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 12, w, h, 44);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, w, h, 44);
    });
    this.card.add(this.add.image(0, 0, key).setOrigin(0.5, h / 2 / (h + 12)));
    let title: string;
    let sub: string;
    let spoken: string;
    if (!s.level) {
      title = "Grandpa Qwerty's Workshop";
      sub = 'Warm up your fingers!';
      spoken = "Grandpa Qwerty's Workshop. Warm up your fingers!";
    } else {
      const l = s.level;
      title = `${l.name}  ${GAME_NAMES[l.game]}`;
      sub = l.content === 'words' ? 'Home row words' : l.newKeys.length ? `New keys: ${l.newKeys.map((k) => k.toUpperCase()).join(' ')}` : 'Practice time';
      spoken = `Level ${l.name}. ${GAME_NAMES[l.game]}.`;
    }
    this.card.add(this.add.text(-w / 2 + 40, -60, title, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0, 0.5));
    this.card.add(this.add.text(-w / 2 + 40, 4, sub, { fontFamily: FONT_BODY, fontSize: '36px', color: '#7a5fc0', fontStyle: 'bold' }).setOrigin(0, 0.5));
    const go = this.add.text(-w / 2 + 40, 66, 'Press return to play!', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ff5fa2', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.card.add(go);
    this.tweens.add({ targets: go, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    narrator.say(spoken);
    debug.info = { selected: this.sel, level: s.level?.id ?? 'workshop' };
  }

  private makeNode(level: LevelDef | null, x: number, y: number, i: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y).setDepth(10);
    const open = !level || isLevelUnlocked(this.profile, level);
    if (!level) {
      const key = bake(this, 'map-house', 180, 170, (g) => {
        g.fillStyle(darken(PALETTE.peach, 0.3), 1);
        g.fillRoundedRect(30, 70, 120, 100, 14);
        g.fillStyle(PALETTE.peach, 1);
        g.fillRoundedRect(30, 64, 120, 100, 14);
        g.fillStyle(PALETTE.red, 1);
        g.fillTriangle(10, 74, 170, 74, 90, 4);
        g.fillStyle(0xa96e43, 1);
        g.fillRoundedRect(74, 104, 34, 60, { tl: 16, tr: 16, bl: 0, br: 0 });
        g.fillStyle(PALETTE.skyTop, 1);
        g.fillCircle(52, 104, 14);
        g.fillCircle(128, 104, 14);
      });
      c.add(this.add.image(0, -20, key));
      return c;
    }
    const boss = level.game === 'boss';
    const r = boss ? 78 : 62;
    const color = open ? NODE_COLORS[level.game] : 0xb9b3c9;
    const key = bake(this, `map-node-${level.game}-${open ? 1 : 0}`, r * 2 + 8, r * 2 + 18, (g) => {
      g.fillStyle(darken(color, 0.3), 1);
      g.fillCircle(r + 4, r + 14, r);
      g.fillStyle(color, 1);
      g.fillCircle(r + 4, r + 4, r);
      g.fillStyle(lighten(color, 0.4), 1);
      g.fillCircle(r + 4 - r * 0.35, r + 4 - r * 0.35, r * 0.22);
    });
    c.add(this.add.image(0, 0, key));
    if (boss) {
      const gr = new Grumble(this, 0, -20, 0.36);
      const beaten = (this.profile.stars[level.id] ?? 0) > 0;
      gr.restMood = beaten ? 'happy' : 'grumpy';
      gr.setMood(gr.restMood);
      c.add(gr);
    } else {
      c.add(this.add.text(0, 0, String(level.index + 1), { fontFamily: FONT_TITLE, fontSize: '58px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 9 }).setOrigin(0.5));
    }
    if (!open) {
      const lock = bake(this, 'map-lock', 64, 70, (g) => {
        g.lineStyle(9, INK, 1);
        g.beginPath();
        g.arc(32, 30, 17, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(PALETTE.yellow, 1);
        g.fillRoundedRect(6, 28, 52, 40, 10);
        g.fillStyle(INK, 1);
        g.fillCircle(32, 46, 6);
      });
      c.add(this.add.image(r * 0.6, r * 0.5, lock));
    } else {
      const got = this.profile.stars[level.id] ?? 0;
      for (let k = 0; k < 3; k++) {
        const on = k < got;
        const sk = bake(this, `map-star-${on ? 1 : 0}`, 44, 44, (g) => {
          g.fillStyle(INK, 0.3);
          drawStar(g, 22, 24, 5, 20, 9);
          g.fillStyle(on ? PALETTE.yellow : 0xffffff, 1);
          drawStar(g, 22, 22, 5, 20, 9);
        });
        c.add(this.add.image((k - 1) * 42, r + 26, sk));
      }
    }
    // Levels pop in one after another.
    c.setScale(0);
    this.tweens.add({ targets: c, scale: 1, delay: 40 * i, duration: 300, ease: 'Back.easeOut' });
    return c;
  }

  /** An arrow-shaped sign at the end of the path pointing to the next (not yet built) world. */
  private makeSign(): void {
    const [x, y] = SIGN;
    const key = bake(this, 'map-sign', 300, 100, (g) => {
      g.fillStyle(darken(0xffd6a5, 0.25), 1);
      g.fillRoundedRect(0, 10, 250, 86, 20);
      g.fillTriangle(240, 10, 240, 96, 296, 53);
      g.fillStyle(0xffd6a5, 1);
      g.fillRoundedRect(0, 4, 250, 86, 20);
      g.fillTriangle(240, 4, 240, 90, 296, 47);
    });
    this.add.image(x - 10, y, key).setOrigin(0, 0.5).setDepth(5);
    this.add
      .text(x + 120, y - 2, `${COMING_SOON[0]}
coming soon!`, { fontFamily: FONT_BODY, fontSize: '27px', color: INK_CSS, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5)
      .setDepth(6);
  }

  private drawPath(): void {
    const pts = [...POSITIONS, SIGN];
    const key = bake(this, 'map-path', 1920, 1080, (g) => {
      for (const [w, color] of [[64, 0xd9a86a], [46, 0xf6dba8]] as const) {
        g.lineStyle(w, color, 1);
        for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
        g.fillStyle(color, 1);
        for (const [x, y] of pts) g.fillCircle(x, y, w / 2);
      }
      g.fillStyle(0xe8c48a, 1);
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = pts[i - 1];
        const [x2, y2] = pts[i];
        const n = Math.floor(Math.hypot(x2 - x1, y2 - y1) / 50);
        for (let k = 1; k < n; k++) g.fillCircle(x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n, 5);
      }
    });
    this.add.image(0, 0, key).setOrigin(0, 0);
  }
}
