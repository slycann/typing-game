import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Grumble } from '../art/Grumble';
import { INK, INK_CSS, PALETTE, darken, lighten } from '../art/palette';
import { backdrop, decorate, themeFor } from '../art/themes';
import { Avatar } from '../art/Avatar';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { GAME_NAMES, GAME_SCENES, LAST_WORLD, worldById, type LevelDef, type WorldDef } from '../curriculum/worlds';
import { debug } from '../debug';
import { DAILY_TASKS, dailyDone, lastWeek } from '../engine/Daily';
import { currentLevelIndex, furthestWorld, isLevelUnlocked, isWorldUnlocked, totalStars } from '../engine/Progress';
import { bloomTexture } from '../art/blooms';
import { itemImage } from '../art/items';
import { Letterling } from '../art/Letterling';
import type { Profile } from '../save/types';
import { currentProfile, session } from '../state';
import { Button } from '../ui/Button';
import { ProfileBadge } from '../ui/Hud';
import { timeIsUp } from '../settings';
import { SoundToggle } from '../ui/SoundToggle';
import { drawStar } from '../ui/OnScreenKeyboard';
import { enterScene, goTo, onKeys } from './common';

interface Stop {
  x: number;
  y: number;
  level: LevelDef | null; // null = Grandpa Qwerty's Workshop (or the portal)
  /** The world a portal at the end of the path leads to. */
  portal?: number;
  node: Phaser.GameObjects.Container;
}

const POSITIONS: [number, number][] = [
  [180, 390], [520, 390], [820, 390], [1120, 390], [1420, 390], [1720, 390],
  [1720, 610], [1420, 610], [1120, 610], [820, 610], [520, 610],
  [520, 830], [900, 830],
];
const SIGN: [number, number] = [1150, 830];
const NODE_COLORS = {
  fingerFitness: PALETTE.orange,
  keyHop: PALETTE.green,
  bubblePop: PALETTE.blue,
  fruitCatch: PALETTE.red,
  wordTrain: PALETTE.teal,
  bakeShop: PALETTE.hotPink,
  storyPages: 0x7a5fc0,
  boss: PALETTE.purple,
} as const;
// Scenery spots chosen to stay clear of the path, the dock and the info card.
const DECOR_SPOTS: [number, number, number][] = [[70, 560, 0.8], [1860, 720, 0.85], [1080, 1000, 0.6]];

/** Places to visit besides levels: press 1–5 (or click). */
const DOCK = [
  { scene: 'PracticeGarden', label: 'Garden', color: PALETTE.green },
  { scene: 'SpeedRace', label: 'Race', color: PALETTE.red },
  { scene: 'Shop', label: 'Shop', color: PALETTE.hotPink },
  { scene: 'Treehouse', label: 'Treehouse', color: PALETTE.orange },
  { scene: 'StickerBook', label: 'Stickers', color: PALETTE.purple },
];

/**
 * A world's map: a winding path of levels. Arrow keys walk your critter (left from the workshop goes
 * back a world, the portal at the end goes forward); return plays.
 */
export class WorldMapScene extends Phaser.Scene {
  private profile!: Profile;
  private stops: Stop[] = [];
  private sel = 0;
  private avatar!: Avatar;
  private card!: Phaser.GameObjects.Container;
  private hopping = false;
  private world!: WorldDef;

  constructor() {
    super('WorldMap');
  }

