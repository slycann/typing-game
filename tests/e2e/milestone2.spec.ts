import { expect, test } from '@playwright/test';
import { kq, newPlayer, playLevel, shot, waitScene } from './helpers';

test.describe.configure({ timeout: 360_000 });

test('a perfect player can clear all of Home Row Meadow and cheer up Grumble', async ({ page }) => {
  await newPlayer(page, 'ada', 'young');
  await page.keyboard.press('Escape'); // skip the story
  await waitScene(page, 'WorldMap');

  const games = ['FingerFitness', 'KeyHop', 'BubblePop', 'KeyHop', 'BubblePop', 'FingerFitness', 'KeyHop', 'BubblePop', 'KeyHop', 'FingerFitness', 'BubblePop', 'GrumbleBoss'];
  for (let i = 0; i < games.length; i++) {
    const id = `w1-${i + 1}`;
    await expect.poll(() => kq(page, (k) => k.info().level)).toBe(id);
    await page.keyboard.press('Enter');
    await waitScene(page, games[i], 400);
    if (i < 4 || i === 10 || i === 11) await shot(page, `1${i.toString(16)}-${games[i]}-intro`);
    const end = await playLevel(page, async () => {
      if (i < 4 || i >= 10) {
        await page.waitForTimeout(i === 11 ? 2500 : 900);
        await shot(page, `2${i.toString(16)}-${games[i]}-play`);
      }
    });
    expect(end.stars, id).toBeGreaterThanOrEqual(2);
    if ('made' in end) expect(end.made, `${id}: one bubble/raindrop per word`).toBe(end.items);
    await waitScene(page, 'Results', 300);
    if (i === 0 || i === 11) await page.waitForTimeout(3200), await shot(page, `3${i.toString(16)}-results`);
    await page.keyboard.press('Enter');
    await waitScene(page, 'WorldMap', 400);
  }
  const [ada] = await kq(page, (k) => k.players());
  expect(ada.stars).toBe(12);
  expect(ada.stickers).toEqual(expect.arrayContaining(['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'grumble']));
  await page.waitForTimeout(600);
  await shot(page, "40-map-cleared");
});

test('locked levels stay locked, and the pause menu works', async ({ page }) => {
  await newPlayer(page, 'bo');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await page.keyboard.press('ArrowRight'); // level 2 is locked
  await page.waitForTimeout(400);
  expect(await kq(page, (k) => k.info().level)).toBe('w1-1');

  await page.keyboard.press('Enter');
  await waitScene(page, 'FingerFitness');
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('play');
  await page.keyboard.press('Escape');
  await waitScene(page, 'Pause', 300);
  await page.keyboard.press('a'); // a Letterling waves
  await page.waitForTimeout(500);
  await shot(page, '50-pause');
  await page.keyboard.press(' ');
  await waitScene(page, 'FingerFitness', 200);
  await page.keyboard.press('Escape');
  await waitScene(page, 'Pause', 200);
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');
  expect((await kq(page, (k) => k.players()))[0].stars).toBe(0);
});

test('grown-ups can start a player over or delete them, behind a times-table gate', async ({ page }) => {
  await newPlayer(page, 'vivian');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  // Earn something so there's progress to reset.
  await page.keyboard.press('Enter');
  await waitScene(page, 'FingerFitness');
  await playLevel(page);
  await waitScene(page, 'Results');
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');

  // A second player
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await waitScene(page, 'NewPlayer', 300);
  for (const step of ['color', 'name']) await page.keyboard.press('Enter'), await expect.poll(() => kq(page, (k) => k.info().step)).toBe(step);
  await page.keyboard.type('violet');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('age');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Story', 200);
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  expect((await kq(page, (k) => k.players())).map((p) => p.name)).toEqual(['Vivian', 'Violet']);

  // The Grown-ups button (game coords 190,1000 on a 1920x1080 canvas shown at 1280x720)
  await page.mouse.click(190 * (1280 / 1920), 1000 * (720 / 1080));
  await waitScene(page, 'Grownups', 300);
  await shot(page, '60-grownups-gate');
  // A wrong answer just gets a new question.
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');
  expect(await kq(page, (k) => k.info().mode)).toBe('gate');
  const answer = (await kq(page, (k) => k.info().answer)) as number;
  await page.keyboard.type(String(answer));
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('manage');
  expect(await kq(page, (k) => k.info().players)).toBe(2);
  await page.waitForTimeout(300);
  await shot(page, '61-grownups-manage');

  // Start Vivian over
  await page.keyboard.press('r');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('confirm');
  await shot(page, '62-grownups-confirm');
  await page.keyboard.press('y');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('manage');
  let players = await kq(page, (k) => k.players());
  expect(players[0]).toMatchObject({ name: 'Vivian', coins: 0, stars: 0, stickers: [] });

  // Cancel a delete, then really delete Vivian
  await page.keyboard.press('Backspace');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('confirm');
  await page.keyboard.press('n');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('manage');
  expect((await kq(page, (k) => k.players())).length).toBe(2);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('y');
  await expect.poll(() => kq(page, (k) => k.players().length)).toBe(1);
  players = await kq(page, (k) => k.players());
  expect(players[0].name).toBe('Violet');

  // And it sticks after a reload
  await page.reload();
  await waitScene(page, 'Title');
  expect((await kq(page, (k) => k.players())).map((p) => p.name)).toEqual(['Violet']);
});
