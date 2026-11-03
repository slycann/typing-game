import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { bloomTexture } from '../art/blooms';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { cloud, hills, sky, sun } from '../art/scenery';
import { characterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { letterDrill } from '../curriculum/drills';
import { debug } from '../debug';
import { KB_TOP, KB_W } from '../games/GameBase';
import { awardBadges } from '../engine/Achievements';
import { markDaily } from '../engine/Daily';
import { BLOOM_NAMES, hintsFor, masteryOf, unlockedKeys, weakestKeys, type Bloom } from '../engine/Mastery';
import { coinsFor, mergeKeyStats } from '../engine/Progress';
import { Rng } from '../engine/Rng';
import { starsForAccuracy, TypingSession } from '../engine/TypingSession';
import { keyboard, type KeyInputEvent } from '../input/KeyboardInput';
import { strokeCodes, strokeForChar } from '../input/keyLayout';
import type { Profile } from '../save/types';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { ProfileBadge } from '../ui/Hud';
import { OnScreenKeyboard, drawStar } from '../ui/OnScreenKeyboard';
import { SpeechBubble } from '../ui/SpeechBubble';
import { TargetStrip } from '../ui/TargetStrip';
import { badgeBanners, banner } from '../ui/Toast';
import { confetti, enterScene, goTo, onKeys } from './common';

type Mode = 'intro' | 'drill' | 'results';

const GROUPS = { '5-6': 3, '7-8': 4, '9-10': 5 } as const;
const SOIL_Y = 600;

/**
 * The Practice Garden: every key you've learned is a plant that grows as you master it.
 * Drills are built from the keys that need the most help, and typing them "waters" those plants.
 */
export class PracticeGardenScene extends Phaser.Scene {
  private profile!: Profile;
  private kb!: OnScreenKeyboard;
  private badge!: ProfileBadge;
  private bubble!: SpeechBubble;
  private plants = new Map<string, Phaser.GameObjects.Image>();
  private strip: TargetStrip | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private session: TypingSession | null = null;
  private keys: string[] = [];
  private mode: Mode = 'intro';
  private rng = new Rng();

  constructor() {
    super('PracticeGarden');
  }

  create(): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) return void this.scene.start('ProfileSelect');
    this.profile = p;
    this.mode = 'intro';
    this.strip = null;
    this.panel = null;
    this.session = null;
    this.plants = new Map();
    this.keys = unlockedKeys(p);

    sky(this);
    sun(this, 1760, 210, 60);
    cloud(this, 760, 250, 0.6);
    hills(this, 250);
    this.drawGarden();
    this.badge = new ProfileBadge(this, p);
    new Button(this, GAME_W - 130, 84, 'Map', () => goTo(this, 'WorldMap'), { width: 210, height: 92, fontSize: 40, color: PALETTE.teal, keyHint: 'esc' });
    this.add.text(GAME_W / 2, 84, 'Practice Garden', { fontFamily: FONT_TITLE, fontSize: '64px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 11 }).setOrigin(0.5);

    const juni = characterImage(this, 'juni', 150, SOIL_Y + 50, 0.9);
    const can = bake(this, 'watering-can', 120, 90, (g) => {
      g.fillStyle(PALETTE.blue, 1);
      g.fillRoundedRect(10, 30, 70, 56, 14);
      g.fillTriangle(76, 44, 116, 14, 80, 66);
      g.lineStyle(8, PALETTE.blue, 1);
      g.strokeCircle(44, 30, 22);
    });
    this.add.image(260, SOIL_Y - 40, can);
    this.tweens.add({ targets: juni, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1 });

    this.kb = new OnScreenKeyboard(this, (GAME_W - KB_W) / 2, KB_TOP, { width: KB_W }).attach(keyboard);
    debug.keyboard = this.kb;
    this.refreshKeyboard();

    this.bubble = new SpeechBubble(this, 640, 330, 720, 'left');
    const weak = weakestKeys(p, this.keys, 2).map((k) => k.toUpperCase()).join(' and ');
    this.bubble.say(`These are your key flowers!\nLet's water ${weak}.\nPress space to start!`);
    this.kb.setTargets(['Space']);
    this.updateDebug();
    onKeys(this, (e) => this.handleKey(e));
  }

  private drawGarden(): void {
    const fence = bake(this, 'garden-fence', GAME_W, 140, (g) => {
      g.fillStyle(0xffe3b8, 1);
      g.fillRect(0, 40, GAME_W, 16);
      g.fillRect(0, 96, GAME_W, 16);
      for (let x = 10; x < GAME_W; x += 70) {
        g.fillStyle(0xffd09a, 1);
        g.fillRect(x, 20, 40, 120);
        g.fillTriangle(x, 20, x + 40, 20, x + 20, 0);
      }
    });
    this.add.image(0, 320, fence).setOrigin(0, 0);
    const soil = bake(this, 'garden-soil', 1560, 150, (g) => {
      g.fillStyle(0x7a4a2c, 1);
      g.fillRoundedRect(0, 20, 1560, 130, 60);
      g.fillStyle(0x9a6440, 1);
      g.fillRoundedRect(0, 0, 1560, 130, 60);
      g.fillStyle(0x7a4a2c, 1);
      for (let i = 0; i < 40; i++) g.fillCircle(40 + ((i * 97) % 1480), 30 + ((i * 53) % 80), 5);
    });
    this.add.image(GAME_W / 2 + 120, SOIL_Y - 40, soil);
    // Up to ten plants: the keys that most need watering, in keyboard-learning order.
    const shown = new Set(weakestKeys(this.profile, this.keys, 10));
    const plantKeys = this.keys.filter((k) => shown.has(k));
    const n = plantKeys.length;
    const span = Math.min(1300, n * 150);
    plantKeys.forEach((k, i) => {
      const x = GAME_W / 2 + 120 - span / 2 + (span / n) * (i + 0.5);
      const stage = masteryOf(this.profile.keyStats[k]);
      const img = this.add.image(x, SOIL_Y, bloomTexture(this, stage)).setOrigin(0.5, 1).setScale(1.5);
      this.plants.set(k, img);
      const tag = bake(this, 'garden-tag', 64, 54, (g) => {
        g.fillStyle(INK, 1);
        g.fillRoundedRect(0, 4, 64, 50, 14);
        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(0, 0, 64, 48, 14);
      });
      this.add.image(x, SOIL_Y + 26, tag);
      this.add.text(x, SOIL_Y + 24, k, { fontFamily: FONT_BODY, fontSize: '36px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5);
      this.tweens.add({ targets: img, angle: { from: -3, to: 3 }, duration: 1100 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
  }

  /** Flowers on the keys, and letters hidden on keys the child knows by heart. */
  private refreshKeyboard(): void {
    for (const k of this.keys) {
      const code = strokeForChar(k)!.code;
      this.kb.setBadge(code, bloomTexture(this, masteryOf(this.profile.keyStats[k])));
      this.kb.setLabelVisible(code, hintsFor(this.profile, k).label);
    }
  }

  private handleKey(e: KeyInputEvent): void {
    if (e.type !== 'down' || e.repeat) return;
    if (e.code === 'Escape') return goTo(this, 'WorldMap');
    if (this.mode !== 'drill') {
      if (e.code === 'Space' || e.code === 'Enter') this.startDrill();
      return;
    }
    if (!this.session || e.char === null) return;
    const out = this.session.input(e.capsLock ? e.char.toLowerCase() : e.char, e.time);
    if (out.result === 'correct') {
      sfx.good(this.session.index);
      this.kb.sparkle(e.code);
      this.strip?.setIndex(this.session.index);
      this.strip?.popDone(out.index);
      if (out.expected !== ' ') this.water(out.expected!);
      if (out.done) return void this.finish();
    } else if (out.result === 'wrong') {
      sfx.oops();
      this.kb.wobble(e.code);
      this.strip?.shake(out.index);
    }
    this.showNext();
  }

  private startDrill(): void {
    sfx.select();
    this.panel?.destroy();
    this.panel = null;
    const weak = weakestKeys(this.profile, this.keys, 3);
    const text = letterDrill([...this.keys, ' '], weak, this.rng, GROUPS[this.profile.ageBand]);
    this.session = new TypingSession(text);
    this.strip?.destroy();
    this.strip = new TargetStrip(this, GAME_W / 2 + 120, 220, text, 1200);
    this.mode = 'drill';
    this.bubble.hide();
    narrator.say(`Water ${weak.map((k) => narrator.nameOf(k)).join(', ')}!`);
    this.showNext();
  }

  private showNext(): void {
    const ch = this.session?.expected ?? null;
    const stroke = ch ? strokeForChar(ch) : null;
    const glow = ch ? hintsFor(this.profile, ch).glow : false;
    this.kb.setTargets(glow ? strokeCodes(stroke) : []);
    this.updateDebug();
  }

  private water(ch: string): void {
    const plant = this.plants.get(ch);
    if (!plant) return;
    const drop = this.add.circle(290, SOIL_Y - 70, 12, 0x6fc0ff);
    this.tweens.add({ targets: drop, x: plant.x, duration: 380, ease: 'Linear' });
    this.tweens.add({
      targets: drop,
      y: SOIL_Y - 200,
      duration: 190,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        drop.destroy();
        this.tweens.add({ targets: plant, scaleY: 1.7, duration: 110, yoyo: true });
      },
    });
  }

  private async finish(): Promise<void> {
    const s = this.session!;
    this.mode = 'results';
    this.kb.setTargets([]);
    const before = new Map(this.keys.map((k) => [k, masteryOf(this.profile.keyStats[k])]));
    const stars = Math.max(1, starsForAccuracy(s.accuracy(), this.profile.ageBand));
    const coins = coinsFor(stars, false);
    let dailyDone = false;
    let badges: ReturnType<typeof awardBadges> = [];
    await store.updateProfile(this.profile.id, (p) => {
      mergeKeyStats(p, s.perChar);
      p.coins += coins;
      p.xp += s.correct;
      p.gardenRuns++;
      p.playMs += s.elapsedMs(performance.now());
      dailyDone = markDaily(p, 'garden');
      badges = awardBadges(p);
    });
    const grown = this.keys.filter((k) => masteryOf(this.profile.keyStats[k]) > before.get(k)!);
    for (const k of grown) {
      const plant = this.plants.get(k)!;
      const stage = masteryOf(this.profile.keyStats[k]) as Bloom;
      this.tweens.add({ targets: plant, scale: 2.2, duration: 250, yoyo: true, onYoyo: () => plant.setTexture(bloomTexture(this, stage)) });
    }
    this.refreshKeyboard();
    sfx.cheer();
    confetti(this, GAME_W / 2, 260, 60);
    this.strip?.destroy();
    this.strip = null;
    this.showResults(stars, coins, grown);
    this.badge.flyCoins(GAME_W / 2, 260, coins, 600);
    if (dailyDone) banner(this, "Today's adventure done!", '+15 bonus coins!', 1200);
    badgeBanners(this, badges, dailyDone ? 4800 : 1200);
    this.updateDebug({ stars, grown });
  }

  private showResults(stars: number, coins: number, grown: string[]): void {
    const c = this.add.container(GAME_W / 2 + 120, 255);
    const key = bake(this, 'garden-panel', 900, 250, (g) => {
      g.fillStyle(darken(PALETTE.green, 0.35), 1);
      g.fillRoundedRect(0, 12, 900, 238, 50);
      g.fillStyle(0xe6ffd9, 1);
      g.fillRoundedRect(0, 0, 900, 238, 50);
    });
    c.add(this.add.image(0, 0, key));
    for (let i = 0; i < 3; i++) {
      const sg = this.add.graphics({ x: -120 + i * 120, y: -40 });
      sg.fillStyle(i < stars ? PALETTE.yellow : 0xffffff, 1);
      drawStar(sg, 0, 0, 5, 48, 22);
      c.add(sg);
    }
    const grewLine = grown.length ? `${grown.map((k) => k.toUpperCase()).join(' and ')} grew into a ${BLOOM_NAMES[masteryOf(this.profile.keyStats[grown[0]])]}!` : `+${coins} coins! Press space for more.`;
    c.add(this.add.text(0, 60, grewLine, { fontFamily: FONT_BODY, fontSize: '40px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
    this.panel = c;
    this.kb.setTargets(['Space']);
    narrator.say(grown.length ? `Look! ${grewLine} Press space for more.` : `Great watering! Press space for more.`);
  }

  private updateDebug(extra: Record<string, unknown> = {}): void {
    debug.info = { ...debug.info, mode: this.mode, target: this.session?.target ?? null, expected: this.session?.expected ?? null, keys: this.keys, ...extra };
  }
}
