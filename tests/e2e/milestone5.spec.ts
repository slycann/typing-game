import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { kq, newPlayer, playLevel, shot, waitScene } from './helpers';

test.describe.configure({ timeout: 300_000 });

const settings = (page: Page) => kq(page, (k) => (k as unknown as { settings: () => Record<string, unknown> }).settings());

async function openParentZone(page: Page) {
  await page.mouse.click(190 * (1280 / 1920), 1000 * (720 / 1080));
  await waitScene(page, 'Grownups', 300);
  const answer = (await kq(page, (k) => k.info().answer)) as number;
  await page.keyboard.type(String(answer));
  await page.keyboard.press('Enter');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('manage');
}

test('parent zone: progress report, settings, daily limit, and backups', async ({ page }) => {
  await newPlayer(page, 'gus', 'middle');
  await page.keyboard.press('Escape');
  await waitScene(page, 'WorldMap');
  await page.keyboard.press('Enter');
  await waitScene(page, 'FingerFitness');
  await playLevel(page);
  await waitScene(page, 'Results', 300);
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  await openParentZone(page);

  // Progress
  await page.keyboard.press('2');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('progress');
  expect(await kq(page, (k) => k.info().player)).toBe('Gus');
  await page.waitForTimeout(500);
  await shot(page, 'd0-parent-progress');

  // Settings: music down, reduce motion on, easy-read on, 15-minute limit
  await page.keyboard.press('3');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('settings');
  await page.keyboard.press('ArrowDown'); // music
  await page.keyboard.press('ArrowLeft');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown'); // reduce motion
  await page.keyboard.press('ArrowRight');
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowDown'); // easy-read
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown'); // daily limit
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => settings(page)).toMatchObject({ musicVolume: 0.4, reduceMotion: true, easyRead: true, dailyLimitMin: 15 });
  await page.waitForTimeout(300);
  await shot(page, 'd1-parent-settings');

  // Backup: save a file, then load it back
  await page.keyboard.press('4');
  await expect.poll(() => kq(page, (k) => k.info().mode)).toBe('backup');
  const download = page.waitForEvent('download');
  await page.keyboard.press('s');
  const file = await (await download).path();
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  expect(saved.app).toBe('letterlings');
  expect(saved.profiles[0].name).toBe('Gus');
  const chooser = page.waitForEvent('filechooser');
  await page.keyboard.press('l');
  await (await chooser).setFiles(file);
  await expect.poll(() => kq(page, (k) => k.info().message)).toMatch(/Loaded! 1 player restored/);
  await shot(page, 'd2-parent-backup');

  // Use up today's time: the map shows the time-up screen
  await page.evaluate(() => {
    const s = (window as unknown as { __KQ: { settings: () => Record<string, unknown> } }).__KQ.settings();
    const d = new Date();
    s.limitDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    s.playedToday = 15;
  });
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  await page.keyboard.press('Enter');
  await waitScene(page, 'TimeUp', 600);
  await shot(page, 'd3-time-up');

  // A grown-up gives 15 more minutes
  await page.mouse.click(960 * (1280 / 1920), 470 * (720 / 1080));
  await waitScene(page, 'Grownups', 300);
  await page.keyboard.type(String(await kq(page, (k) => k.info().answer)));
  await page.keyboard.press('Enter');
  await page.keyboard.press('3');
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await settings(page)).playedToday).toBe(0);
  await page.keyboard.press('Escape');
  await waitScene(page, 'ProfileSelect');
  await page.keyboard.press('Enter');
  await waitScene(page, 'WorldMap');
});

test('the mute button silences everything and is remembered', async ({ page }) => {
  await page.goto('./');
  await waitScene(page, 'Title');
  expect((await settings(page)).muted).toBe(false);
  await page.mouse.click(70 * (1280 / 1920), 70 * (720 / 1080));
  await expect.poll(async () => (await settings(page)).muted).toBe(true);
  await page.reload();
  await waitScene(page, 'Title');
  expect((await settings(page)).muted).toBe(true);
  await shot(page, 'd4-title-muted');
});
