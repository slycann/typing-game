import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// The Mac mini already has Chrome for Testing from an earlier Playwright install; use it if present.
const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  workers: 1,
  use: {
    // BASE_URL=https://slycann.github.io/typing-game/ runs the tests against the live site.
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:5173',
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      executablePath: existsSync(CHROME) ? CHROME : undefined,
      // Use the real GPU on Macs; software rendering elsewhere (slower, so timings stretch).
      args:
        process.platform === 'darwin'
          ? ['--use-angle=metal', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
          : ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
    },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npx vite --port 5173 --strictPort',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
      },
});
