import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { Avatar } from '../art/Avatar';
import { bake } from '../art/bake';
import { itemImage } from '../art/items';
import { Letterling } from '../art/Letterling';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { debug } from '../debug';
import { awardBadges } from '../engine/Achievements';
import type { Profile } from '../save/types';
import { CATALOG, DECOR_SLOTS, SLOT_NAMES, itemById, type DecorSlot } from '../shop/catalog';
import { currentProfile, store } from '../state';
import { Button } from '../ui/Button';
import { badgeBanners } from '../ui/Toast';
import { enterScene, goTo, onKeys } from './common';

// Where each decoration goes in the room (the item's anchor point).
const SLOT_AT: Record<DecorSlot, { x: number; y: number; scale: number }> = {
  ceiling: { x: 960, y: 30, scale: 1.4 },
  wall: { x: 470, y: 520, scale: 1 },
  window: { x: 1290, y: 560, scale: 1 },
  shelf: { x: 1690, y: 440, scale: 1 },
  lamp: { x: 230, y: 930, scale: 1.1 },
  plant: { x: 1790, y: 930, scale: 1 },
  seat: { x: 1380, y: 950, scale: 1.1 },
  rug: { x: 900, y: 1010, scale: 1.3 },
};

/** Your treehouse: decorate it with things from the shop. Rescued Letterlings come to visit. */
export class TreehouseScene extends Phaser.Scene {
  private profile!: Profile;
  private sel = 0;
  private decor = new Map<DecorSlot, Phaser.GameObjects.Image>();
  private marker!: Phaser.GameObjects.Text;
  private label!: Phaser.GameObjects.Text;
  private avatar!: Avatar;
  private visitors: Letterling[] = [];

  constructor() {
    super('Treehouse');
  }

