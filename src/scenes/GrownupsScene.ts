import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { critterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { totalStars } from '../engine/Progress';
import type { Profile } from '../save/types';
import { session, store } from '../state';
import { Button } from '../ui/Button';
import { enterScene, goTo, onKeys } from './common';

type Mode = 'gate' | 'manage' | 'confirm';

/**
 * For grown-ups only: a parental gate (a times-table question young children can't answer),
 * then tools to start a player over or delete them.
 */
export class GrownupsScene extends Phaser.Scene {
  private mode: Mode = 'gate';
  private answer = 0;
  private typed = '';
  private layer!: Phaser.GameObjects.Container;
  private rows: { profile: Profile; ring: Phaser.GameObjects.Image }[] = [];
  private sel = 0;
  private pending: { kind: 'reset' | 'delete'; profile: Profile } | null = null;
  private onModeKey: ((code: string, char: string | null) => void) | null = null;

  constructor() {
    super('Grownups');
  }

  create(): void {
    enterScene(this);
    narrator.stop();
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x5a46c9).setOrigin(0, 0);
    const dots = bake(this, 'grownup-dots', GAME_W, GAME_H, (g) => {
      g.fillStyle(0x6b58d6, 1);
      for (let y = 30; y < GAME_H; y += 80) for (let x = (y / 80) % 2 ? 70 : 30; x < GAME_W; x += 80) g.fillCircle(x, y, 10);
    });
    this.add.image(0, 0, dots).setOrigin(0, 0);
    this.add.text(GAME_W / 2, 90, 'For grown-ups', { fontFamily: FONT_TITLE, fontSize: '84px', color: '#ffffff', stroke: INK_CSS, strokeThickness: 12 }).setOrigin(0.5);
    new Button(this, GAME_W - 150, 90, 'Done', () => this.leave(), { width: 240, height: 96, fontSize: 42, color: PALETTE.teal, keyHint: 'esc' });
    this.layer = this.add.container(0, 0);
    this.showGate();

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Escape') {
        if (this.mode === 'confirm') return this.showManage();
        return this.leave();
      }
      this.onModeKey?.(e.code, e.char);
    });
  }

  private leave(): void {
    sfx.select();
    goTo(this, store.profiles.length ? 'ProfileSelect' : 'Title');
  }

  private clear(): void {
    this.layer.removeAll(true);
    this.rows = [];
    this.onModeKey = null;
  }

  private panel(w: number, h: number, y: number): void {
    const key = bake(this, `grownup-panel-${w}x${h}`, w, h + 14, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 14, w, h, 40);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, w, h, 40);
    });
    this.layer.add(this.add.image(GAME_W / 2, y, key).setOrigin(0.5, 0));
  }

  private text(x: number, y: number, s: string, size: number, color = INK_CSS, bold = true): Phaser.GameObjects.Text {
    const t = this.add
      .text(x, y, s, { fontFamily: FONT_BODY, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', align: 'center', wordWrap: { width: 1100 } })
      .setOrigin(0.5);
    this.layer.add(t);
    return t;
  }

  // ---- parental gate -------------------------------------------------------------------

  private showGate(message = ''): void {
    this.clear();
    this.mode = 'gate';
    const a = Phaser.Math.Between(6, 9);
    const b = Phaser.Math.Between(6, 9);
    this.answer = a * b;
    this.typed = '';
    this.panel(1000, 520, 220);
    this.text(GAME_W / 2, 300, 'Grown-ups only! Please answer:', 42);
    this.text(GAME_W / 2, 420, `What is ${a} × ${b}?`, 90, '#5a46c9');
    const box = this.text(GAME_W / 2, 560, '_', 90, INK_CSS);
    this.text(GAME_W / 2, 680, message || 'Type the answer, then press return.', 34, message ? '#e0457b' : '#7a6a9a', !!message);
    debug.info = { mode: 'gate', answer: this.answer };
    this.onModeKey = (code, char) => {
      if (code === 'Backspace') this.typed = this.typed.slice(0, -1);
      else if (code === 'Enter') {
        if (Number(this.typed) === this.answer) {
          sfx.select();
          return this.showManage();
        }
        sfx.oops();
        return this.showGate('Not quite. Here is a new question.');
      } else if (char && /^\d$/.test(char) && this.typed.length < 3) this.typed += char;
      box.setText(this.typed || '_');
    };
  }

  // ---- manage players --------------------------------------------------------------------

  private showManage(): void {
    this.clear();
    this.mode = 'manage';
    this.pending = null;
    const players = [...store.profiles];
    if (!players.length) {
      this.panel(1000, 260, 300);
      this.text(GAME_W / 2, 430, 'There are no players on this device.', 44);
      debug.info = { mode: 'manage', players: 0 };
      return;
    }
    this.text(GAME_W / 2, 190, '↑ ↓ choose a player   ·   R = start over   ·   delete = remove player', 32, '#ffffff');
    this.sel = Phaser.Math.Clamp(this.sel, 0, players.length - 1);
    players.forEach((p, i) => this.makeRow(p, i));
    this.highlight();
    debug.info = { mode: 'manage', players: players.length };
    this.onModeKey = (code) => {
      if (code === 'ArrowDown') this.sel = Math.min(players.length - 1, this.sel + 1);
      else if (code === 'ArrowUp') this.sel = Math.max(0, this.sel - 1);
      else if (code === 'KeyR') return this.confirm('reset', players[this.sel]);
      else if (code === 'Backspace' || code === 'Delete') return this.confirm('delete', players[this.sel]);
      this.highlight();
    };
  }

  private makeRow(p: Profile, i: number): void {
    const y = 300 + i * 128;
    const w = 1360;
    const h = 112;
    const card = bake(this, `grownup-row-${w}`, w, h + 8, (g) => {
      g.fillStyle(darken(0xffffff, 0.2), 1);
      g.fillRoundedRect(0, 8, w, h, 30);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, w, h, 30);
    });
    const ringKey = bake(this, `grownup-ring-${w}`, w + 24, h + 32, (g) => {
      g.lineStyle(10, 0xfff27a, 1);
      g.strokeRoundedRect(5, 5, w + 14, h + 18, 36);
    });
    const left = GAME_W / 2 - w / 2;
    const ring = this.add.image(GAME_W / 2, y, ringKey).setVisible(false);
    this.layer.add([ring, this.add.image(GAME_W / 2, y, card).setOrigin(0.5, h / 2 / (h + 8))]);
    this.layer.add(critterImage(this, left + 70, y + 52, p.animal, p.outfit, 0.33));
    const name = this.add.text(left + 140, y - 18, p.name, { fontFamily: FONT_TITLE, fontSize: '44px', color: INK_CSS }).setOrigin(0, 0.5);
    const mins = Math.round(p.playMs / 60000);
    const stats = `★ ${totalStars(p)}   ● ${p.coins}   ·   age ${p.ageBand.replace('-', '–')}   ·   ${mins} min played`;
    const sub = this.add.text(left + 140, y + 28, stats, { fontFamily: FONT_BODY, fontSize: '30px', color: '#7a6a9a', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.layer.add([name, sub]);
    const reset = new Button(this, left + w - 410, y, 'Start over', () => this.confirm('reset', p), { width: 300, height: 84, fontSize: 36, color: PALETTE.orange });
    const del = new Button(this, left + w - 140, y, 'Delete', () => this.confirm('delete', p), { width: 220, height: 84, fontSize: 36, color: PALETTE.red });
    this.layer.add([reset, del]);
    this.rows.push({ profile: p, ring });
  }

  private highlight(): void {
    this.rows.forEach((r, i) => r.ring.setVisible(i === this.sel));
  }

  // ---- confirm ---------------------------------------------------------------------------

  private confirm(kind: 'reset' | 'delete', profile: Profile): void {
    sfx.select();
    this.clear();
    this.mode = 'confirm';
    this.pending = { kind, profile };
    this.panel(1100, 520, 240);
    const title = kind === 'delete' ? `Delete ${profile.name}?` : `Start ${profile.name} over?`;
    const body =
      kind === 'delete'
        ? `This removes ${profile.name} from this device, along with all of their stars, coins, rescued Letterlings and scores. This can't be undone.`
        : `${profile.name} keeps their name, critter and age, but all stars, coins, rescued Letterlings and scores go back to zero. This can't be undone.`;
    this.text(GAME_W / 2, 330, title, 64, kind === 'delete' ? '#e0457b' : '#e07a1f');
    this.text(GAME_W / 2, 470, body, 36, INK_CSS, false);
    const yesLabel = kind === 'delete' ? 'Yes, delete' : 'Yes, start over';
    this.layer.add(new Button(this, GAME_W / 2 - 230, 640, yesLabel, () => void this.doIt(), { width: 400, height: 110, fontSize: 42, color: kind === 'delete' ? PALETTE.red : PALETTE.orange, keyHint: 'Y' }));
    this.layer.add(new Button(this, GAME_W / 2 + 230, 640, 'Cancel', () => this.showManage(), { width: 340, height: 110, fontSize: 42, color: PALETTE.green, keyHint: 'N' }));
    debug.info = { mode: 'confirm', kind, player: profile.name };
    this.onModeKey = (code) => {
      if (code === 'KeyY') void this.doIt();
      else if (code === 'KeyN') this.showManage();
    };
  }

  private async doIt(): Promise<void> {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.onModeKey = null;
    if (p.kind === 'delete') {
      await store.deleteProfile(p.profile.id);
      if (session.profileId === p.profile.id) session.profileId = null;
    } else {
      await store.resetProgress(p.profile.id);
    }
    sfx.pop();
    this.showManage();
  }
}
