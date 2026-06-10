type PairedDevice = {
  name: string;
  address: string;
};

type BluetoothStatus = {
  connected: boolean;
  deviceName: string;
};

type CapPlugin = {
  getPairedDevices: () => Promise<{ devices: PairedDevice[] }>;
  connect: (opts: { address: string }) => Promise<{ connected: boolean; deviceName: string }>;
  print: (opts: { data: string }) => Promise<{ success: boolean }>;
  printRaw: (opts: { data: number[] }) => Promise<{ success: boolean }>;
  disconnect: () => Promise<{ disconnected: boolean }>;
  getStatus: () => Promise<BluetoothStatus>;
};

function getPlugin(): CapPlugin | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  const capacitor = w.Capacitor as { isPluginAvailable?: (name: string) => boolean; Plugins?: Record<string, unknown> } | undefined;
  if (!capacitor?.isPluginAvailable?.("BluetoothPrinter")) return null;
  return (capacitor.Plugins?.BluetoothPrinter as CapPlugin) ?? null;
}

export function isCapacitorBluetoothAvailable(): boolean {
  return getPlugin() !== null;
}

export async function getPairedDevices(): Promise<PairedDevice[]> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  const result = await p.getPairedDevices();
  return result.devices;
}

export async function connectBluetooth(address: string): Promise<{ deviceName: string }> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  const result = await p.connect({ address });
  return { deviceName: result.deviceName };
}

export async function printViaCapacitor(data: string): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
  await p.print({ data });
}

export async function printRawViaCapacitor(data: number[]): Promise<void> {
  const p = getPlugin();
  if (!p) throw new Error("Capacitor Bluetooth plugin tidak tersedia.");
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
