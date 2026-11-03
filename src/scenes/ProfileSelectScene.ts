import Phaser from 'phaser';
import { sfx } from '../audio/Sfx';
import { INK, INK_CSS, OUTFIT_COLORS, PALETTE, darken, lighten } from '../art/palette';
import { bunting, workshop } from '../art/scenery';
import { Avatar } from '../art/Avatar';
import { characterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { debug } from '../debug';
import type { Profile } from '../save/types';
import { startSitting, store } from '../state';
import { Button } from '../ui/Button';
import { SpeechBubble } from '../ui/SpeechBubble';
import { enterScene, goTo, onKeys } from './common';

interface Card {
  root: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Graphics;
  profile: Profile | null; // null = "new player"
}

const CARD_W = 330;
const CARD_H = 390;

export class ProfileSelectScene extends Phaser.Scene {
  private cards: Card[] = [];
  private focus = 0;

  constructor() {
    super('ProfileSelect');
  }

  create(): void {
    enterScene(this);
    if (store.profiles.length === 0) {
      this.scene.start('NewPlayer');
      return;
    }
    workshop(this, 900);
    bunting(this, 30);
    this.add
      .text(GAME_W / 2, 150, "Who's playing?", { fontFamily: FONT_TITLE, fontSize: '100px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 14 })
      .setOrigin(0.5);

    const entries: (Profile | null)[] = [...store.profiles].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
    if (store.canAddProfile()) entries.push(null);
    this.cards = entries.map((p, i) => this.makeCard(p, i, entries.length));
    const last = this.cards.findIndex((c) => c.profile?.id === store.data.lastProfileId);
    this.setFocus(Math.max(0, last));

    // Reset or delete players (behind a parental gate). Click only, so it stays out of kids' way.
    new Button(this, 190, 1000, 'Grown-ups', () => goTo(this, 'Grownups'), { width: 300, height: 90, fontSize: 38, color: PALETTE.purple });

    const qwerty = characterImage(this, 'qwerty', 1720, 1060, 0.8);
    this.tweens.add({ targets: qwerty, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1 });
    const bubble = new SpeechBubble(this, 1300, 960, 640, 'right');
    this.time.delayedCall(400, () => bubble.say('Use the arrow keys to find\nyour picture, then press return!'));

    onKeys(this, (e) => {
      if (e.type !== 'down') return;
      const perRow = this.perRow();
      if (e.code === 'ArrowRight') this.setFocus(this.focus + 1);
      else if (e.code === 'ArrowLeft') this.setFocus(this.focus - 1);
      else if (e.code === 'ArrowDown') this.setFocus(this.focus + perRow);
      else if (e.code === 'ArrowUp') this.setFocus(this.focus - perRow);
      else if (e.code === 'Enter' || e.code === 'Space') this.choose(this.focus);
      else if (e.code === 'Escape') goTo(this, 'Title');
    });
    debug.info = { cards: this.cards.length };
  }

  private perRow(): number {
    return this.cards.length <= 4 ? this.cards.length : Math.ceil(this.cards.length / 2);
  }

  private makeCard(profile: Profile | null, i: number, total: number): Card {
    const perRow = total <= 4 ? total : Math.ceil(total / 2);
    const rows = Math.ceil(total / perRow);
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = row === rows - 1 ? total - perRow * (rows - 1) : perRow;
    const gap = 50;
    const x = GAME_W / 2 + (col - (inRow - 1) / 2) * (CARD_W + gap);
    const y = rows === 1 ? 520 : 400 + row * (CARD_H * 0.78 + 40);
    const scale = rows === 1 ? 1 : 0.78;

    const color = profile ? OUTFIT_COLORS[profile.outfit % OUTFIT_COLORS.length] : PALETTE.teal;
    const g = this.add.graphics();
    g.fillStyle(darken(color, 0.35), 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2 + 12, CARD_W, CARD_H, 40);
    g.fillStyle(lighten(color, 0.55), 1);
    g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 40);
    g.fillStyle(lighten(color, 0.25), 1);
    g.fillCircle(0, -30, 120);
    const ring = this.add.graphics();
    const parts: Phaser.GameObjects.GameObject[] = [ring, g];

    if (profile) {
      parts.push(new Avatar(this, 0, 80, profile, 0.82, false));
      parts.push(this.add.text(0, 132, profile.name, { fontFamily: FONT_TITLE, fontSize: '52px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 9 }).setOrigin(0.5));
      const stars = Object.values(profile.stars).reduce((a, b) => a + b, 0);
      parts.push(this.add.text(0, -170, `★ ${stars}   ● ${profile.coins}`, { fontFamily: FONT_BODY, fontSize: '30px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5));
    } else {
      const plus = this.add.graphics();
      plus.fillStyle(0xffffff, 1);
      plus.fillRoundedRect(-18, -100, 36, 140, 18);
      plus.fillRoundedRect(-70, -48, 140, 36, 18);
      parts.push(plus);
      parts.push(this.add.text(0, 120, 'New player', { fontFamily: FONT_TITLE, fontSize: '50px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 9 }).setOrigin(0.5));
    }
    const zone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => this.setFocus(i));
    zone.on('pointerdown', () => this.choose(i));
    parts.push(zone);
    const root = this.add.container(x, y, parts).setScale(scale);
    root.setData('baseScale', scale);
    // drop in from above
    root.y -= 600;
    this.tweens.add({ targets: root, y, duration: 500, delay: 80 * i, ease: 'Back.easeOut' });
    return { root, ring, profile };
  }

  private setFocus(i: number): void {
    if (!this.cards.length) return;
    const next = Phaser.Math.Wrap(i, 0, this.cards.length);
    if (next !== this.focus) sfx.key();
    this.focus = next;
    this.cards.forEach((c, k) => {
      const base = c.root.getData('baseScale') as number;
      c.ring.clear();
      if (k === next) {
        c.ring.lineStyle(14, 0xfff27a, 1);
        c.ring.strokeRoundedRect(-CARD_W / 2 - 14, -CARD_H / 2 - 14, CARD_W + 28, CARD_H + 40, 50);
        c.ring.lineStyle(5, INK, 0.5);
        c.ring.strokeRoundedRect(-CARD_W / 2 - 14, -CARD_H / 2 - 14, CARD_W + 28, CARD_H + 40, 50);
      }
      this.tweens.add({ targets: c.root, scale: k === next ? base * 1.07 : base, duration: 150 });
    });
    debug.info = { ...debug.info, focus: next };
  }

  private choose(i: number): void {
    const card = this.cards[i];
    if (!card) return;
    sfx.select();
    if (!card.profile) return goTo(this, 'NewPlayer');
    startSitting(card.profile.id);
    void store.selectProfile(card.profile.id);
    goTo(this, card.profile.seen.includes('intro') ? 'WorldMap' : 'Story');
  }
}
