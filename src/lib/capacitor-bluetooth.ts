type PairedDevice = {
  name: string;
  address: string;
  paired?: boolean;
};

type DiscoveredDevice = {
  name: string;
  address: string;
  paired: boolean;
};

type DiscoveryResult = {
  devices: DiscoveredDevice[];
  isDiscovering: boolean;
};

type BluetoothStatus = {
  connected: boolean;
  deviceName: string;
  address?: string;
};

type CapPlugin = {
  requestPermissions: (opts?: { forDiscovery?: boolean }) => Promise<{ granted: boolean }>;
  getPairedDevices: () => Promise<{ devices: PairedDevice[] }>;
  startDiscovery: () => Promise<{ started: boolean }>;
  stopDiscovery: () => Promise<{ stopped: boolean }>;
  getDiscoveredDevices: () => Promise<DiscoveryResult>;
  connect: (opts: { address: string }) => Promise<{ connected: boolean; deviceName: string; address?: string }>;
  print: (opts: { data: string }) => Promise<{ success: boolean }>;
  printRaw: (opts: { data: number[] }) => Promise<{ success: boolean }>;
  disconnect: () => Promise<{ disconnected: boolean }>;
  getStatus: () => Promise<BluetoothStatus>;
};

function getPlugin(): CapPlugin | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const capacitor = w.Capacitor as { isPluginAvailable?: (name: string) => boolean; Plugins?: Record<string, unknown> } | undefined;
  const plugin = capacitor?.Plugins?.BluetoothPrinter as CapPlugin | undefined;
  if (plugin) return plugin;
  if (!capacitor?.isPluginAvailable?.("BluetoothPrinter")) return null;
  return (capacitor.Plugins?.BluetoothPrinter as CapPlugin) ?? null;
}

export function isCapacitorBluetoothAvailable(): boolean {
  return getPlugin() !== null;
}

export async function requestBluetoothPermissions(forDiscovery = true): Promise<boolean> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  if (!p.requestPermissions) {
    return true;
  }
  try {
    const result = await p.requestPermissions({ forDiscovery });
    return result.granted;
  } catch {
    return false;
  }
}

export async function getPairedDevices(): Promise<PairedDevice[]> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  const result = await p.getPairedDevices();
  return result.devices;
}

export async function startDiscovery(): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  await p.startDiscovery();
}

export async function stopDiscovery(): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  await p.stopDiscovery();
}

export async function getDiscoveredDevices(): Promise<DiscoveryResult> {
  const p = getPlugin();
  if (!p) return { devices: [], isDiscovering: false };
  return p.getDiscoveredDevices();
}

export async function connectBluetooth(address: string): Promise<{ deviceName: string }> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  const result = await p.connect({ address });
  return { deviceName: result.deviceName };
}

async function ensureConnected(p: CapPlugin, deviceName?: string): Promise<void> {
  if (!deviceName || deviceName.trim() === "") return;
  try {
    const status = await p.getStatus();
    const currentName = status.deviceName;
    const currentAddress = status.address;
    const isConnected = status.connected;
    const normalizedTarget = deviceName.trim().toLowerCase();

    if (
      isConnected &&
      (
        currentName?.toLowerCase() === normalizedTarget ||
        currentAddress?.toLowerCase() === normalizedTarget
      )
    ) {
      return;
    }

    // Cari perangkat dari hasil discovery terakhir atau paired devices
    let devices: { name: string; address: string }[] = [];
    try {
      const discoveryResult = await p.getDiscoveredDevices();
      devices = discoveryResult.devices;
    } catch { /* ignore */ }

    if (devices.length === 0) {
      try {
        const paired = await p.getPairedDevices();
        devices = paired.devices;
      } catch { /* ignore */ }
    }

    const target = deviceName.includes(":")
      ? devices.find((d) => d.address.toLowerCase() === deviceName.toLowerCase() || d.name.toLowerCase() === deviceName.toLowerCase())
      : devices.find((d) => d.name.toLowerCase() === deviceName.toLowerCase());

    if (target) {
      console.log(`Auto-connecting to Bluetooth printer: ${target.name} (${target.address})...`);
      await p.connect({ address: target.address });
      await new Promise((resolve) => setTimeout(resolve, 500));
    } else {
      console.warn(`Bluetooth printer "${deviceName}" not found in discovered devices.`);
    }
  } catch (err) {
    console.error("Auto-connect failed, attempting print anyway:", err);
  }
}

export async function printViaCapacitor(data: string, deviceName?: string): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  await ensureConnected(p, deviceName);
  await p.print({ data });
}

export async function printRawViaCapacitor(data: number[], deviceName?: string): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  await ensureConnected(p, deviceName);
  await p.printRaw({ data });
}

export async function disconnectCapacitorBluetooth(): Promise<void> {
  const p = getPlugin();
  if (!p) return;
  await p.disconnect();
}

export async function getCapacitorBluetoothStatus(): Promise<BluetoothStatus> {
  const p = getPlugin();
  if (!p) return { connected: false, deviceName: "" };
  return p.getStatus();
}

export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as unknown as Record<string, unknown>).Capacitor as { getPlatform?: () => string } | undefined;
  return capacitor?.getPlatform?.() === "android";
}
