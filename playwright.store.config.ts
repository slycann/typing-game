import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// App Store screenshots: same browser setup as the tests, full-HD game captures.
export default defineConfig({
  ...base,
  testDir: 'scripts',
  testMatch: 'store-screenshots.ts',
  timeout: 600_000,
  use: { ...base.use, viewport: { width: 1920, height: 1080 } },
});
