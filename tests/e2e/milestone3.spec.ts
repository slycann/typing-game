import { expect, test, type Page } from '@playwright/test';
import { kq, newPlayer, playLevel, shot, waitScene } from './helpers';

test.describe.configure({ timeout: 400_000 });

type Profile = {
  coins: number;
  owned: string[];
  wearing: { hat: string | null };
  treehouse: Record<string, string | null>;
  daily: { done: string[] };
  bestSpeed: Record<string, number>;
  badges: string[];
};
const profile = (page: Page) => kq(page, (k) => (k as unknown as { profile: () => unknown }).profile()) as Promise<Profile>;

/** Type whatever the scene says is expected until `done` is true. */
async function typeExpected(page: Page, done: () => Promise<boolean>, gapMs = 60) {
  const deadline = Date.now() + 120_000;
  while (!(await done())) {
    if (Date.now() > deadline) throw new Error('timed out typing');
    const exp = await kq(page, (k) => k.info().expected);
    if (typeof exp === 'string') await page.keyboard.type(exp);
    await page.waitForTimeout(gapMs);
  }
}

test('practice garden, a rocket race, initials and the leaderboard', async ({ page }) => {
  await newPlayer(page, 'ada');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await shot(page, '70-map-dock');

  await page.keyboard.press('1');
  await waitScene(page, 'PracticeGarden');
  await shot(page, '71-garden-intro');
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('drill');
  await typeExpected(page, async () => (await kq(page, (k) => k.info().mode)) === 'results');
  expect(await kq(page, (k) => k.info().stars)).toBeGreaterThanOrEqual(2);
  await page.waitForTimeout(1200);
  await shot(page, '72-garden-results');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');

  await page.keyboard.press('2');
  await waitScene(page, 'SpeedRace');
  await shot(page, '73-race-choose');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().mode), { timeout: 10_000 }).toBe('race');
  let shotTaken = false;
  await typeExpected(page, async () => {
    if (!shotTaken && (await kq(page, (k) => k.info().correct as number)) > 25) {
      shotTaken = true;
      await shot(page, '74-race-flying');
    }
    return (await kq(page, (k) => k.info().mode)) === 'done';
  }, 150);
  const race = await kq(page, (k) => k.info());
  expect(race.high).toBe(true);
  expect(race.score as number).toBeGreaterThan(5);
  await page.waitForTimeout(800);
  await shot(page, '75-race-done');

  await page.keyboard.press('Enter');
  await waitScene(page, 'Initials');
  await page.keyboard.type('ass');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect(await kq(page, (k) => k.scene())).toBe('Initials'); // rude letters are turned away
  expect(await kq(page, (k) => k.info().initials)).toBe('');
  await page.keyboard.type('ada');
  await shot(page, '76-initials');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Leaderboard', 900);
  expect(await kq(page, (k) => k.info())).toMatchObject({ board: 'speed-home-row-30', entries: ['ADA'], highlighted: 0 });
  await shot(page, '77-leaderboard');

  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');
  const p = await profile(page);
  expect(p.daily.done).toEqual(expect.arrayContaining(['garden', 'race']));
  expect(p.bestSpeed['speed-home-row-30']).toBeGreaterThan(5);
  await shot(page, '78-map-today');
});

test('earn coins, shop for a hat and a cactus, decorate the treehouse, and see the sticker book', async ({ page }) => {
  await newPlayer(page, 'bea', 'middle');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  const powerups: unknown[] = [];
  for (let i = 1; i <= 5; i++) {
    await expect.poll(() => kq(page, (k) => k.info().level)).toBe(`w1-${i}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    const end = await playLevel(page);
    if (Array.isArray(end.powerups)) powerups.push(...end.powerups);
    await waitScene(page, 'Results', 200);
    await page.keyboard.press('Enter');
    await waitScene(page, 'WorldMap', 300);
  }
  expect(powerups.length, 'a 10-key streak should earn at least one power-up').toBeGreaterThan(0);
  const before = await profile(page);
  expect(before.coins).toBeGreaterThanOrEqual(30);

  await page.keyboard.press('3');
  await waitScene(page, 'Shop');
  expect(await kq(page, (k) => k.info().item)).toBe('party-hat');
  await page.keyboard.press('Enter'); // "Buy it?"
  expect((await profile(page)).owned).toEqual([]);
  await page.keyboard.press('Enter'); // yes
  await expect.poll(async () => (await profile(page)).wearing.hat).toBe('party-hat');
  await page.waitForTimeout(400);
  await shot(page, '80-shop-hat');
  await page.keyboard.press('4');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  expect(await kq(page, (k) => k.info().item)).toBe('plant-cactus');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await profile(page)).treehouse.plant).toBe('plant-cactus');
  const after = await profile(page);
  expect(after.coins).toBe(before.coins - 30);
  expect(after.badges).toContain('shopper');

  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await shot(page, '81-map-with-hat');
  await page.keyboard.press('4');
  await waitScene(page, 'Treehouse');
  await shot(page, '82-treehouse');
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  expect(await kq(page, (k) => k.info())).toMatchObject({ slot: 'plant', item: 'plant-cactus' });
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await profile(page)).treehouse.plant).toBeNull();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await profile(page)).treehouse.plant).toBe('plant-cactus');
  await page.keyboard.press('f'); // dance party

  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await page.keyboard.press('5');
  await waitScene(page, 'StickerBook', 800);
  expect(await kq(page, (k) => k.info().rescued)).toBeGreaterThanOrEqual(4);
  await page.keyboard.press('f');
  await page.waitForTimeout(300);
  await shot(page, '83-sticker-book');
});
