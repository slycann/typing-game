import { expect, type Page } from '@playwright/test';

export type KQ = {
  scene: () => string;
  pressed: () => string[];
  targets: () => string[];
  info: () => Record<string, unknown>;
  players: () => { name: string; coins: number; stars: number; stickers: string[] }[];
};

/** Run a function against window.__KQ inside the page. */
export async function kq<T>(page: Page, fn: (k: KQ) => T): Promise<T> {
  return page.evaluate((src) => {
    const k = (window as unknown as { __KQ: KQ }).__KQ;
    return new Function('k', `return (${src})(k)`)(k);
  }, fn.toString());
}

export async function waitScene(page: Page, name: string, settle = 600) {
  await expect.poll(() => kq(page, (k) => k.scene()), { timeout: 20_000 }).toBe(name);
  await page.waitForTimeout(settle);
}

export async function shot(page: Page, name: string) {
  if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png` });
}

/** From a fresh page: make a player and land on the world map (skipping the story). */
export async function newPlayer(page: Page, name: string, age: 'young' | 'middle' = 'young') {
  await page.goto('/');
  await waitScene(page, 'Title', 300);
  await page.keyboard.press('Enter');
  await waitScene(page, 'NewPlayer', 300);
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('color');
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('name');
  await page.keyboard.type(name);
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().step)).toBe('age');
  if (age === 'young') await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await waitScene(page, 'Story', 300);
}

const OPTION_CODES: Record<string, string> = { é: 'KeyE', ñ: 'KeyN', ü: 'KeyU', '©': 'KeyG', '™': 'Digit2', '°': 'Digit8', '÷': 'Slash', ß: 'KeyS', '¡': 'Digit1', '¿': 'Slash' };

/** Type one character. Option-key characters are sent as the key events a Mac produces. */
export async function typeChar(page: Page, ch: string) {
  if (!(ch in OPTION_CODES)) return page.keyboard.type(ch);
  await page.evaluate(
    ([key, code]) => {
      for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { key, code, altKey: true, bubbles: true }));
    },
    [ch, OPTION_CODES[ch]],
  );
}

/** Pretend every level up to `levelId` is cleared (dev server only), then reload onto the map. */
export async function grantAndReturn(page: Page, levelId: string) {
  await page.evaluate((id) => (window as unknown as { __KQ: { grant: (id: string) => Promise<void> } }).__KQ.grant(id), levelId);
  await page.reload();
  await waitScene(page, 'Title', 200);
  await page.keyboard.press('Enter');
  await waitScene(page, 'ProfileSelect', 300);
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.scene()), { timeout: 15_000 }).toMatch(/Story|WorldMap/);
  if ((await kq(page, (k) => k.scene())) === 'Story') {
    await page.waitForTimeout(500);
    await page.keyboard.press('Escape');
  }
  await waitScene(page, 'WorldMap', 500);
}

/** Play the current game's intro + level like a perfect (if hasty) player until it ends. */
export async function playLevel(page: Page, onPlaying?: () => Promise<void>) {
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('intro');
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('play');
  if (onPlaying) await onPlaying();
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const info = await kq(page, (k) => k.info());
    if (info.finished) return info;
    if (typeof info.expected === 'string') await typeChar(page, info.expected);
    await page.waitForTimeout(60);
  }
  throw new Error('level did not finish');
}
