import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { bloomTexture } from '../art/blooms';
import { Grumble } from '../art/Grumble';
import { Letterling } from '../art/Letterling';
import { INK_CSS, PALETTE } from '../art/palette';
import { drawStar } from '../ui/OnScreenKeyboard';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { KEY_STAGES } from '../curriculum/keyStages';
import { debug } from '../debug';
import { BADGES, rankFor, RANKS } from '../engine/Achievements';
import { BLOOM_NAMES, masteryOf } from '../engine/Mastery';
import { currentProfile } from '../state';
import type { Profile } from '../save/types';
import { Button } from '../ui/Button';
import { enterScene, goTo, onKeys } from './common';

const ALL = KEY_STAGES.flatMap((s) => s.keys);
const PER_PAGE = 30;

/** The Sticker Book: every Letterling you've rescued (with how well you know it), plus badges. */
export class StickerBookScene extends Phaser.Scene {
  private stickers = new Map<string, Letterling>();
  private page = 0;
  private pageLayer!: Phaser.GameObjects.Container;
  private profile!: Profile;
  private pageLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('StickerBook');
  }

  create(): void {
    enterScene(this);
    const p = currentProfile();
    if (!p) return void this.scene.start('ProfileSelect');
    this.stickers = new Map();
    this.profile = p;
    this.page = 0;
    this.cameras.main.setBackgroundColor('#c98a5b');
    const book = bake(this, 'book', 1800, 900, (g) => {
      g.fillStyle(0x7a3e8a, 1);
      g.fillRoundedRect(0, 0, 1800, 900, 40);
      g.fillStyle(0xfff4dc, 1);
      g.fillRoundedRect(30, 30, 860, 840, 24);
      g.fillRoundedRect(910, 30, 860, 840, 24);
      g.fillStyle(0xe8d8b8, 1);
      g.fillRect(886, 30, 28, 840);
    });
    this.add.image(GAME_W / 2, 560, book);
    this.add.text(GAME_W / 2, 60, 'Sticker Book', { fontFamily: FONT_TITLE, fontSize: '72px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 }).setOrigin(0.5);
    new Button(this, GAME_W - 130, 60, 'Map', () => goTo(this, 'WorldMap'), { width: 200, height: 84, fontSize: 38, color: PALETTE.teal, keyHint: 'esc' });

    // Left page: Letterlings
    const left = GAME_W / 2 - 445;
    const rescued = new Set(p.stickers);
    const count = ALL.filter((k) => rescued.has(k)).length;
    this.add.text(left, 170, `Letterlings rescued: ${count} of ${ALL.length}`, { fontFamily: FONT_TITLE, fontSize: '40px', color: INK_CSS }).setOrigin(0.5);
    this.pageLayer = this.add.container(0, 0);
    this.pageLabel = this.add.text(left, 960, '', { fontFamily: FONT_BODY, fontSize: '28px', color: '#7a6a9a', fontStyle: 'bold' }).setOrigin(0.5);
    this.showPage(0);
    if (rescued.has('grumble')) {
      new Grumble(this, left + 300, 880, 0.4).setMood('happy');
      this.add.text(left + 300, 950, 'Friend: Grumble', { fontFamily: FONT_BODY, fontSize: '26px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5);
    }

    // Right page: rank and badges
    const right = GAME_W / 2 + 445;
    const rank = rankFor(p.xp);
    this.add.text(right, 170, `Rank: ${rank.name}`, { fontFamily: FONT_TITLE, fontSize: '48px', color: '#7a3e8a' }).setOrigin(0.5);
    const toGo = rank.next === null ? 'Top rank!' : `${rank.next - p.xp} more keys to ${RANKS[rank.index + 1].name}`;
    this.add.text(right, 222, toGo, { fontFamily: FONT_BODY, fontSize: '28px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5);
    BADGES.forEach((b, i) => {
      const x = right - 200 + (i % 2) * 400;
      const y = 320 + Math.floor(i / 2) * 120;
      const got = p.badges.includes(b.id);
      const medal = bake(this, `medal-${got ? 1 : 0}`, 90, 90, (g) => {
        g.fillStyle(got ? 0xd9a400 : 0xd9d2c0, 1);
        g.fillCircle(45, 48, 40);
        g.fillStyle(got ? PALETTE.yellow : 0xeae4d4, 1);
        g.fillCircle(45, 45, 40);
        g.fillStyle(got ? 0xffffff : 0xd9d2c0, 1);
        drawStar(g, 45, 45, 5, 24, 11);
      });
      this.add.image(x - 130, y, medal);
      this.add.text(x - 70, y - 18, b.name, { fontFamily: FONT_BODY, fontSize: '30px', color: got ? INK_CSS : '#b0a48a', fontStyle: 'bold' }).setOrigin(0, 0.5);
      this.add.text(x - 70, y + 18, b.desc, { fontFamily: FONT_BODY, fontSize: '21px', color: got ? '#6a5a8a' : '#c0b49a', fontStyle: 'bold', wordWrap: { width: 260 } }).setOrigin(0, 0.5);
    });

    narrator.say(`Your sticker book! You've rescued ${count} Letterlings. Press a letter to see it.`);
    debug.info = { rescued: count, badges: [...p.badges], rank: rank.name };

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Escape' || e.code === 'Enter') return goTo(this, 'WorldMap');
      const pages = Math.ceil(ALL.length / PER_PAGE);
      if (e.code === 'ArrowRight') return this.showPage((this.page + 1) % pages);
      if (e.code === 'ArrowLeft') return this.showPage((this.page + pages - 1) % pages);
      if (!e.char || !e.char.trim()) return;
      const k = ALL.includes(e.char) ? e.char : e.char.toLowerCase();
      const at = ALL.indexOf(k);
      if (at >= 0 && Math.floor(at / PER_PAGE) !== this.page) this.showPage(Math.floor(at / PER_PAGE));
      const l = this.stickers.get(k);
      if (l) {
        sfx.good(2);
        l.dance(2);
        narrator.say(`${narrator.nameOf(k)}! Your ${narrator.nameOf(k)} is a ${BLOOM_NAMES[masteryOf(p.keyStats[k])]}.`);
      } else {
        sfx.oops();
        narrator.say(`${narrator.nameOf(k)} is still lost. Keep playing to rescue it!`);
      }
    });
  }

  private showPage(page: number): void {
    this.page = page;
    this.pageLayer.removeAll(true);
    this.stickers.clear();
    const left = GAME_W / 2 - 445;
    const rescued = new Set(this.profile.stickers);
    const blank = bake(this, 'sticker-blank', 104, 110, (g) => {
      g.lineStyle(5, 0xd9c9a8, 1);
      g.strokeRoundedRect(4, 4, 96, 102, 30);
    });
    ALL.slice(page * PER_PAGE, (page + 1) * PER_PAGE).forEach((k, i) => {
      const x = left - 330 + (i % 6) * 132;
      const y = 290 + Math.floor(i / 6) * 128;
      if (rescued.has(k)) {
        const l = new Letterling(this, x, y + 46, k, 84);
        this.stickers.set(k, l);
        this.pageLayer.add([l, this.add.image(x + 44, y + 36, bloomTexture(this, masteryOf(this.profile.keyStats[k]))).setScale(0.5)]);
      } else {
        this.pageLayer.add([this.add.image(x, y, blank), this.add.text(x, y, '?', { fontFamily: FONT_TITLE, fontSize: '54px', color: '#d9c9a8' }).setOrigin(0.5)]);
      }
    });
    const pages = Math.ceil(ALL.length / PER_PAGE);
    this.pageLabel.setText(`◀  page ${page + 1} of ${pages}  ▶`);
    sfx.key();
  }
}
