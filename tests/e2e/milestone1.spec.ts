import { expect, test } from '@playwright/test';
import { kq, shot, waitScene } from './helpers';

test('press a key, see it pressed; make a player; finish a warm-up; progress survives reload', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'Title');
  await shot(page, '01-title');

  // Pressing "a" on the real keyboard pushes down "A" on the screen keyboard.
  await page.keyboard.down('a');
  await expect.poll(() => kq(page, (k) => k.pressed())).toContain('KeyA');
  await page.keyboard.up('a');
  await expect.poll(() => kq(page, (k) => k.pressed())).not.toContain('KeyA');
  expect(await kq(page, (k) => k.targets())).toEqual(['Enter']);

  // No players yet, so Return goes straight to making one.
  await page.keyboard.press('Enter');
  await waitScene(page, 'NewPlayer');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('color');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('name');
  await page.keyboard.type('vivx');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('ian');
  await expect.poll(() => kq(page, (k) => k.info().name)).toBe('Vivian');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('age');
  await page.keyboard.press('Enter');

  // The story, page by page, then the map.
  await waitScene(page, 'Story');
  await shot(page, '02-story-1');
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press(' ');
    await expect.poll(() => kq(page, (k) => k.info().page)).toBe(i + 1);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(900);
  await shot(page, '03-story-sneeze');
  for (let i = 0; i < 3; i++) await page.keyboard.press(' '), await page.waitForTimeout(450);
  await waitScene(page, 'WorldMap');
  expect(await kq(page, (k) => k.info().level)).toBe('w1-1');
  await shot(page, '04-map');

  // Left to Grandpa Qwerty's workshop.
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => kq(page, (k) => k.info().level)).toBe('workshop');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await waitScene(page, 'Workshop');
  expect(await kq(page, (k) => k.targets())).toEqual(['Space']);
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('drill');
  const target = (await kq(page, (k) => k.info().target)) as string;
  const wrong = target[0] === 'q' ? 'w' : 'q';
  await page.keyboard.press(wrong);
  expect(await kq(page, (k) => k.info().index)).toBe(0);
  for (const ch of target) await page.keyboard.type(ch), await page.waitForTimeout(30);
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('results');
  expect(await kq(page, (k) => k.info().lastStars)).toBeGreaterThanOrEqual(1);

  // Reload: the player and their coins are still there, and the story isn't shown again.
  await page.reload();
  await waitScene(page, 'Title');
  await page.keyboard.press('Enter');
  await waitScene(page, 'ProfileSelect');
  expect(await kq(page, (k) => k.info().cards)).toBe(2);
  await shot(page, '05-profile-select');
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');
  expect((await kq(page, (k) => k.players()))[0].coins).toBeGreaterThan(0);
});