  create(): void {
    enterScene(this);
    music.play('calm');
    const p = currentProfile();
    if (!p) return void this.scene.start('ProfileSelect');
    this.profile = p;
    this.sel = 0;
    this.decor = new Map();
    this.visitors = [];
    this.drawRoom();
    for (const slot of DECOR_SLOTS) this.place(slot);

    this.avatar = new Avatar(this, 800, 950, p, 1.15).setDepth(2);
    this.tweens.add({ targets: this.avatar, scaleY: this.avatar.scaleY * 1.03, duration: 800, yoyo: true, repeat: -1 });
    // Rescued Letterlings wander in.
    const friends = p.stickers.filter((s) => s.length === 1).slice(0, 8);
    friends.forEach((ch, i) => {
      const l = new Letterling(this, 560 + i * 120, 1000, ch, 80).setDepth(2);
      this.visitors.push(l);
      this.tweens.add({ targets: l, x: l.x + Phaser.Math.Between(-60, 60), duration: 1800 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    this.add.text(GAME_W / 2, 92, `${p.name}'s Treehouse`, { fontFamily: FONT_TITLE, fontSize: '70px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 }).setOrigin(0.5).setDepth(10);
    new Button(this, GAME_W - 130, 84, 'Map', () => goTo(this, 'WorldMap'), { width: 210, height: 92, fontSize: 40, color: PALETTE.teal, keyHint: 'esc' }).setDepth(10);
    const plate = bake(this, 'tree-label', 900, 100, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 8, 900, 92, 46);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 900, 92, 46);
    });
    this.add.image(GAME_W / 2, 180, plate).setDepth(10);
    this.label = this.add.text(GAME_W / 2, 176, '', { fontFamily: FONT_BODY, fontSize: '36px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0.5).setDepth(11);
    this.marker = this.add.text(0, 0, '▼', { fontFamily: FONT_BODY, fontSize: '64px', color: '#ff5fa2', stroke: '#ffffff', strokeThickness: 8 }).setOrigin(0.5, 1).setDepth(12);
    this.tweens.add({ targets: this.marker, y: '+=14', duration: 400, yoyo: true, repeat: -1 });
    this.select(0);
    narrator.say(`${p.name}'s treehouse! Arrow keys pick a spot, return changes it.`);

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Escape') return goTo(this, 'WorldMap');
      if (e.code === 'ArrowRight') this.select(this.sel + 1);
      else if (e.code === 'ArrowLeft') this.select(this.sel - 1);
      else if (e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'ArrowDown') void this.cycle();
      else if (e.char && e.char.trim()) this.party(e.char);
    });
  }

  private drawRoom(): void {
    const room = bake(this, 'tree-room', GAME_W, 1080, (g) => {
      for (let x = 0; x < GAME_W; x += 120) {
        g.fillStyle((x / 120) % 2 ? 0xd99a62 : 0xe6ab72, 1);
        g.fillRect(x, 0, 120, 860);
      }
      g.fillStyle(0xa96e43, 1);
      g.fillRect(0, 840, GAME_W, 30);
      g.fillStyle(0xc98a5b, 1);
      g.fillRect(0, 870, GAME_W, 210);
      g.lineStyle(4, 0xa96e43, 1);
      for (let y = 920; y < 1080; y += 50) g.lineBetween(0, y, GAME_W, y);
      // window
      g.fillStyle(0xa96e43, 1);
      g.fillRoundedRect(1130, 260, 320, 290, 30);
      g.fillStyle(PALETTE.skyTop, 1);
      g.fillRoundedRect(1150, 280, 280, 250, 20);
      g.fillStyle(PALETTE.grass, 1);
      g.fillEllipse(1290, 520, 300, 120);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(1220, 340, 24);
      g.fillCircle(1250, 330, 30);
      g.fillCircle(1280, 342, 22);
      // shelf
      g.fillStyle(0x8a5a3c, 1);
      g.fillRoundedRect(1560, 440, 260, 22, 8);
    });
    this.add.image(0, 0, room).setOrigin(0, 0);
  }

  private place(slot: DecorSlot): void {
    this.decor.get(slot)?.destroy();
    this.decor.delete(slot);
    const id = this.profile.treehouse[slot];
    if (!id) return;
    const at = SLOT_AT[slot];
    const img = itemImage(this, id, at.x, at.y, at.scale);
    img.setDepth(slot === 'rug' ? 0.5 : 1); // rug under everyone, the rest behind the critters
    this.decor.set(slot, img);
  }

  private select(i: number): void {
    this.sel = Phaser.Math.Wrap(i, 0, DECOR_SLOTS.length);
    const slot = DECOR_SLOTS[this.sel];
    const at = SLOT_AT[slot];
    const top = slot === 'ceiling' ? 330 : slot === 'rug' ? 940 : at.y - 160;
    this.marker.setPosition(at.x, top);
    const id = this.profile.treehouse[slot];
    const owned = this.ownedFor(slot);
    const what = id ? itemById(id).name : owned.length ? 'empty — press return' : 'empty — find one in the shop';
    this.label.setText(`${SLOT_NAMES[slot]}: ${what}`);
    sfx.key();
    debug.info = { slot, item: id ?? null, owned: owned.length };
  }

  private ownedFor(slot: DecorSlot): string[] {
    return CATALOG.filter((c) => c.slot === slot && this.profile.owned.includes(c.id)).map((c) => c.id);
  }

  /** Swap this spot to the next decoration you own (then empty, then round again). */
  private async cycle(): Promise<void> {
    const slot = DECOR_SLOTS[this.sel];
    const choices: (string | null)[] = [...this.ownedFor(slot), null];
    if (choices.length === 1) {
      sfx.oops();
      narrator.say(`You don't have a ${SLOT_NAMES[slot].toLowerCase()} yet. Find one in the shop!`);
      return;
    }
    const now = this.profile.treehouse[slot] ?? null;
    const next = choices[(choices.indexOf(now) + 1) % choices.length];
    let badges: ReturnType<typeof awardBadges> = [];
    await store.updateProfile(this.profile.id, (p) => {
      p.treehouse[slot] = next;
      badges = awardBadges(p);
    });
    this.place(slot);
    const img = this.decor.get(slot);
    if (img) this.tweens.add({ targets: img, scale: { from: img.scale * 0.5, to: img.scale }, duration: 300, ease: 'Back.easeOut' });
    sfx.pop();
    narrator.say(next ? itemById(next).name : 'Empty');
    badgeBanners(this, badges, 300);
    this.select(this.sel);
  }

  /** Typing in the treehouse throws a little dance party. */
  private party(ch: string): void {
    sfx.key();
    this.tweens.add({ targets: this.avatar, y: 900, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    for (const l of this.visitors) if (l.char === ch.toLowerCase()) l.dance(3);
    const lamp = this.decor.get('lamp');
    if (lamp) this.tweens.add({ targets: lamp, alpha: 0.6, duration: 120, yoyo: true });
  }
}
