import Phaser from 'phaser';
import { narrator } from '../audio/Narrator';
import { sfx } from '../audio/Sfx';
import { bake } from '../art/bake';
import { ANIMALS } from '../art/critters';
import { fingerFriendImage } from '../art/friends';
import { Grumble } from '../art/Grumble';
import { Letterling } from '../art/Letterling';
import { INK_CSS, OUTFIT_COLORS, PALETTE } from '../art/palette';
import { characterImage, critterImage } from '../art/textures';
import { itemImage } from '../art/items';
import { tree } from '../art/scenery';
import { FONT_BODY, GAME_W } from '../config';
import type { Finger } from '../input/keyLayout';
import type { AnimalKind } from '../save/types';
import { TypingLine } from '../ui/TypingLine';
import { SequenceGame } from './SequenceGame';

const BOOK_Y = 325;
const PIC_X = GAME_W / 2 - 400;
const TEXT_X = GAME_W / 2 + 400;

const ANIMAL_WORDS: Record<string, AnimalKind> = { cat: 'kitten', cats: 'kitten', kitten: 'kitten', dog: 'puppy', dogs: 'puppy', puppy: 'puppy', duck: 'duckling', ducks: 'duckling', bunny: 'bunny', bear: 'bear' };
const FRIEND_NAMES: Record<string, Finger> = { Pip: 'pinky', Rory: 'ring', Midge: 'middle', Izzy: 'index' };

/** Simple pictures for things stories mention. */
const PROPS: Record<string, (s: Phaser.Scene, x: number) => Phaser.GameObjects.GameObject> = {
  tree: (s, x) => tree(s, x, 150, 0.9),
  hat: (s, x) => itemImage(s, 'party-hat', x, 130, 1.3),
  star: (s, x) => s.add.star(x, 20, 5, 22, 48, PALETTE.yellow).setStrokeStyle(4, 0xd9a400),
  kite: (s, x) => s.add.container(x, -40, [s.add.line(0, 0, 0, 40, 60, 160, 0xffffff).setLineWidth(3), s.add.polygon(0, 0, [0, -50, 34, 0, 0, 50, -34, 0], PALETTE.hotPink)]),
  cake: (s, x) => s.add.container(x, 120, [s.add.rectangle(0, 0, 140, 50, 0xffb3d1), s.add.rectangle(0, -44, 110, 40, 0xfff09a), s.add.circle(0, -74, 12, PALETTE.red)]),
  pie: (s, x) => s.add.container(x, 120, [s.add.ellipse(0, 0, 160, 50, 0xd9944f), s.add.ellipse(0, -8, 140, 34, 0xffc89a)]),
  sun: (s, x) => s.add.circle(x, -60, 44, PALETTE.yellow),
  moon: (s, x) => s.add.circle(x, -60, 40, 0xfff4c4),
  apple: (s, x) => s.add.container(x, 110, [s.add.circle(0, 0, 36, PALETTE.red), s.add.ellipse(14, -38, 24, 12, PALETTE.green)]),
};

/** Story Pages: a picture book where you type each sentence to turn the page. The narrator reads along. */
export class StoryPagesScene extends SequenceGame {
  private line!: TypingLine;
  private pic: Phaser.GameObjects.Container | null = null;
  private words!: Phaser.GameObjects.Text;
  private book!: Phaser.GameObjects.Container;

  constructor() {
    super('StoryPages');
  }

  protected instructions(): string {
    return 'Read the story, then type each sentence\nto turn the page!';
  }

