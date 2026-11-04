import type { CapacitorConfig } from '@capacitor/cli';

// The App Store app wraps the same web build (dist/) in a native iPad app, which can also run
// on Apple-silicon Macs ("Designed for iPad").
const config: CapacitorConfig = {
  appId: 'com.slycann.letterlings',
  appName: 'Letterlings',
  webDir: 'dist',
  backgroundColor: '#4fc3ff',
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
    preferredContentMode: 'desktop',
  },
};

export default config;
