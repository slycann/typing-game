import { Capacitor } from '@capacitor/core';

/** True inside the App Store app (iPad, or an iPad app on a Mac); false on the website. */
export const isNativeApp = Capacitor.isNativePlatform();
