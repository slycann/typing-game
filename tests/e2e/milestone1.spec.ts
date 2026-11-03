import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;

type KQ = {
  scene: () => string;
  pressed: () => string[];
  targets: () => string[];
  info: () => Record<string, unknown>;
};

async function kq<T>(page: Page, fn: (k: KQ) => T): Promise<T> {
  return page.evaluate((src) => {
    const k = (window as unknown as { __KQ: KQ }).__KQ;
    return new Function('k', `return (${src})(k)`)(k);
  }, fn.toString());
}

async function waitScene(page: Page, name: string) {
  await expect.poll(() => kq(page, (k) => k.scene()), { timeout: 15_000 }).toBe(name);
  await page.waitForTimeout(700); // let the fade-in and drop-in animations settle
}

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

test('press a key, see it pressed; make a player; finish a warm-up; progress survives reload', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'Title');
  await shot(page, '1-title');

  // Pressing "a" on the real keyboard pushes down "A" on the screen keyboard.
  await page.keyboard.down('a');
  await expect.poll(() => kq(page, (k) => k.pressed())).toContain('KeyA');
  await page.waitForTimeout(250);
  await shot(page, '2-title-key-pressed');
  await page.keyboard.up('a');
  await expect.poll(() => kq(page, (k) => k.pressed())).not.toContain('KeyA');
  for (const ch of 'fjdk') await page.keyboard.press(ch);
  await page.waitForTimeout(500);
  await shot(page, '3-title-letterlings');
  expect(await kq(page, (k) => k.targets())).toEqual(['Enter']);

  // No players yet, so Return goes straight to making one.
  await page.keyboard.press('Enter');
  await waitScene(page, 'NewPlayer');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await shot(page, '4-pick-critter');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('color');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  await shot(page, '5-pick-colour');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('name');
  await page.keyboard.type('vivx');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('ian');
  await expect.poll(() => kq(page, (k) => k.info().name)).toBe('Vivian');
  await shot(page, '6-type-name');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('age');
  await page.waitForTimeout(400);
  await shot(page, '7-age');
  await page.keyboard.press('Enter');

  // The workshop: Space starts a warm-up; the next key glows and a finger reaches for it.
  await waitScene(page, 'Workshop');
  await shot(page, '8-workshop-intro');
  expect(await kq(page, (k) => k.targets())).toEqual(['Space']);
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('drill');
  const target = (await kq(page, (k) => k.info().target)) as string;
  expect(target.length).toBeGreaterThan(3);
  const firstCode = target[0] === ' ' ? 'Space' : `Key${target[0].toUpperCase()}`;
  expect(await kq(page, (k) => k.targets())).toContain(firstCode);
  await page.waitForTimeout(400);
  await shot(page, '9-workshop-drill');

  // One wrong key doesn't move on; then type the rest correctly.
  const wrong = target[0] === 'q' ? 'w' : 'q';
  await page.keyboard.press(wrong);
  expect(await kq(page, (k) => k.info().index)).toBe(0);
  for (const ch of target) {
    await page.keyboard.type(ch);
    await page.waitForTimeout(30);
  }
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('results');
  const stars = (await kq(page, (k) => k.info().lastStars)) as number;
  expect(stars).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(2200);
  await shot(page, '10-workshop-results');

  // Reload: the player and their coins are still there.
  await page.reload();
  await waitScene(page, 'Title');
  await page.keyboard.press('Enter');
  await waitScene(page, 'ProfileSelect');
  expect(await kq(page, (k) => k.info().cards)).toBe(2);
  await shot(page, '11-profile-select');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Workshop');
  expect(await kq(page, (k) => k.info().coins)).toBeGreaterThan(0);
});
