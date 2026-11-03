import { expect, test, type Page } from '@playwright/test';
import { grantAndReturn, kq, newPlayer, playLevel, shot, waitScene } from './helpers';

test.describe.configure({ timeout: 600_000 });

async function playFromMap(page: Page, levelId: string, scene: string, shotName?: string) {
  for (let i = 0; i < 14 && (await kq(page, (k) => k.info().level)) !== levelId; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(350);
  }
  await expect.poll(() => kq(page, (k) => k.info().level)).toBe(levelId);
  await page.keyboard.press('Enter');
  await waitScene(page, scene, 500);
  if (shotName) await shot(page, `${shotName}-intro`);
  const end = await playLevel(page, async () => {
    if (shotName) {
      await page.waitForTimeout(1800);
      await shot(page, `${shotName}-play`);
    }
  });
  expect(end.stars, levelId).toBeGreaterThanOrEqual(2);
  if ('made' in end) expect(end.made, `${levelId}: one thing per item`).toBe(end.items);
  await waitScene(page, 'Results', 300);
  await page.keyboard.press('Enter');
  return end;
}

test('a perfect player clears all of Treetop Village, with every new mini-game', async ({ page }) => {
  await newPlayer(page, 'tess', 'middle');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await grantAndReturn(page, 'w1-12');
  expect(await kq(page, (k) => k.info().world)).toBe(2);
  await shot(page, 'a0-map-world2');
  const games = ['FingerFitness', 'KeyHop', 'FruitCatch', 'BubblePop', 'FingerFitness', 'KeyHop', 'FruitCatch', 'WordTrain', 'BubblePop', 'BakeShop', 'StoryPages', 'GrumbleBoss'];
  const shots: Record<number, string> = { 2: 'a1-fruit', 7: 'a2-train', 9: 'a3-bake', 10: 'a4-story', 11: 'a5-boss2' };
  for (let i = 0; i < games.length; i++) {
    await playFromMap(page, `w2-${i + 1}`, games[i], shots[i]);
    await waitScene(page, 'WorldMap', 300);
  }
  // Grumble cheered up: the portal to Sandy Bottom Beach is open and we're standing on it.
  expect(await kq(page, (k) => k.info().level)).toBe('portal-3');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Story', 600);
  await shot(page, 'a6-story-world3');
  await page.keyboard.press(' ');
  await page.waitForTimeout(500);
  await page.keyboard.press(' ');
  await waitScene(page, 'WorldMap', 500);
  expect(await kq(page, (k) => k.info())).toMatchObject({ world: 3, level: 'w3-1' });
  await shot(page, 'a7-map-world3');
  // Left past the workshop walks back into Treetop Village.
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowLeft');
  await waitScene(page, 'WorldMap', 500);
  expect(await kq(page, (k) => k.info())).toMatchObject({ world: 2, level: 'portal-3' });
});

test('capitals, numbers, symbols and Option accents in Worlds 4 to 7, and the finale', async ({ page }) => {
  await newPlayer(page, 'otto', 'middle');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');

  // Shifty Mountains: big letters, then a story with capitals and full stops
  await grantAndReturn(page, 'w3-12');
  expect(await kq(page, (k) => k.info().world)).toBe(4);
  await shot(page, 'b0-map-world4');
  await playFromMap(page, 'w4-1', 'FingerFitness', 'b1-ff-capitals');
  await waitScene(page, 'WorldMap', 300);
  await grantAndReturn(page, 'w4-10');
  const story = await playFromMap(page, 'w4-11', 'StoryPages', 'b2-story-capitals');
  expect(story.correct as number).toBeGreaterThan(20);

  // Rocket Ridge: numbers on a train
  await waitScene(page, 'WorldMap', 300);
  await grantAndReturn(page, 'w5-7');
  await shot(page, 'b3-map-world5');
  await playFromMap(page, 'w5-8', 'WordTrain', 'b4-train-numbers');

  // Symbol Sea: symbols in bubbles
  await waitScene(page, 'WorldMap', 300);
  await grantAndReturn(page, 'w6-4');
  await shot(page, 'b5-map-world6');
  await playFromMap(page, 'w6-5', 'BubblePop', 'b6-bubbles-symbols');

  // Option Observatory: accents, then the last Grumble and the finale
  await waitScene(page, 'WorldMap', 300);
  await grantAndReturn(page, 'w6-12');
  await shot(page, 'b7-map-world7');
  await playFromMap(page, 'w7-1', 'FingerFitness', 'b8-ff-accent');
  await waitScene(page, 'WorldMap', 300);
  await grantAndReturn(page, 'w7-11');
  await playFromMap(page, 'w7-12', 'GrumbleBoss', 'b9-boss7');
  await waitScene(page, 'Story', 800);
  await shot(page, 'c0-finale-1');
  await page.keyboard.press(' ');
  await page.waitForTimeout(700);
  await page.keyboard.press(' ');
  await page.waitForTimeout(1200);
  await shot(page, 'c1-finale-3');
  await page.keyboard.press(' ');
  await waitScene(page, 'WorldMap');
  const p = await kq(page, (k) => (k as unknown as { profile: () => { seen: string[] } }).profile());
  expect(p.seen).toContain('finale');
});
