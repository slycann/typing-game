import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { Grumble } from '../art/Grumble';
import { Letterling } from '../art/Letterling';
import { INK, INK_CSS, PALETTE } from '../art/palette';
import { cloud, hills, sky, sun, tree } from '../art/scenery';
import { backdrop, decorate, themeFor } from '../art/themes';
import { KEY_STAGES } from '../curriculum/keyStages';
import { worldById } from '../curriculum/worlds';
import { Avatar } from '../art/Avatar';
import { characterImage } from '../art/textures';
import { FONT_BODY, GAME_W } from '../config';
import { debug } from '../debug';
import { currentProfile, store } from '../state';
import { confetti, enterScene, goTo, onKeys } from './common';

interface Page {
  text: string;
  build: () => void;
}

/** The opening story, told in picture-book pages. Space turns the page. */
export class StoryScene extends Phaser.Scene {
  private page = 0;
  private pages: Page[] = [];
  private layer!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;
  private dots!: Phaser.GameObjects.Graphics;
  private turning = false;
  private story = 'intro';

  constructor() {
    super('Story');
  }

  create(data: { story?: string }): void {
    enterScene(this);
    const profile = currentProfile();
    if (!profile) return void this.scene.start('ProfileSelect');
    this.story = data?.story ?? 'intro';
    this.page = 0;
    this.turning = false;
    this.layer = this.add.container(0, 0);
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.layer.add(o);
      return o;
    };
    const meadow = (dusk = false) => {
      keep(sky(this, dusk ? 0x6b6fd6 : PALETTE.skyTop, dusk ? 0xc9a4f0 : PALETTE.skyBottom));
      if (!dusk) keep(sun(this, 1700, 150, 70));
      keep(cloud(this, 300, 160, 0.8));
      keep(hills(this, 470, dusk ? [0x7cc96a, 0x5fb35a, 0x4a9a4a] : undefined));
      keep(tree(this, 160, 700, 1));
      keep(tree(this, 1780, 680, 0.9));
    };

