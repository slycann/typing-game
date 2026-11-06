import { registerPlugin } from '@capacitor/core';
import { isNativeApp } from '../platform';

/** The app's own native helper (ios/App/App/BackupExportPlugin.swift). */
interface BackupExport {
  save(options: { filename: string; contents: string }): Promise<{ saved: boolean }>;
}
const BackupExport = registerPlugin<BackupExport>('BackupExport');

/**
 * Hands a backup file to a grown-up. On the website it's an ordinary download. In the App Store
 * app a download link does nothing (the web view has nowhere to put the file), so the app shows
 * the system's save dialog instead: the Files browser on iPad, a save panel on a Mac.
 * Resolves false if they cancelled.
 */
export async function saveBackupFile(filename: string, contents: string): Promise<boolean> {
  if (isNativeApp) return (await BackupExport.save({ filename, contents })).saved;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}

/**
 * Asks for a backup file and resolves with its text, or null if none was chosen. The file input is
 * put on the page while the picker is open: the iPad app's web view never reports the chosen file
 * to an input that isn't on the page.
 */
export function openBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.cssText = 'position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (file) file.text().then(resolve, reject);
      else resolve(null);
    });
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    document.body.appendChild(input);
    input.click();
  });
}
