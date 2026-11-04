import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { grantAndReturn, kq, newPlayer, typeChar, waitScene } from '../tests/e2e/helpers';

// Plays through the game and frames six moments as 2752x2064 App Store screenshots
// (iPad 13-inch, landscape) in docs/screenshots/.

const OUT = 'docs/screenshots';
const raw: { name: string; caption: string; png: Buffer }[] = [];

async function capture(page: Page, name: string, caption: string) {
  raw.push({ name, caption, png: await page.screenshot() });
}

async function typeSome(page: Page, n: number, gap = 120) {
  for (let i = 0; i < n; i++) {
    const e = await kq(page, (k) => k.info().expected);
    if (typeof e === 'string') await typeChar(page, e);
    await page.waitForTimeout(gap);
  }
}

async function openLevel(page: Page, levelId: string) {
  for (let i = 0; i < 14 && (await kq(page, (k) => k.info().level)) !== levelId; i++) {
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await page.keyboard.press(' ');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('play');
}

test('App Store screenshots', async ({ page }) => {
  // 1. Title: press keys, Letterlings pop out
  await page.goto('./');
  await waitScene(page, 'Title');
  for (const ch of 'letter') await page.keyboard.press(ch), await page.waitForTimeout(90);
  await page.waitForTimeout(350);
  await capture(page, '1-title', 'Learn to type on a real keyboard');

  await newPlayer(page, 'mia', 'middle');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await grantAndReturn(page, 'w3-7');
  // Dress up a bit (coins for the shop), then show the beach map
  await page.evaluate(() => {
    const p = (window as unknown as { __KQ: { profile: () => { coins: number; owned: string[]; wearing: Record<string, string> } } }).__KQ.profile();
    p.coins = 400;
    p.owned.push('crown', 'chick', 'star-shades');
    Object.assign(p.wearing, { hat: 'crown', pet: 'chick' });
  });
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap', 1200);
  await capture(page, '2-map', 'Seven worlds to explore');

  // 3. Fruit Catch at the beach
  await openLevel(page, 'w3-3');
  await typeSome(page, 4, 300);
  await page.waitForTimeout(1600);
  await capture(page, '3-fruit', 'Every key you press lights up');
  await page.keyboard.press('Escape');
  await waitScene(page, 'Pause', 300);
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap', 600);

  // 4. Word Train
  await openLevel(page, 'w3-8');
  await typeSome(page, 2, 250);
  await page.waitForTimeout(500);
  await capture(page, '4-train', 'Eight games that grow with your child');
  await page.keyboard.press('Escape');
  await waitScene(page, 'Pause', 300);
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap', 600);

  // 5. Rocket Race
  await page.keyboard.press('2');
  await waitScene(page, 'SpeedRace', 400);
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().mode), { timeout: 10_000 }).toBe('race');
  await typeSome(page, 30, 380);
  await capture(page, '5-race', 'Race your rocket, beat your best');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap', 600);

  // 6. Shop
  await page.keyboard.press('3');
  await waitScene(page, 'Shop', 400);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(800);
  await capture(page, '6-shop', 'Earn coins for hats, pets and more');

  // Frame each capture
  const font = readFileSync('public/assets/fonts/fredoka-600.woff2').toString('base64');
  for (const r of raw) {
    await page.setViewportSize({ width: 2752, height: 2064 });
    await page.setContent(`<html><head><style>
      @font-face { font-family: F; src: url(data:font/woff2;base64,${font}); }
      body { margin: 0; width: 2752px; height: 2064px; overflow: hidden; font-family: F;
             background: linear-gradient(160deg, #7b6cf6, #ff8fc8); }
      h1 { margin: 0; position: absolute; top: 120px; width: 100%; text-align: center; font-size: 150px; color: #fff;
           -webkit-text-stroke: 14px #3d2c5e; paint-order: stroke fill; }
      img { position: absolute; left: 96px; top: 470px; width: 2560px; height: 1440px; border-radius: 48px;
            box-shadow: 0 30px 0 #3d2c5e; }
    </style></head><body><h1>${r.caption}</h1><img src="data:image/png;base64,${r.png.toString('base64')}"></body></html>`);
    await page.waitForTimeout(300);
    writeFileSync(`${OUT}/${r.name}.png`, await page.screenshot());
  }
});