  protected buildWorld(): void {
    this.pic = null;
    this.cameras.main.setBackgroundColor('#c98a5b');
    const desk = bake(this, 'story-desk', GAME_W, 1080, (g) => {
      g.fillStyle(0xc98a5b, 1);
      g.fillRect(0, 0, GAME_W, 1080);
      g.lineStyle(4, 0xa96e43, 1);
      for (let y = 40; y < 1080; y += 70) g.lineBetween(0, y, GAME_W, y);
    });
    this.add.image(0, 0, desk).setOrigin(0, 0);
    const pages = bake(this, 'story-book', 1720, 440, (g) => {
      g.fillStyle(0x3a86ff, 1);
      g.fillRoundedRect(0, 0, 1720, 440, 30);
      g.fillStyle(0xfff4dc, 1);
      g.fillRoundedRect(24, 20, 824, 400, 18);
      g.fillRoundedRect(872, 20, 824, 400, 18);
      g.fillStyle(0xe8d8b8, 1);
      g.fillRect(846, 20, 28, 400);
    });
    this.book = this.add.container(GAME_W / 2, BOOK_Y, [this.add.image(0, 0, pages)]);
    this.words = this.add
      .text(TEXT_X, BOOK_Y - 20, '', { fontFamily: FONT_BODY, fontSize: '52px', color: INK_CSS, fontStyle: 'bold', align: 'center', wordWrap: { width: 720 } })
      .setOrigin(0.5);
    this.line = new TypingLine(this, GAME_W / 2, 612, 1500, 56).setDepth(10);
  }

  protected showItem(text: string, i: number): void {
    this.words.setText(text);
    this.line.show(text, 0);
    this.drawPicture(text, i);
    narrator.say(`Page ${i + 1}. ${text}`);
  }

  /** A little illustration made from whatever the sentence mentions. */
  private drawPicture(text: string, i: number): void {
    this.pic?.destroy(true);
    const c = this.add.container(PIC_X, BOOK_Y);
    const scene = bake(this, 'story-pic', 760, 350, (g) => {
      g.fillStyle(PALETTE.skyTop, 1);
      g.fillRoundedRect(0, 0, 760, 350, 20);
      g.fillStyle(PALETTE.grass, 1);
      g.fillEllipse(380, 350, 900, 200);
      g.fillStyle(PALETTE.sun, 1);
      g.fillCircle(660, 70, 40);
    });
    c.add(this.add.image(0, 0, scene));
    const words = text.replace(/[^\p{L}\s]/gu, '').split(/\s+/);
    let x = -200;
    for (const w of words) {
      if (x > 260) break;
      const animal = ANIMAL_WORDS[w.toLowerCase()];
      if (animal) {
        c.add(critterImage(this, x, 170, animal, (i + Math.abs(x)) % OUTFIT_COLORS.length, 0.75));
        x += 200;
      } else if (w === 'Juni') {
        c.add(characterImage(this, 'juni', x, 170, 0.75));
        x += 200;
      } else if (w === 'Qwerty') {
        c.add(characterImage(this, 'qwerty', x, 170, 0.6));
        x += 240;
      } else if (w === 'Grumble') {
        c.add(new Grumble(this, x, -60, 0.5));
        x += 200;
      } else if (FRIEND_NAMES[w]) {
        c.add(fingerFriendImage(this, x, 80, FRIEND_NAMES[w], 60));
        x += 180;
      } else if (PROPS[w.toLowerCase()]) {
        c.add(PROPS[w.toLowerCase()](this, x));
        x += 170;
      }
    }
    if (x === -200) {
      // Nobody we can draw: a critter and some Letterlings act it out.
      c.add(critterImage(this, -160, 170, ANIMALS[i % ANIMALS.length], i % OUTFIT_COLORS.length, 0.75));
      [...text.replace(/[^a-z]/g, '')].slice(0, 3).forEach((ch, k) => c.add(new Letterling(this, 40 + k * 110, 160, ch, 80).dance(3)));
    }
    c.setScale(0.9);
    this.tweens.add({ targets: c, scale: 1, duration: 300, ease: 'Back.easeOut' });
    this.pic = c;
  }

  protected charTyped(index: number): void {
    this.line.show(this.session!.target, index + 1);
  }

  protected charMissed(): void {
    this.line.shake();
  }

  protected itemDone(_i: number, next: () => void): void {
    sfx.cheer();
    // Turn the page. (onYoyo fires once per target, so only act on the first.)
    let turned = false;
    const last = this.idx >= this.items.length;
    this.tweens.add({
      targets: [this.book, this.words],
      scaleX: 0.05,
      duration: 260,
      ease: 'Quad.easeIn',
      yoyo: true,
      onYoyo: () => {
        if (turned) return;
        turned = true;
        if (last) this.words.setText('The End!');
        else next();
      },
      onComplete: () => {
        this.book.setScale(1);
        this.words.setScale(1);
        if (last) next();
      },
    });
  }
}
