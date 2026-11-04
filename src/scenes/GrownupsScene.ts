import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { INK, INK_CSS, PALETTE, darken } from '../art/palette';
import { critterImage } from '../art/textures';
import { FONT_BODY, FONT_TITLE, GAME_H, GAME_W } from '../config';
import { debug } from '../debug';
import { bloomTexture } from '../art/blooms';
import { WORLDS } from '../curriculum/worlds';
import { rankFor } from '../engine/Achievements';
import { dayKey as todayKey, lastWeek } from '../engine/Daily';
import { masteryOf, strengthOf, unlockedKeys } from '../engine/Mastery';
import { totalStars } from '../engine/Progress';
import { strokeForChar } from '../input/keyLayout';
import { applySettings, updateSettings } from '../settings';
import { OnScreenKeyboard } from '../ui/OnScreenKeyboard';
import type { Settings } from '../save/types';
import type { Profile } from '../save/types';
import { session, store } from '../state';
import { Button } from '../ui/Button';
import { enterScene, goTo, onKeys } from './common';

type Mode = 'gate' | 'manage' | 'confirm' | 'progress' | 'settings' | 'backup';

const TABS = ['Players', 'Progress', 'Settings', 'Backup'];
const LIMITS = [0, 15, 30, 45, 60, 90];

