// Sandboxed preload scripts can't use ESM imports in Electron (>=20).
// Use `require('electron')` to access contextBridge/ipcRenderer safely.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let contextBridge: typeof import("electron").contextBridge;
let ipcRenderer: typeof import("electron").ipcRenderer;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ contextBridge, ipcRenderer } = require("electron/renderer") as typeof import("electron"));
} catch {
  // Fallback for environments where `electron/renderer` isn't resolvable.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ contextBridge, ipcRenderer } = require("electron") as typeof import("electron"));
}

type DeviceInfo = {
  deviceId: string;
  userData: string;
  dataDir: string;
  backupDir: string;
  logsDir: string;
  platform: string;
  arch: string;
};

const api = {
  device: {
    getInfo: async (): Promise<DeviceInfo> => ipcRenderer.invoke("device:getInfo"),
  },
  database: {
    ensure: async (): Promise<{
      ok: boolean;
      data?: { ready: boolean; userData: string; dataDir: string; backupDir: string; logsDir: string; message?: string };
      message?: string;
    }> => ipcRenderer.invoke("database:ensure"),
  },
  license: {
    getCurrent: async () => ipcRenderer.invoke("license:getCurrent"),
    activateTrial: async (input: { companyName: string; ownerName: string; email: string; phone: string; days: number }) =>
      ipcRenderer.invoke("license:activateTrial", input),
    activateKey: async (input: { serial: string }) => ipcRenderer.invoke("license:activateKey", input),
    clear: async () => ipcRenderer.invoke("license:clear"),
  },
  sync: {
    getStatus: async (): Promise<{ ok: boolean; data?: { pending: number; failed: number; sent: number }; message?: string }> =>
      ipcRenderer.invoke("sync:getStatus"),
  },
};

contextBridge.exposeInMainWorld("posDesktop", api);
