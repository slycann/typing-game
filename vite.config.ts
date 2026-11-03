import { defineConfig } from 'vite';

// Relative base so the same build works on GitHub Pages (/typing-game/) and inside Capacitor.
export default defineConfig({
  base: './',
  // Reachable from other Macs at home (.local) and over Tailscale (.ts.net) for playtesting.
  server: { host: true, port: 5173, allowedHosts: ['.local', '.ts.net'] },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