  create(data: { world?: number; focus?: number }): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) {
      this.scene.start('ProfileSelect');
      return;
    }
    if (timeIsUp()) return void this.scene.start('TimeUp');
    this.profile = p;
    this.stops = [];
    this.hopping = false;
    const id = Phaser.Math.Clamp(data?.world || session.mapWorld || furthestWorld(p), 1, furthestWorld(p));
    session.mapWorld = id;
    music.play(`map-${id}`);
    const world = (this.world = worldById(id));
    if (id > 1 && !p.seen.includes(`world-${id}`)) {
      this.scene.start('Story', { story: `world-${id}` });
      return;
    }

    const theme = themeFor(id);
    backdrop(this, theme, 150, { sun: [1790, 110] });
    decorate(this, theme, DECOR_SPOTS);
    this.drawPath();

    this.add
      .text(GAME_W / 2, 70, world.name, { fontFamily: FONT_TITLE, fontSize: '76px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 })
      .setOrigin(0.5);
    new ProfileBadge(this, this.profile);
    new SoundToggle(this, 1440, 70).setDepth(45);
    new Button(this, GAME_W - 130, 70, 'Home', () => goTo(this, 'ProfileSelect'), { width: 210, height: 92, fontSize: 40, color: PALETTE.teal });
    this.add
      .text(GAME_W - 260, 70, `★ ${totalStars(this.profile)}`, { fontFamily: FONT_TITLE, fontSize: '48px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 9 })
      .setOrigin(1, 0.5);

    const all: (LevelDef | null)[] = [null, ...world.levels];
    all.forEach((level, i) => {
      const [x, y] = POSITIONS[i];
      this.stops.push({ x, y, level, node: this.makeNode(level, x, y, i) });
    });
    if (id < LAST_WORLD) {
      const [x, y] = SIGN;
      this.stops.push({ x: x + 70, y, level: null, portal: id + 1, node: this.makePortal(id + 1, x + 70, y) });
    } else this.makeSign();

    this.sel = Phaser.Math.Clamp(data?.focus ?? currentLevelIndex(this.profile, id) + 1, 0, this.stops.length - 1);
    const s = this.stops[this.sel];
    this.avatar = new Avatar(this, s.x, s.y - 30, this.profile, 0.62).setDepth(50);
    this.tweens.add({ targets: this.avatar, scaleY: this.avatar.scaleY * 1.04, duration: 700, yoyo: true, repeat: -1 });
    this.card = this.add.container(1560, 975).setDepth(60);
    this.showCard();
    this.makeDock();
    this.makeToday();
    this.time.delayedCall(400, () => narrator.say(`${world.name}! Use the arrow keys to pick a level, then press return.`));

    onKeys(this, (e) => {
      if (e.type !== 'down') return;
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown') this.move(1);
      else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') this.move(-1);
      else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) this.enter();
      else if (e.code === 'Escape') goTo(this, 'ProfileSelect');
      else if (/^Digit[1-5]$/.test(e.code) && !e.repeat) this.openDock(Number(e.code.slice(5)) - 1);
    });
  }

  private openDock(i: number): void {
    sfx.select();
    narrator.stop();
    goTo(this, DOCK[i].scene);
  }

  private makeDock(): void {
    DOCK.forEach((d, i) => {
      const x = 90 + i * 150;
      const y = 962;
      const key = bake(this, `dock-${d.label}`, 124, 130, (g) => {
        g.fillStyle(darken(d.color, 0.3), 1);
        g.fillCircle(62, 68, 58);
        g.fillStyle(d.color, 1);
        g.fillCircle(62, 62, 58);
        g.fillStyle(0xffffff, 0.35);
        g.fillCircle(62, 62, 44);
      });
      const c = this.add.container(x, y).setDepth(40);
      c.add(this.add.image(0, 0, key));
      const icon =
        d.label === 'Garden'
          ? this.add.image(0, -4, bloomTexture(this, 4)).setScale(0.85)
          : d.label === 'Race'
            ? this.add.image(0, 0, bake(this, 'dock-rocket', 70, 70, (g) => {
                g.fillStyle(0xeef3ff, 1);
                g.fillRoundedRect(22, 16, 26, 44, 12);
                g.fillStyle(PALETTE.red, 1);
                g.fillTriangle(22, 22, 48, 22, 35, 0);
                g.fillTriangle(22, 50, 12, 66, 22, 60);
                g.fillTriangle(48, 50, 58, 66, 48, 60);
                g.fillStyle(PALETTE.orange, 1);
                g.fillTriangle(26, 60, 44, 60, 35, 72);
              })).setAngle(45)
            : d.label === 'Shop'
              ? itemImage(this, 'party-hat', 0, 26, 0.75)
              : d.label === 'Treehouse'
                ? this.add.image(0, 0, 'map-house').setScale(0.5)
                : new Letterling(this, 0, 34, 'a', 62);
      c.add(icon);
      const cap = bake(this, 'dock-key', 44, 44, (g) => {
        g.fillStyle(INK, 1);
        g.fillRoundedRect(0, 4, 44, 40, 10);
        g.fillStyle(0xfff4dc, 1);
        g.fillRoundedRect(0, 0, 44, 40, 10);
      });
      c.add(this.add.image(46, -46, cap));
      c.add(this.add.text(46, -48, String(i + 1), { fontFamily: FONT_TITLE, fontSize: '28px', color: INK_CSS }).setOrigin(0.5));
      c.add(this.add.text(0, 72, d.label, { fontFamily: FONT_TITLE, fontSize: '30px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 6 }).setOrigin(0.5));
      const zone = this.add.zone(0, 0, 124, 124).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.openDock(i));
      zone.on('pointerover', () => c.setScale(1.08));
      zone.on('pointerout', () => c.setScale(1));
      c.add(zone);
    });
  }

  /** Today's Adventure: three ticks, and a gentle week of dots (nothing is ever lost). */
  private makeToday(): void {
    const done = dailyDone(this.profile);
    const c = this.add.container(1650, 205).setDepth(40);
    const key = bake(this, 'today-card', 460, 150, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 8, 460, 142, 32);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 460, 142, 32);
    });
    c.add(this.add.image(0, 0, key));
    c.add(this.add.text(-200, -46, "Today's adventure", { fontFamily: FONT_TITLE, fontSize: '32px', color: INK_CSS }).setOrigin(0, 0.5));
    DAILY_TASKS.forEach((t, i) => {
      const ok = done.includes(t.id);
      const x = -200 + i * 140;
      c.add(this.add.circle(x + 14, 4, 16, ok ? PALETTE.green : 0xe8e2f5).setStrokeStyle(3, INK));
      if (ok) c.add(this.add.text(x + 14, 2, '✓', { fontFamily: FONT_BODY, fontSize: '26px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
      c.add(this.add.text(x + 38, 4, ['Garden', 'Level', 'Race'][i], { fontFamily: FONT_BODY, fontSize: '26px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5));
    });
    lastWeek(this.profile).forEach((played, i) => {
      c.add(this.add.circle(-200 + 12 + i * 36, 48, 11, played ? PALETTE.yellow : 0xe8e2f5).setStrokeStyle(2, darken(PALETTE.yellow, 0.3)));
    });
    c.add(this.add.text(64, 48, 'this week', { fontFamily: FONT_BODY, fontSize: '22px', color: '#7a6a9a', fontStyle: 'bold' }).setOrigin(0, 0.5));
  }

  private unlocked(i: number): boolean {
    const s = this.stops[i];
    if (s.portal) return isWorldUnlocked(this.profile, s.portal);
    return !s.level || isLevelUnlocked(this.profile, s.level);
  }

  private move(dir: number): void {
    if (this.hopping) return;
    const next = this.sel + dir;
    if (next < 0 && this.world.id > 1) {
      sfx.select();
      return goTo(this, 'WorldMap', { world: this.world.id - 1, focus: 13 });
    }
    if (next < 0 || next >= this.stops.length) return;
    if (!this.unlocked(next)) {
      sfx.oops();
      this.tweens.add({ targets: this.avatar, x: this.avatar.x + 12 * dir, duration: 70, yoyo: true, repeat: 1 });
      if (this.stops[next].portal) narrator.say('Cheer up Grumble first, then the way opens!');
      else narrator.say(`That one is locked. Get a star on level ${this.stops[next - 1].level?.name ?? ''} first!`);
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
    if (s.x !== prev.x) this.avatar.face(s.x < prev.x); // face the way we're hopping
  }

  private enter(): void {
    const s = this.stops[this.sel];
    if (!this.unlocked(this.sel)) return;
    sfx.select();
    narrator.stop();
    if (s.portal) goTo(this, 'WorldMap', { world: s.portal, focus: 0 });
    else if (!s.level) goTo(this, 'Workshop');
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
    if (s.portal) {
      const open = isWorldUnlocked(this.profile, s.portal);
      title = `To ${worldById(s.portal).name}`;
      sub = open ? `World ${s.portal}` : 'Cheer up Grumble to open it!';
      spoken = `${title}. ${sub}`;
    } else if (!s.level) {
      title = "Grandpa Qwerty's Workshop";
      sub = 'Warm up your fingers!';
      spoken = "Grandpa Qwerty's Workshop. Warm up your fingers!";
    } else {
      const l = s.level;
      title = `${l.name}  ${GAME_NAMES[l.game]}`;
      const keys = l.newKeys.length > 6 ? `${l.newKeys.slice(0, 6).join(' ')} …` : l.newKeys.map((k) => (/[a-z]/.test(k) ? k.toUpperCase() : k)).join(' ');
      sub = l.content === 'words' ? 'Typing words' : l.content === 'sentences' ? 'Typing sentences' : l.newKeys.length ? `New keys: ${keys}` : 'Practice time';
      spoken = `Level ${l.name}. ${GAME_NAMES[l.game]}.`;
    }
    this.card.add(this.add.text(-w / 2 + 40, -60, title, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0, 0.5));
    this.card.add(this.add.text(-w / 2 + 40, 4, sub, { fontFamily: FONT_BODY, fontSize: '36px', color: '#7a5fc0', fontStyle: 'bold' }).setOrigin(0, 0.5));
    const go = this.add.text(-w / 2 + 40, 66, s.portal ? 'Press return to go!' : 'Press return to play!', { fontFamily: FONT_BODY, fontSize: '34px', color: '#ff5fa2', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.card.add(go);
    this.tweens.add({ targets: go, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
    narrator.say(spoken);
    debug.info = { selected: this.sel, world: this.world.id, level: s.portal ? `portal-${s.portal}` : (s.level?.id ?? 'workshop') };
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
      c.add(this.add.image(r * 0.6, r * 0.5, this.lockKey()));
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

  private lockKey(): string {
    return bake(this, 'map-lock', 64, 70, (g) => {
      g.lineStyle(9, INK, 1);
      g.beginPath();
      g.arc(32, 30, 17, Math.PI, 0, false);
      g.strokePath();
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRoundedRect(6, 28, 52, 40, 10);
      g.fillStyle(INK, 1);
      g.fillCircle(32, 46, 6);
    });
  }

  /** The end of the very last world. */
  private makeSign(): void {
    const [x, y] = SIGN;
    const key = bake(this, 'map-sign', 300, 100, (g) => {
      g.fillStyle(darken(0xffd6a5, 0.25), 1);
      g.fillRoundedRect(0, 10, 260, 86, 20);
      g.fillStyle(0xffd6a5, 1);
      g.fillRoundedRect(0, 4, 260, 86, 20);
    });
    this.add.image(x - 10, y, key).setOrigin(0, 0.5).setDepth(5);
    this.add
      .text(x + 120, y - 2, 'The end…\nfor now!', { fontFamily: FONT_BODY, fontSize: '27px', color: INK_CSS, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5)
      .setDepth(6);
  }

  /** A rainbow archway at the end of the path leading to the next world. */
  private makePortal(to: number, x: number, y: number): Phaser.GameObjects.Container {
    const open = isWorldUnlocked(this.profile, to);
    const key = bake(this, `map-portal-${open ? 1 : 0}`, 170, 170, (g) => {
      const colors = open ? [0xff5d5d, 0xff9a3c, 0xffd23f, 0x3ccf6e, 0x3a86ff, 0x9b5de5] : [0xb9b3c9, 0xc9c3d9, 0xd9d3e9];
      colors.forEach((c, i) => {
        g.lineStyle(12, c, 1);
        g.beginPath();
        g.arc(85, 150, 76 - i * 12, Math.PI, 0, false);
        g.strokePath();
      });
      g.fillStyle(open ? 0xffffff : 0xe8e2f5, open ? 0.6 : 1);
      g.fillRect(25, 150, 120, 14);
    });
    const c = this.add.container(x, y).setDepth(10);
    c.add(this.add.image(0, -30, key));
    c.add(this.add.text(92, -36, `To ${worldById(to).name}`, { fontFamily: FONT_BODY, fontSize: '28px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0, 0.5));
    if (!open) {
      c.add(this.add.image(46, 10, this.lockKey()));
    } else {
      this.tweens.add({ targets: c, scale: 1.06, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    return c;
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
