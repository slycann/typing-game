import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake, gradient } from '../art/bake';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { debug } from '../debug';
import { boardKey, TIER_NAMES, type SpeedTier } from '../engine/Leaderboard';
import { store } from '../state';
import { Button } from '../ui/Button';
import { confetti, enterScene, goTo, onKeys } from './common';

const MEDALS = [0xffd23f, 0xd6dbe8, 0xe0a26a];

/** The Rocket Race champions on this device, one board per race type. */
export class LeaderboardScene extends Phaser.Scene {
  private boards: string[] = [];
  private idx = 0;
  private highlight = 0;
  private layer!: Phaser.GameObjects.Container;
  private title!: Phaser.GameObjects.Text;

  constructor() {
    super('Leaderboard');
  }

  create(data: { board?: string; highlight?: number }): void {
    enterScene(this);
    this.highlight = data?.highlight ?? 0;
    const tiers: SpeedTier[] = ['home-row', 'letters', 'pro'];
    const all = tiers.flatMap((t) => [boardKey(t, 30), boardKey(t, 60)]);
    this.boards = all.filter((b) => (store.data.leaderboards[b]?.length ?? 0) > 0 || b === data?.board);
    if (!this.boards.length) this.boards = [boardKey('home-row', 30)];
    this.idx = Math.max(0, this.boards.indexOf(data?.board ?? ''));

    this.add.image(0, 0, gradient(this, 'board-sky', GAME_W, 1080, [[0, 0x2d2a6e], [1, 0x7b6cf6]])).setOrigin(0, 0);
    this.add.text(GAME_W / 2, 80, 'Rocket Race Champions', { fontFamily: FONT_TITLE, fontSize: '84px', color: '#ffd23f', stroke: INK_CSS, strokeThickness: 13 }).setOrigin(0.5);
    this.title = this.add.text(GAME_W / 2, 170, '', { fontFamily: FONT_BODY, fontSize: '40px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
    this.layer = this.add.container(0, 0);
    new Button(this, GAME_W / 2 - 230, 1000, 'Race again', () => goTo(this, 'SpeedRace'), { width: 400, height: 110, fontSize: 44, color: PALETTE.red, keyHint: 'space' });
    new Button(this, GAME_W / 2 + 230, 1000, 'Map', () => goTo(this, 'WorldMap'), { width: 340, height: 110, fontSize: 44, color: PALETTE.green, keyHint: 'return' });
    this.render();
    narrator.say('Rocket Race Champions!');

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'ArrowRight' && this.boards.length > 1) this.flip(1);
      else if (e.code === 'ArrowLeft' && this.boards.length > 1) this.flip(-1);
      else if (e.code === 'Space') goTo(this, 'SpeedRace');
      else if (e.code === 'Enter' || e.code === 'Escape') goTo(this, 'WorldMap');
    });
  }

  private flip(dir: number): void {
    sfx.key();
    this.idx = Phaser.Math.Wrap(this.idx + dir, 0, this.boards.length);
    this.render();
  }

  private render(): void {
    this.layer.removeAll(true);
    const key = this.boards[this.idx];
    const [, tier, secs] = key.match(/^speed-(.+)-(\d+)$/)!;
    const arrows = this.boards.length > 1 ? '◀  ' : '';
    this.title.setText(`${arrows}${TIER_NAMES[tier as SpeedTier]} · ${secs} seconds${arrows ? '  ▶' : ''}`);
    const board = store.data.leaderboards[key] ?? [];
    const rowKey = bake(this, 'board-row', 1100, 66, (g) => {
      g.fillStyle(0xffffff, 0.92);
      g.fillRoundedRect(0, 0, 1100, 66, 33);
    });
    const hiKey = bake(this, 'board-row-hi', 1100, 66, (g) => {
      g.fillStyle(PALETTE.yellow, 1);
      g.fillRoundedRect(0, 0, 1100, 66, 33);
    });
    if (!board.length) {
      this.layer.add(this.add.text(GAME_W / 2, 500, 'No races yet. Be the first!', { fontFamily: FONT_BODY, fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    }
    let highlighted = -1;
    board.forEach((e, i) => {
      const y = 260 + i * 72;
      const hi = e.at === this.highlight;
      if (hi) highlighted = i;
      const row = this.add.image(GAME_W / 2, y, hi ? hiKey : rowKey);
      const medal = this.add.circle(GAME_W / 2 - 500, y, 24, i < 3 ? MEDALS[i] : 0xb9b3c9).setStrokeStyle(4, INK);
      const rank = this.add.text(GAME_W / 2 - 500, y, String(i + 1), { fontFamily: FONT_TITLE, fontSize: '30px', color: INK_CSS }).setOrigin(0.5);
      const name = this.add.text(GAME_W / 2 - 420, y, e.initials, { fontFamily: FONT_TITLE, fontSize: '46px', color: INK_CSS }).setOrigin(0, 0.5);
      const score = this.add.text(GAME_W / 2 + 120, y, `${e.score.toFixed(1)}`, { fontFamily: FONT_TITLE, fontSize: '46px', color: '#7a5fc0' }).setOrigin(1, 0.5);
      const detail = this.add.text(GAME_W / 2 + 160, y, `${(e.wpm ?? e.score).toFixed(1)} wpm · ${Math.round((e.accuracy ?? 1) * 100)}%`, { fontFamily: FONT_BODY, fontSize: '30px', color: INK_CSS, fontStyle: 'bold' }).setOrigin(0, 0.5);
      const parts = [row, medal, rank, name, score, detail];
      this.layer.add(parts);
      for (const o of parts) {
        const t = o as Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject;
        t.x += 1400;
        this.tweens.add({ targets: t, x: t.x - 1400, delay: 60 * i, duration: 380, ease: 'Back.easeOut' });
      }
      if (hi) this.tweens.add({ targets: row, alpha: 0.6, duration: 400, yoyo: true, repeat: -1 });
    });
    if (highlighted >= 0 && highlighted < 3) confetti(this, GAME_W / 2, 260 + highlighted * 72, 80);
    debug.info = { board: key, entries: board.map((e) => e.initials), highlighted };
  }
}
