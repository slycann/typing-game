import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { Avatar } from '../art/Avatar';
import { bake } from '../art/bake';
import { fittedItemImage } from '../art/items';
import { INK_CSS, PALETTE, darken } from '../art/palette';
import { bunting, workshop } from '../art/scenery';
import { characterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { debug } from '../debug';
import { awardBadges } from '../engine/Achievements';
import type { Profile } from '../save/types';
import { buy, CATALOG, type ItemKind, type ShopItem } from '../shop/catalog';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { ProfileBadge } from '../ui/Hud';
import { SpeechBubble } from '../ui/SpeechBubble';
import { badgeBanners } from '../ui/Toast';
import { enterScene, goTo, onKeys } from './common';

const TABS: { kind: ItemKind; label: string; color: number }[] = [
  { kind: 'hat', label: 'Hats', color: PALETTE.hotPink },
  { kind: 'glasses', label: 'Glasses', color: PALETTE.blue },
  { kind: 'pet', label: 'Pets', color: PALETTE.green },
  { kind: 'decor', label: 'Treehouse', color: PALETTE.orange },
];
const COLS = 6;
const CARD_W = 196;
const CARD_H = 210;

/** Grandpa Qwerty's shop: spend coins on hats, glasses, pets and treehouse things. */
export class ShopScene extends Phaser.Scene {
  private profile!: Profile;
  private tab = 0;
  private sel = 0;
  private confirming: string | null = null;
  private layer!: Phaser.GameObjects.Container;
  private tabButtons: Button[] = [];
  private preview!: Avatar;
  private decorPreview: Phaser.GameObjects.Image | null = null;
  private badge!: ProfileBadge;
  private bubble!: SpeechBubble;
  private cards: { item: ShopItem; ring: Phaser.GameObjects.Image }[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    enterScene(this);
    music.play('calm');
    const p = currentProfile();
    if (!p) return void this.scene.start('ProfileSelect');
    this.profile = p;
    this.tab = 0;
    this.sel = 0;
    this.confirming = null;
    this.decorPreview = null;
    workshop(this, 900);
    bunting(this, 150);
    this.badge = new ProfileBadge(this, p);
    this.add.text(GAME_W / 2, 84, "Qwerty's Shop", { fontFamily: FONT_TITLE, fontSize: '76px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 }).setOrigin(0.5);
    new Button(this, GAME_W - 130, 84, 'Map', () => goTo(this, 'WorldMap'), { width: 210, height: 92, fontSize: 40, color: PALETTE.teal, keyHint: 'esc' });
    this.tabButtons = TABS.map((t, i) => new Button(this, 250 + i * 290, 250, `${i + 1} ${t.label}`, () => this.setTab(i), { width: 260, height: 86, fontSize: 38, color: t.color }));

    const counter = bake(this, 'shop-counter', 520, 200, (g) => {
      g.fillStyle(0xa96e43, 1);
      g.fillRoundedRect(0, 30, 520, 170, 20);
      g.fillStyle(0xc98a5b, 1);
      g.fillRoundedRect(0, 0, 520, 50, 20);
    });
    this.preview = new Avatar(this, 1640, 880, p, 1.15);
    this.add.image(1640, 980, counter);
    characterImage(this, 'qwerty', 1830, 900, 0.5).setFlipX(true);
    this.bubble = new SpeechBubble(this, 1620, 330, 540, 'none');
    this.layer = this.add.container(0, 0);
    this.setTab(0);
    this.bubble.say('Welcome to my shop!\nArrows to look, return to buy.');

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      const n = this.items().length;
      if (e.code === 'Escape') return goTo(this, 'WorldMap');
      if (/^Digit[1-4]$/.test(e.code)) return this.setTab(Number(e.code.slice(5)) - 1);
      if (e.code === 'ArrowRight') this.select(Math.min(n - 1, this.sel + 1));
      else if (e.code === 'ArrowLeft') this.select(Math.max(0, this.sel - 1));
      else if (e.code === 'ArrowDown') this.select(Math.min(n - 1, this.sel + COLS));
      else if (e.code === 'ArrowUp') this.select(Math.max(0, this.sel - COLS));
      else if (e.code === 'Enter' || e.code === 'Space') void this.choose();
    });
  }

  private items(): ShopItem[] {
    return CATALOG.filter((i) => i.kind === TABS[this.tab].kind);
  }

  private setTab(i: number): void {
    sfx.select();
    this.tab = i;
    this.sel = 0;
    this.confirming = null;
    this.tabButtons.forEach((b, k) => b.setFocused(k === i));
    this.layer.removeAll(true);
    this.cards = this.items().map((item, k) => this.makeCard(item, k));
    this.select(0);
  }

  private makeCard(item: ShopItem, k: number): { item: ShopItem; ring: Phaser.GameObjects.Image } {
    const x = 150 + (k % COLS) * (CARD_W + 20);
    const y = 440 + Math.floor(k / COLS) * (CARD_H + 18);
    const owned = this.profile.owned.includes(item.id);
    const color = TABS[this.tab].color;
    const card = bake(this, `shop-card-${color.toString(16)}`, CARD_W, CARD_H + 8, (g) => {
      g.fillStyle(darken(color, 0.3), 1);
      g.fillRoundedRect(0, 8, CARD_W, CARD_H, 30);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, CARD_W, CARD_H, 30);
    });
    const ringKey = bake(this, 'shop-ring', CARD_W + 28, CARD_H + 36, (g) => {
      g.lineStyle(10, 0xfff27a, 1);
      g.strokeRoundedRect(5, 5, CARD_W + 18, CARD_H + 26, 36);
    });
    const ring = this.add.image(x, y + 4, ringKey).setVisible(false);
    const pic = fittedItemImage(this, item.id, x, y - 22, CARD_W - 40, 104);
    const name = this.add.text(x, y + 62, item.name, { fontFamily: FONT_BODY, fontSize: '25px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5);
    const price = owned
      ? this.add.text(x, y + 92, this.isWorn(item) ? 'wearing ✓' : 'yours ✓', { fontFamily: FONT_BODY, fontSize: '26px', color: '#1f9e4a', fontStyle: 'bold' }).setOrigin(0.5)
      : this.add.text(x, y + 92, `● ${item.price}`, { fontFamily: FONT_BODY, fontSize: '30px', color: '#c98a00', fontStyle: 'bold' }).setOrigin(0.5);
    this.layer.add([ring, this.add.image(x, y, card).setOrigin(0.5, CARD_H / 2 / (CARD_H + 8)), pic, name, price]);
    return { item, ring };
  }

  private isWorn(item: ShopItem): boolean {
    const w = this.profile.wearing;
    if (item.kind === 'decor') return Object.values(this.profile.treehouse).includes(item.id);
    return w[item.kind as 'hat' | 'glasses' | 'pet'] === item.id;
  }

  private select(i: number, quiet = false): void {
    if (i !== this.sel && !quiet) sfx.key();
    this.sel = i;
    this.confirming = null;
    this.cards.forEach((c, k) => c.ring.setVisible(k === i));
    const item = this.cards[i]?.item;
    if (!item) return;
    // Try it on (or show the decoration) before buying.
    this.decorPreview?.destroy();
    this.decorPreview = null;
    if (item.kind === 'decor') {
      this.preview.setLook(this.profile);
      this.decorPreview = fittedItemImage(this, item.id, 1640, 640, 460, 300, 1);
    } else {
      this.preview.setLook({ ...this.profile, wearing: { ...this.profile.wearing, [item.kind]: item.id } });
    }
    if (!quiet) narrator.say(`${item.name}. ${this.profile.owned.includes(item.id) ? 'You have this one.' : `${item.price} coins.`}`);
    debug.info = { tab: TABS[this.tab].kind, item: item.id, coins: this.profile.coins, owned: [...this.profile.owned] };
  }

  private async choose(): Promise<void> {
    const item = this.cards[this.sel]?.item;
    if (!item) return;
    const p = this.profile;
    if (p.owned.includes(item.id)) {
      // Owned: put it on / take it off (decorations go to the treehouse).
      await store.updateProfile(p.id, (pr) => {
        if (item.kind === 'decor') pr.treehouse[item.slot!] = pr.treehouse[item.slot!] === item.id ? null : item.id;
        else {
          const k = item.kind as 'hat' | 'glasses' | 'pet';
          pr.wearing[k] = pr.wearing[k] === item.id ? null : item.id;
        }
      });
      sfx.select();
      const on = this.isWorn(item);
      this.bubble.say(item.kind === 'decor' ? (on ? 'Off to your treehouse!' : 'Taken out of your treehouse.') : on ? 'Looking great!' : 'Taken off.');
      return this.refresh();
    }
    if (p.coins < item.price) {
      sfx.oops();
      this.bubble.say(`You need ${item.price - p.coins} more coins.\nPlay a level to earn some!`);
      return;
    }
    if (this.confirming !== item.id) {
      this.confirming = item.id;
      this.bubble.say(`Buy the ${item.name} for ${item.price} coins?\nPress return again!`);
      debug.info = { ...debug.info, confirming: item.id };
      return;
    }
    let badges: ReturnType<typeof awardBadges> = [];
    await store.updateProfile(p.id, (pr) => {
      if (buy(pr, item.id) !== 'bought') return;
      if (item.kind === 'decor') pr.treehouse[item.slot!] ??= item.id;
      else pr.wearing[item.kind as 'hat' | 'glasses' | 'pet'] = item.id;
      badges = awardBadges(pr);
    });
    sfx.coin();
    sfx.cheer();
    this.badge.setCoins(p.coins);
    this.bubble.say(item.kind === 'decor' ? `It's yours! I put it in your treehouse.` : `It's yours! Looking great!`);
    badgeBanners(this, badges, 800);
    this.refresh();
  }

  private refresh(): void {
    const sel = this.sel;
    this.layer.removeAll(true);
    this.cards = this.items().map((item, k) => this.makeCard(item, k));
    this.sel = -1;
    this.select(sel, true);
  }
}