/**
 * The Parent Zone, for grown-ups only: a parental gate (a times-table question young children
 * can't answer), then players (start over / delete), progress reports, settings and backups.
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
  private tabButtons: Button[] = [];
  private reportFor = 0;
  private setSel = 0;

  constructor() {
    super('Grownups');
  }

  create(): void {
    enterScene(this);
    music.play('calm');
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
    this.tabButtons = [];
    this.showGate();

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Escape') {
        if (this.mode === 'confirm') return this.showManage();
        return this.leave();
      }
      if (this.mode !== 'gate' && this.mode !== 'confirm' && /^Digit[1-4]$/.test(e.code)) return this.showTab(Number(e.code.slice(5)) - 1);
      this.onModeKey?.(e.code, e.char);
    });
  }

  private showTab(i: number): void {
    if (!this.tabButtons.length) {
      this.tabButtons = TABS.map((t, k) =>
        new Button(this, GAME_W / 2 - 480 + k * 320, 190, `${k + 1} ${t}`, () => this.showTab(k), { width: 290, height: 80, fontSize: 36, color: [PALETTE.hotPink, PALETTE.blue, PALETTE.green, PALETTE.orange][k] }),
      );
    }
    this.tabButtons.forEach((b, k) => b.setFocused(k === i));
    sfx.select();
    if (i === 0) this.showManage();
    else if (i === 1) this.showProgress();
    else if (i === 2) this.showSettings();
    else this.showBackup();
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
          return this.showTab(0);
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
      this.panel(1000, 260, 320);
      this.text(GAME_W / 2, 450, 'There are no players on this device.', 44);
      debug.info = { mode: 'manage', players: 0 };
      return;
    }
    this.text(GAME_W / 2, 270, '↑ ↓ choose a player   ·   R = start over   ·   delete = remove player', 30, '#ffffff');
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
    const y = 360 + i * 120;
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

  // ---- progress report ---------------------------------------------------------------------

  private showProgress(): void {
    this.clear();
    this.mode = 'progress';
    const players = store.profiles;
    if (!players.length) {
      this.panel(1000, 260, 320);
      this.text(GAME_W / 2, 450, 'There are no players on this device.', 44);
      return;
    }
    this.reportFor = Phaser.Math.Wrap(this.reportFor, 0, players.length);
    const p = players[this.reportFor];
    this.panel(1760, 790, 250);
    const left = GAME_W / 2 - 840;
    this.layer.add(critterImage(this, left + 70, 400, p.animal, p.outfit, 0.45));
    const nav = players.length > 1 ? '   ◀ ▶ other players' : '';
    this.layer.add(this.add.text(left + 150, 300, `${p.name}${nav}`, { fontFamily: FONT_TITLE, fontSize: '48px', color: INK_CSS }).setOrigin(0, 0.5));
    const best = Math.max(0, ...Object.values(p.bestSpeed));
    const total = WORLDS.length * 12 * 3;
    const lines = [
      `Age ${p.ageBand.replace('-', '–')}  ·  Rank: ${rankFor(p.xp).name}  ·  ${Math.round(p.playMs / 60000)} minutes played`,
      `★ ${totalStars(p)} of ${total} stars  ·  best streak ${p.bestStreak}  ·  best race ${best ? `${best.toFixed(1)} wpm` : '—'}`,
    ];
    this.layer.add(this.add.text(left + 150, 362, lines.join('\n'), { fontFamily: FONT_BODY, fontSize: '27px', color: '#5a4a7a', fontStyle: 'bold', lineSpacing: 8 }).setOrigin(0, 0.5));

    // Stars per world
    WORLDS.forEach((w, i) => {
      const y = 470 + i * 72;
      const got = w.levels.reduce((a, l) => a + (p.stars[l.id] ?? 0), 0);
      this.layer.add(this.add.text(left + 30, y, w.name, { fontFamily: FONT_BODY, fontSize: '26px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5));
      const bar = this.add.graphics();
      bar.fillStyle(0xe8e2f5, 1);
      bar.fillRoundedRect(left + 330, y - 14, 300, 28, 14);
      if (got) {
        bar.fillStyle(PALETTE.green, 1);
        bar.fillRoundedRect(left + 330, y - 14, Math.max(28, (300 * got) / 36), 28, 14);
      }
      this.layer.add([bar, this.add.text(left + 645, y, `${got}/36`, { fontFamily: FONT_BODY, fontSize: '24px', color: '#7a6a9a', fontStyle: 'bold' }).setOrigin(0, 0.5)]);
    });

    // Every key's flower on a keyboard, plus what to practise next
    const keys = unlockedKeys(p);
    const kb = new OnScreenKeyboard(this, left + 800, 450, { width: 880 });
    this.layer.add(kb);
    for (const k of keys) {
      const st = strokeForChar(k);
      if (st) kb.setBadge(st.code, bloomTexture(this, masteryOf(p.keyStats[k])));
    }
    const tried = keys.filter((k) => (p.keyStats[k]?.hits ?? 0) + (p.keyStats[k]?.misses ?? 0) >= 3);
    const byStrength = [...tried].sort((a, b) => strengthOf(p.keyStats[a]) - strengthOf(p.keyStats[b]));
    const show = (ks: string[]) => (ks.length ? ks.map((k) => (k === ' ' ? 'space' : k)).join('  ') : '—');
    // Weaker half to practise, stronger half going great (no key in both lists).
    const practise = byStrength.slice(0, Math.min(6, Math.ceil(byStrength.length / 2)));
    const great = byStrength.slice(practise.length).reverse().slice(0, 6);
    const report = [`Practise next:  ${show(practise)}`, `Going great:  ${show(great)}`, `Flowers grow: seed → sprout → bud → flower → bloom`];
    this.layer.add(this.add.text(left + 800, 800, report.join('\n'), { fontFamily: FONT_BODY, fontSize: '27px', color: INK_CSS, fontStyle: 'bold', lineSpacing: 10 }).setOrigin(0, 0));
    const week = lastWeek(p);
    this.layer.add(this.add.text(left + 30, 975, `This week: ${week.map((d) => (d ? '●' : '○')).join(' ')}  (played ${week.filter(Boolean).length} of the last 7 days)`, { fontFamily: FONT_BODY, fontSize: '26px', color: '#5a4a7a', fontStyle: 'bold' }).setOrigin(0, 0.5));
    debug.info = { mode: 'progress', player: p.name, practise, great };
    this.onModeKey = (code) => {
      if (code === 'ArrowRight') this.reportFor++;
      else if (code === 'ArrowLeft') this.reportFor--;
      else return;
      this.showProgress();
    };
  }

  // ---- settings -------------------------------------------------------------------------

  private settingRows(): { label: string; value: (s: Settings) => string; change: (s: Settings, dir: number) => Partial<Settings> }[] {
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const step = (v: number, dir: number) => Math.round(Phaser.Math.Clamp(v + dir * 0.1, 0, 1) * 10) / 10;
    const onOff = (b: boolean) => (b ? 'On' : 'Off');
    return [
      { label: 'Sound effects', value: (s) => pct(s.volume), change: (s, d) => ({ volume: step(s.volume, d) }) },
      { label: 'Music', value: (s) => pct(s.musicVolume), change: (s, d) => ({ musicVolume: step(s.musicVolume, d) }) },
      { label: 'Read everything aloud', value: (s) => onOff(s.voice), change: (s) => ({ voice: !s.voice }) },
      { label: 'Mute all sound', value: (s) => onOff(s.muted), change: (s) => ({ muted: !s.muted }) },
      { label: 'Reduce motion', value: (s) => onOff(s.reduceMotion), change: (s) => ({ reduceMotion: !s.reduceMotion }) },
      { label: 'Always show key letters and glow', value: (s) => onOff(s.alwaysHints), change: (s) => ({ alwaysHints: !s.alwaysHints }) },
      { label: 'Easy-read text (bigger, spaced out)', value: (s) => onOff(s.easyRead), change: (s) => ({ easyRead: !s.easyRead }) },
      {
        label: 'Daily play limit (all players)',
        value: (s) => (s.dailyLimitMin ? `${s.dailyLimitMin} min` : 'No limit'),
        change: (s, d) => ({ dailyLimitMin: LIMITS[Phaser.Math.Wrap(LIMITS.indexOf(s.dailyLimitMin) + d, 0, LIMITS.length)] }),
      },
      {
        label: 'Played today — press → to give 15 more minutes',
        value: (s) => `${s.limitDay === todayKey() ? s.playedToday : 0} min`,
        change: (s, d) => (d > 0 ? { playedToday: Math.max(0, s.playedToday - 15) } : {}),
      },
    ];
  }

  private showSettings(): void {
    this.clear();
    this.mode = 'settings';
    const rows = this.settingRows();
    this.setSel = Phaser.Math.Clamp(this.setSel, 0, rows.length - 1);
    this.panel(1400, 790, 250);
    const s = store.data.settings;
    rows.forEach((r, i) => {
      const y = 310 + i * 78;
      const on = i === this.setSel;
      if (on) {
        const hl = this.add.graphics();
        hl.fillStyle(0xfff3b0, 1);
        hl.fillRoundedRect(GAME_W / 2 - 660, y - 34, 1320, 68, 22);
        this.layer.add(hl);
      }
      this.layer.add(this.add.text(GAME_W / 2 - 620, y, r.label, { fontFamily: FONT_BODY, fontSize: '32px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5));
      const minus = new Button(this, GAME_W / 2 + 330, y, '◀', () => void this.changeSetting(i, -1), { width: 70, height: 56, fontSize: 28, color: PALETTE.purple });
      const plus = new Button(this, GAME_W / 2 + 610, y, '▶', () => void this.changeSetting(i, 1), { width: 70, height: 56, fontSize: 28, color: PALETTE.purple });
      this.layer.add([minus, plus, this.add.text(GAME_W / 2 + 470, y, r.value(s), { fontFamily: FONT_TITLE, fontSize: '32px', color: '#5a46c9' }).setOrigin(0.5)]);
    });
    this.text(GAME_W / 2, 1000, '↑ ↓ choose  ·  ← → change  ·  changes save straight away', 26, '#7a6a9a');
    debug.info = { mode: 'settings', sel: this.setSel, settings: { ...s } };
    this.onModeKey = (code) => {
      if (code === 'ArrowDown') this.setSel = Math.min(rows.length - 1, this.setSel + 1);
      else if (code === 'ArrowUp') this.setSel = Math.max(0, this.setSel - 1);
      else if (code === 'ArrowRight' || code === 'Enter') return void this.changeSetting(this.setSel, 1);
      else if (code === 'ArrowLeft') return void this.changeSetting(this.setSel, -1);
      else return;
      sfx.key();
      this.showSettings();
    };
  }

  private async changeSetting(i: number, dir: number): Promise<void> {
    this.setSel = i;
    const s = store.data.settings;
    const change = this.settingRows()[i].change(s, dir);
    if (i === 8 && s.limitDay !== todayKey()) change.limitDay = todayKey();
    await updateSettings(change);
    sfx.select();
    this.showSettings();
  }

  // ---- backup ---------------------------------------------------------------------------

  private showBackup(message = ''): void {
    this.clear();
    this.mode = 'backup';
    this.panel(1300, 600, 280);
    this.text(GAME_W / 2, 380, 'Keep a copy of everyone\'s progress, or move it to another computer.', 34);
    this.text(GAME_W / 2, 440, 'Progress is saved only on this device. Nothing is sent anywhere.', 28, '#7a6a9a');
    this.layer.add(new Button(this, GAME_W / 2 - 280, 580, 'Save a backup', () => this.download(), { width: 460, height: 110, fontSize: 40, color: PALETTE.green, keyHint: 'S' }));
    this.layer.add(new Button(this, GAME_W / 2 + 280, 580, 'Load a backup', () => this.upload(), { width: 460, height: 110, fontSize: 40, color: PALETTE.orange, keyHint: 'L' }));
    this.text(GAME_W / 2, 720, 'Loading a backup replaces all players on this device.', 28, '#e07a1f');
    if (message) this.text(GAME_W / 2, 810, message, 34, '#1f9e4a');
    debug.info = { mode: 'backup', message };
    this.onModeKey = (code) => {
      if (code === 'KeyS') this.download();
      else if (code === 'KeyL') this.upload();
    };
  }

  private download(): void {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `letterlings-backup-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    sfx.select();
    this.showBackup('Backup saved to your Downloads folder.');
  }

  private upload(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        await store.importJson(await file.text());
        session.profileId = null;
        applySettings();
        sfx.cheer();
        this.showBackup(`Loaded! ${store.profiles.length} player${store.profiles.length === 1 ? '' : 's'} restored.`);
      } catch (err) {
        sfx.oops();
        this.showBackup(`That file didn't work: ${(err as Error).message}`);
      }
    };
    input.click();
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