    const worldPages = (id: number): Page[] => {
      const w = worldById(id);
      const theme = themeFor(id);
      const keys = KEY_STAGES.filter((s) => s.world === id).flatMap((s) => s.keys).slice(0, 8);
      return [
        {
          text: w.story[0],
          build: () => {
            backdrop(this, theme, 470);
            decorate(this, theme, [[160, 760, 1], [1780, 740, 0.9]]);
            keys.forEach((ch, i) => {
              const l = keep(new Letterling(this, 380 + i * 165, 650 + (i % 2) * 50, ch, 110));
              this.tweens.add({ targets: l, y: l.y - 50, duration: 380, yoyo: true, repeat: -1, delay: i * 110, ease: 'Quad.easeOut' });
            });
          },
        },
        {
          text: w.story[1],
          build: () => {
            backdrop(this, theme, 470);
            keep(characterImage(this, 'juni', 640, 800, 1.4));
            const me = keep(new Avatar(this, 1240, 800, profile, 1.4));
            this.tweens.add({ targets: me, y: 750, duration: 300, yoyo: true, repeat: -1, repeatDelay: 400, ease: 'Quad.easeOut' });
            keep(new Grumble(this, 960, 260, 0.8));
          },
        },
      ];
    };
    const finale: Page[] = [
      {
        text: 'You did it! Every Letterling\nin Keyboard Valley is home again!',
        build: () => {
          meadow();
          KEY_STAGES.flatMap((s) => s.keys).filter((k) => /[a-z]/.test(k)).forEach((ch, i) => {
            const l = keep(new Letterling(this, 120 + (i % 13) * 140, 600 + Math.floor(i / 13) * 130, ch, 90));
            this.tweens.add({ targets: l, y: l.y - 40, duration: 300, yoyo: true, repeat: -1, delay: (i % 13) * 60 });
          });
        },
      },
      {
        text: "And Grumble isn't lonely any more.\nHe has more friends than anyone!",
        build: () => {
          meadow();
          const g = keep(new Grumble(this, GAME_W / 2, 330, 1.3));
          g.restMood = 'happy';
          g.setMood('happy');
          'grumble'.split('').forEach((ch, i) => keep(new Letterling(this, 560 + i * 130, 760, ch, 100)).dance(6));
        },
      },
      {
        text: `You're a true Key Keeper, ${profile.name}!\nKeep practising to make every flower bloom.`,
        build: () => {
          meadow();
          keep(characterImage(this, 'qwerty', 560, 800, 1.1));
          keep(characterImage(this, 'juni', 1360, 800, 1.3));
          const me = keep(new Avatar(this, 960, 820, profile, 1.6));
          this.tweens.add({ targets: me, y: 760, duration: 280, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
          this.time.delayedCall(300, () => confetti(this, GAME_W / 2, 200, 120));
        },
      },
    ];

    this.pages = this.story === 'finale' ? finale : this.story.startsWith('world-') ? worldPages(Number(this.story.slice(6))) : [
      {
        text: 'This is Keyboard Valley.\nEvery key is a cosy home for a little Letterling.',
        build: () => {
          meadow();
          'asdfjkl'.split('').forEach((ch, i) => {
            const l = keep(new Letterling(this, 420 + i * 180, 640 + (i % 2) * 40, ch, 120));
            this.tweens.add({ targets: l, y: l.y - 50, duration: 380, yoyo: true, repeat: -1, delay: i * 120, ease: 'Quad.easeOut' });
          });
        },
      },
      {
        text: 'But Grumble the Raincloud was lonely,\nand being lonely made him grumpy.',
        build: () => {
          meadow(true);
          keep(new Grumble(this, GAME_W / 2, 330, 1.3));
          const rain = keep(this.add.graphics());
          rain.lineStyle(6, 0x9fd3ff, 0.8);
          for (let i = 0; i < 40; i++) {
            const x = 700 + Math.random() * 520;
            const y = 450 + Math.random() * 260;
            rain.lineBetween(x, y, x - 8, y + 34);
          }
          this.tweens.add({ targets: rain, y: 40, duration: 500, repeat: -1 });
        },
      },
      {
        text: 'One day he sneezed a GIANT sneeze. AH-CHOO!\nAll the Letterlings blew far, far away!',
        build: () => {
          meadow(true);
          const g = keep(new Grumble(this, 520, 330, 1.2));
          this.time.delayedCall(500, () =>
            g.sneeze(() => {
              sfx.pop();
              this.cameras.main.shake(300, 0.01);
              'asdfjklgh'.split('').forEach((ch, i) => {
                const l = keep(new Letterling(this, 600, 360, ch, 90));
                this.tweens.add({ targets: l, x: 2100 + i * 60, y: Phaser.Math.Between(80, 700), angle: 720, duration: 1600 + i * 120, ease: 'Cubic.easeOut' });
              });
            }),
          );
        },
      },
      {
        text: `Grandpa Qwerty needs a brave new Key Keeper\nto bring them all home. That's you, ${profile.name}!`,
        build: () => {
          meadow();
          keep(characterImage(this, 'qwerty', 700, 780, 1.2));
          const me = keep(new Avatar(this, 1220, 790, profile, 1.5));
          this.tweens.add({ targets: me, y: 740, duration: 300, yoyo: true, repeat: -1, repeatDelay: 400, ease: 'Quad.easeOut' });
          this.sparkleRing(1220, 560);
        },
      },
      {
        text: "I'm Juni! I'll help you.\nLet's start in Home Row Meadow!",
        build: () => {
          meadow();
          const juni = keep(characterImage(this, 'juni', GAME_W / 2, 800, 1.6));
          this.tweens.add({ targets: juni, angle: { from: -4, to: 4 }, duration: 300, yoyo: true, repeat: -1 });
        },
      },
    ];

    const capKey = bake(this, 'story-caption', 1400, 226, (g) => {
      g.fillStyle(INK, 1);
      g.fillRoundedRect(0, 12, 1400, 214, 50);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 1400, 214, 50);
    });
    this.add.image(GAME_W / 2, 860, capKey).setOrigin(0.5, 0).setDepth(100);
    this.caption = this.add
      .text(GAME_W / 2, 950, '', { fontFamily: FONT_BODY, fontSize: '46px', color: INK_CSS, fontStyle: 'bold', align: 'center' })
      .setOrigin(0.5)
      .setDepth(101);
    this.dots = this.add.graphics().setDepth(101);
    this.add
      .text(GAME_W / 2 + 640, 1030, 'space ▶', { fontFamily: FONT_BODY, fontSize: '30px', color: '#ff5fa2', fontStyle: 'bold' })
      .setOrigin(1, 0.5)
      .setDepth(101);
    this.showPage(0);

    onKeys(this, (e) => {
      if (e.type !== 'down' || e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') this.next();
      else if (e.code === 'Escape') this.done();
    });
    this.input.on('pointerdown', () => this.next());
  }

  private showPage(i: number): void {
    this.page = i;
    this.layer.removeAll(true);
    // Everything a page draws goes into the page layer, so turning the page clears it.
    const before = new Set(this.children.list);
    this.pages[i].build();
    for (const o of [...this.children.list]) if (!before.has(o) && o !== this.layer) this.layer.add(o);
    this.caption.setText(this.pages[i].text);
    this.dots.clear();
    this.pages.forEach((_, k) => {
      this.dots.fillStyle(k === i ? PALETTE.hotPink : 0xd9d2ea, 1);
      this.dots.fillCircle(GAME_W / 2 - (this.pages.length - 1) * 20 + k * 40, 1030, 10);
    });
    narrator.say(this.pages[i].text.replace(/\n/g, ' '));
    debug.info = { page: i, pages: this.pages.length };
  }

  private next(): void {
    if (this.turning) return;
    sfx.select();
    if (this.page >= this.pages.length - 1) return this.done();
    this.turning = true;
    this.cameras.main.fadeOut(160, 255, 244, 220);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.showPage(this.page + 1);
      this.cameras.main.fadeIn(200, 255, 244, 220);
      this.turning = false;
    });
  }

  private done(): void {
    const p = currentProfile();
    const id = this.story;
    if (p && !p.seen.includes(id)) void store.updateProfile(p.id, (pr) => pr.seen.push(id));
    if (id.startsWith('world-')) goTo(this, 'WorldMap', { world: Number(id.slice(6)), focus: 1 });
    else goTo(this, 'WorldMap');
  }

  private sparkleRing(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = this.add.star(x + Math.cos(a) * 160, y + Math.sin(a) * 60, 5, 10, 24, PALETTE.yellow);
      this.layer.add(s);
      this.tweens.add({ targets: s, angle: 360, scale: { from: 0.6, to: 1.2 }, duration: 900, yoyo: true, repeat: -1, delay: i * 80 });
    }
  }
}
