/**
 * Device info provider.
 * - On Electron: use preload bridge via `window.posDesktop`.
 * - On web/server: returns null.
 */

export type DesktopDeviceInfo = {
  deviceId: string;
  userData: string;
  dataDir: string;
  backupDir: string;
  logsDir: string;
  platform: string;
  arch: string;
};

export async function getDesktopDeviceInfo(): Promise<DesktopDeviceInfo | null> {
  // Only available in browser/Electron renderer.
  if (typeof window === "undefined") return null;
  if (!window.posDesktop?.device?.getInfo) return null;
  return window.posDesktop.device.getInfo();
}
