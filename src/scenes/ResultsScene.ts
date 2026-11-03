import Phaser from 'phaser';
import { music } from '../audio/Music';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Grumble } from '../art/Grumble';
import { Letterling } from '../art/Letterling';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { cloud, flower, hills, sky, sun } from '../art/scenery';
import { Avatar } from '../art/Avatar';
import { FONT_BODY, FONT_TITLE, GAME_W } from '../config';
import { GAME_SCENES, LAST_WORLD, levelById, type LevelDef } from '../curriculum/worlds';
import { debug } from '../debug';
import type { ResultsData } from '../games/GameBase';
import { BADGES } from '../engine/Achievements';
import { currentProfile, session } from '../state';
import { badgeBanners, banner } from '../ui/Toast';
import { Button } from '../ui/Button';
import { ProfileBadge } from '../ui/Hud';
import { drawStar } from '../ui/OnScreenKeyboard';
import { confetti, enterScene, goTo, onKeys } from './common';

const PRAISE = ['Super typing!', 'Wow, great job!', "You're a keyboard star!", 'Hooray!', 'Brilliant!', 'Fantastic fingers!'];

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(data: ResultsData): void {
    enterScene(this);
    music.play('title');
    const profile = currentProfile()!;
    const level = levelById(data.levelId);
    const boss = level.game === 'boss';
    sky(this);
    sun(this, 1760, 140, 70);
    cloud(this, 300, 150, 0.8);
    cloud(this, 1300, 110, 0.6);
    if (boss) this.drawRainbow();
    hills(this, 520);
    [[220, 900, PALETTE.pink], [420, 960, PALETTE.yellow], [1500, 930, PALETTE.purple], [1700, 980, PALETTE.red]].forEach(([x, y, c]) => flower(this, x, y, c, 1.1));

    const badge = new ProfileBadge(this, profile);
    const avatar = new Avatar(this, 300, 1010, profile, 1.25);
    this.tweens.add({ targets: avatar, y: 960, duration: 280, yoyo: true, repeat: -1, ease: 'Quad.easeOut', repeatDelay: 300 });

    // The big panel with stars
    const panelKey = bake(this, 'results-panel', 1000, 474, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 14, 1000, 460, 60);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 1000, 460, 60);
    });
    this.add.image(GAME_W / 2, 90, panelKey).setOrigin(0.5, 0);
    const title = boss ? 'Grumble is happy!' : data.stars === 3 ? 'Perfect!' : 'Level complete!';
    this.add.text(GAME_W / 2, 160, title, { fontFamily: FONT_TITLE, fontSize: '78px', color: '#ff5fa2', stroke: INK_CSS, strokeThickness: 10 }).setOrigin(0.5);
    for (let i = 0; i < 3; i++) {
      const on = i < data.stars;
      const key = bake(this, `results-star-${on ? 'on' : 'off'}`, 180, 180, (g) => {
        g.fillStyle(INK, 0.25);
        drawStar(g, 90, 96, 5, 82, 38);
        g.fillStyle(on ? PALETTE.yellow : 0xe8e2f5, 1);
        drawStar(g, 90, 90, 5, 80, 37);
      });
      const star = this.add.image(GAME_W / 2 - 200 + i * 200, 300, key).setScale(0);
      this.tweens.add({ targets: star, scale: 1, angle: 360, delay: 300 + i * 300, duration: 450, ease: 'Back.easeOut', onStart: () => on && sfx.good(i * 2) });
    }
    const lines = [`${data.correct} keys right!   Best streak: ${data.bestStreak}`, `+${data.coins} coins${data.rainbow ? ' (rainbow x2!)' : ''}${data.newBest && !data.firstClear ? '   New best!' : ''}`];
    this.add.text(GAME_W / 2, 440, lines.join('\n'), { fontFamily: FONT_BODY, fontSize: '42px', color: INK_CSS, fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
    badge.flyCoins(GAME_W / 2, 470, data.coins, 1200);

    // Who came home
    let rescuedLine = '';
    if (boss) {
      const g = new Grumble(this, 1450, 640, 0.9);
      g.restMood = 'happy';
      g.setMood('happy');
      rescuedLine = "You cheered up Grumble! He isn't grumpy any more.";
    } else if (data.newStickers.length) {
      data.newStickers.forEach((k, i) => {
        const l = new Letterling(this, 1300 + i * 170, 1100, k, 130);
        this.tweens.add({ targets: l, y: 900, delay: 1000 + i * 250, duration: 500, ease: 'Back.easeOut', onComplete: () => l.dance(3) });
      });
      rescuedLine = `You brought ${data.newStickers.map((k) => narrator.nameOf(k)).join(' and ')} home!`;
    }

    new Button(this, GAME_W / 2 - 230, 640, 'Play again', () => this.again(level.game, level.id), { width: 400, height: 120, fontSize: 48, color: PALETTE.blue, keyHint: 'space' });
    new Button(this, GAME_W / 2 + 230, 640, 'Map', () => this.toMap(level, data.firstClear), { width: 340, height: 120, fontSize: 48, color: PALETTE.green, keyHint: 'return' });

    sfx.cheer();
    this.time.delayedCall(200, () => confetti(this, GAME_W / 2, 300, 90));
    const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    this.time.delayedCall(500, () =>
      narrator.say(`${praise} You got ${data.stars} star${data.stars === 1 ? '' : 's'}! ${rescuedLine} Press return to go back to the map.`),
    );
    // Big news, one banner at a time.
    let at = 2600;
    if (data.rankUp) {
      banner(this, `Rank up! You're now ${/^[AEIOU]/.test(data.rankUp) ? 'an' : 'a'} ${data.rankUp}!`, 'Keep typing to grow!', at, false);
      at += 3600;
    }
    if (data.dailyDone) {
      banner(this, "Today's adventure done!", '+15 bonus coins!', at, false);
      at += 3600;
    }
    badgeBanners(this, BADGES.filter((b) => data.newBadges.includes(b.id)), at);
    if (!session.breakReminded && Date.now() - session.startedAt > 15 * 60 * 1000) {
      session.breakReminded = true;
      this.time.delayedCall(at + data.newBadges.length * 3600, () => {
        banner(this, 'Time for a stretch!', 'Wiggle your fingers and have a drink of water.', 0, true);
      });
    }
    debug.info = { stars: data.stars, coins: data.coins, rescued: data.newStickers, badges: data.newBadges, dailyDone: data.dailyDone };

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Space') this.again(level.game, level.id);
      else if (e.code === 'Enter' || e.code === 'Escape') this.toMap(level, data.firstClear);
    });
  }

  private again(game: keyof typeof GAME_SCENES, levelId: string): void {
    sfx.select();
    goTo(this, GAME_SCENES[game], { levelId });
  }

  private toMap(level: LevelDef, firstClear: boolean): void {
    sfx.select();
    const p = currentProfile();
    if (level.game === 'boss' && level.world === LAST_WORLD && p && !p.seen.includes('finale')) return goTo(this, 'Story', { story: 'finale' });
    // After cheering up Grumble the first time, stand by the newly opened portal.
    if (level.game === 'boss' && firstClear) return goTo(this, 'WorldMap', { world: level.world, focus: 13 });
    goTo(this, 'WorldMap', { world: level.world });
  }

  private drawRainbow(): void {
    const key = bake(this, 'rainbow', 900, 470, (g) => {
      const colors = [0xff5d5d, 0xff9a3c, 0xffd23f, 0x3ccf6e, 0x3a86ff, 0x9b5de5];
      colors.forEach((c, i) => {
        g.lineStyle(26, c, 1);
        g.beginPath();
        g.arc(450, 460, 430 - i * 26, Math.PI, 0, false);
        g.strokePath();
      });
    });
    const r = this.add.image(1450, 720, key).setOrigin(0.5, 1).setAlpha(0);
    this.tweens.add({ targets: r, alpha: 0.9, duration: 1200 });
  }
}
