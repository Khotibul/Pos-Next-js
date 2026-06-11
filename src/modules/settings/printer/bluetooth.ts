"use client";

import type { PrinterSettings } from "@/modules/settings/printer/validators";
import {
  isCapacitorBluetoothAvailable,
  getPairedDevices as capGetPairedDevices,
  printViaCapacitor,
  disconnectCapacitorBluetooth,
  getCapacitorBluetoothStatus,
  connectBluetooth as capConnectBluetooth,
  isAndroidApp as capIsAndroidApp,
  startDiscovery as capStartDiscovery,
  stopDiscovery as capStopDiscovery,
  getDiscoveredDevices as capGetDiscoveredDevices,
} from "@/lib/capacitor-bluetooth";

type ReceiptSale = {
  id: string;
  invoiceNo: string;
  status: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  items: Array<{ id: string; name: string; sku: string; price: number; qty: number; lineTotal: number }>;
  payments: Array<{ id: string; method: string; amount: number; receivedAmount: number; changeAmount: number; reference: string | null }>;
};

function formatRupiah(amount: number): string {
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const s = abs.toLocaleString("id-ID");
  return neg ? `-Rp${s}` : `Rp${s}`;
}

function padRight(str: string, length: number) {
  if (str.length >= length) return str;
  return str + " ".repeat(length - str.length);
}

function truncateMid(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  if (maxLen <= 3) return str.substring(0, maxLen);
  return str.substring(0, maxLen - 2) + "..";
}

function getCharsPerLine(printer: PrinterSettings): number {
  if (printer.paper === "48mm") return 24;
  if (printer.paper === "58mm") return 32;
  if (printer.paper === "80mm") return 48;
  return Math.max(16, Math.round((printer.customWidthMm ?? 58) * 0.55));
}

export function generateReceiptText(sale: ReceiptSale, printer: PrinterSettings) {
  const width = getCharsPerLine(printer);
  let text = "";

  const centerText = (str: string) => {
    const trimmed = str.length > width ? str.substring(0, width) : str;
    const leftPad = Math.floor((width - trimmed.length) / 2);
    return " ".repeat(Math.max(0, leftPad)) + trimmed + "\n";
  };

  const sepFull = "=".repeat(width);

  text += "\x1B\x61\x01";
  text += centerText(printer.headerTitle);
  if (printer.headerSubtitle) {
    text += centerText(printer.headerSubtitle);
  }

  text += "\x1B\x61\x00";
  text += `${padRight("No:", 15)} ${sale.invoiceNo}\n`;
  text += `${padRight("Tgl:", 15)} ${new Date(sale.createdAt).toLocaleString("id-ID")}\n`;
  text += sepFull + "\n";

  const priceColWidth = 14;
  const nameColWidth = width - priceColWidth - 1;

  for (const item of sale.items) {
    const name = truncateMid(item.name, nameColWidth);
    const totalStr = formatRupiah(item.lineTotal);
    const paddedTotal = padRight(totalStr, priceColWidth);
    text += padRight(name, nameColWidth) + " " + paddedTotal + "\n";
    const details: string[] = [];
    if (printer.showUnitPriceOnReceipt) {
      details.push(`${item.qty} x ${formatRupiah(item.price)}`);
    } else {
      details.push(`${item.qty} item`);
    }
    if (printer.showSkuOnReceipt && item.sku) {
      details.push(`SKU: ${item.sku}`);
    }
    if (details.length > 0) {
      text += " " + details.join("  ") + "\n";
    }
  }

  text += sepFull + "\n";

  const addTotalLine = (label: string, value: number) => {
    const valStr = formatRupiah(value);
    const spaceAvailable = width - valStr.length;
    const labelTrunc = label.length > spaceAvailable ? label.substring(0, spaceAvailable) : label;
    text += padRight(labelTrunc, spaceAvailable) + valStr + "\n";
  };

  addTotalLine("Subtotal", sale.subtotal);
  if (printer.showDiscount && sale.discount > 0) {
    addTotalLine("Diskon", sale.discount);
  }
  if (printer.showTax && sale.tax > 0) {
    addTotalLine("Pajak", sale.tax);
  }
  text += "-".repeat(width) + "\n";
  addTotalLine("Total", sale.total);

  if (sale.payments && sale.payments.length > 0) {
    text += sepFull + "\n";
    for (const p of sale.payments) {
      addTotalLine(`Bayar (${p.method})`, p.receivedAmount || p.amount);
      if (p.changeAmount > 0) {
        addTotalLine("Kembali", p.changeAmount);
      }
    }
  }

  text += sepFull + "\n";
  text += "\x1B\x61\x01";
  if (printer.footerNote) {
    text += centerText(printer.footerNote);
  }
  text += "\n";

  return text;
}

// --- Web Bluetooth types ---

type BluetoothGATTCharacteristic = {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue: (value: Uint8Array) => Promise<void>;
  service?: { device?: { gatt?: { disconnect: () => void } } };
};

type BluetoothGATTService = {
  getCharacteristics: () => Promise<BluetoothGATTCharacteristic[]>;
};

type BluetoothGATTServer = {
  connected: boolean;
  connect: () => Promise<BluetoothGATTServer>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothGATTService[]>;
};

type BluetoothDevice = {
  id: string;
  name?: string;
  gatt?: BluetoothGATTServer;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
};

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice: (options: {
      filters?: { name?: string }[];
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }) => Promise<BluetoothDevice>;
    getDevices: () => Promise<BluetoothDevice[]>;
  };
}

// --- Web Bluetooth Connection Cache ---

const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '00001101-0000-1000-8000-00805f9b34fb',
];

let cachedDevice: BluetoothDevice | null = null;
let cachedServer: BluetoothGATTServer | null = null;
let cachedCharacteristic: BluetoothGATTCharacteristic | null = null;
let disconnectHandler: (() => void) | null = null;
let printingLock = false;

function clearCache() {
  cachedDevice = null;
  cachedServer = null;
  cachedCharacteristic = null;
  disconnectHandler = null;
}

function getNav() {
  const nav = navigator as NavigatorWithBluetooth;
  if (!nav.bluetooth) {
    throw new Error("Browser ini tidak mendukung Web Bluetooth API.");
  }
  return nav.bluetooth;
}

async function findWritableCharacteristic(server: BluetoothGATTServer): Promise<BluetoothGATTCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        return char;
      }
    }
  }
  throw new Error("Tidak dapat menemukan karakteristik write pada printer Bluetooth.");
}

async function tryReconnect(deviceName?: string): Promise<boolean> {
  if (cachedCharacteristic && cachedServer?.connected) {
    return true;
  }

  if (cachedDevice?.gatt && !cachedServer?.connected) {
    try {
      cachedServer = await cachedDevice.gatt.connect();
      cachedCharacteristic = await findWritableCharacteristic(cachedServer);
      setupDisconnectHandler(cachedDevice);
      return true;
    } catch {
      clearCache();
    }
  }

  const bluetooth = getNav();
  try {
    const devices = await bluetooth.getDevices();
    const targetName = deviceName?.trim().toLowerCase();
    for (const device of devices) {
      const match = targetName
        ? device.name?.toLowerCase() === targetName
        : true;
      if (!match || !device.gatt) continue;
      try {
        const server = await device.gatt.connect();
        const characteristic = await findWritableCharacteristic(server);
        cachedDevice = device;
        cachedServer = server;
        cachedCharacteristic = characteristic;
        setupDisconnectHandler(device);
        return true;
      } catch {
        continue;
      }
    }
  } catch {
    // getDevices() not supported or failed
  }

  return false;
}

function setupDisconnectHandler(device: BluetoothDevice) {
  if (disconnectHandler) {
    device.removeEventListener('gattserverdisconnected', disconnectHandler);
  }
  disconnectHandler = () => {
    clearCache();
  };
  device.addEventListener('gattserverdisconnected', disconnectHandler);
}

async function sendData(data: Uint8Array) {
  if (!cachedCharacteristic) throw new Error("Tidak ada koneksi Bluetooth aktif.");
  const CHUNK_SIZE = 100;
  const CHUNK_DELAY_MS = 20;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await cachedCharacteristic.writeValue(chunk);
    if (i + CHUNK_SIZE < data.length) {
      await new Promise(r => setTimeout(r, CHUNK_DELAY_MS));
    }
  }
}

// --- Public API ---

export async function pairWithPrinter(): Promise<string> {
  if (isCapacitorBluetoothAvailable()) {
    await capStartDiscovery();
    // Tunggu discovery selama 12 detik
    await new Promise((resolve) => setTimeout(resolve, 12000));
    await capStopDiscovery();
    const result = await capGetDiscoveredDevices();
    const devices = result.devices;
    if (devices.length === 0) {
      throw new Error("Tidak ada perangkat Bluetooth ditemukan. Pastikan printer dalam mode pairing.");
    }
    return JSON.stringify(devices);
  }

  const bluetooth = getNav();
  disconnectBluetooth();

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_UUIDS,
  });

  if (!device.name) {
    throw new Error("Perangkat Bluetooth tidak memiliki nama.");
  }

  if (!device.gatt) throw new Error("Gagal mengakses GATT server pada perangkat Bluetooth.");
  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);

  cachedDevice = device;
  cachedServer = server;
  cachedCharacteristic = characteristic;
  setupDisconnectHandler(device);

  return device.name;
}

export async function printViaBluetooth(text: string, deviceName?: string) {
  if (isCapacitorBluetoothAvailable()) {
    await printViaCapacitor(text, deviceName);
    return;
  }

  if (printingLock) {
    throw new Error("Proses cetak sedang berlangsung, harap tunggu.");
  }

  const connected = await tryReconnect(deviceName);
  if (!connected) {
    throw new Error(
      "Printer Bluetooth tidak terhubung. " +
      "Buka Pengaturan > Printer dan lakukan pairing ulang."
    );
  }

  printingLock = true;

  const encoder = new TextEncoder();
  const initCmd = new Uint8Array([0x1B, 0x40]);
  const cutCmd = new Uint8Array([0x1D, 0x56, 0x41, 0x00]);
  const lf = new Uint8Array([0x0A]);
  const textBytes = encoder.encode(text);

  try {
    await sendData(initCmd);
    await sendData(textBytes);
    await sendData(lf);
    try { await sendData(cutCmd); } catch { /* ignore cut errors */ }
  } finally {
    printingLock = false;
  }
}

export function disconnectBluetooth() {
  if (isCapacitorBluetoothAvailable()) {
    void disconnectCapacitorBluetooth();
  }
  if (cachedServer?.connected) {
    try {
      cachedServer.disconnect();
    } catch { /* ignore */ }
  }
  clearCache();
}

export async function getBluetoothStatus(): Promise<{ connected: boolean; deviceName: string | null }> {
  if (isCapacitorBluetoothAvailable()) {
    const status = await getCapacitorBluetoothStatus();
    return { connected: status.connected, deviceName: status.deviceName || null };
  }
  if (cachedServer?.connected && cachedDevice?.name) {
    return { connected: true, deviceName: cachedDevice.name };
  }
  if (cachedDevice?.name) {
    return { connected: false, deviceName: cachedDevice.name };
  }
  return { connected: false, deviceName: null };
}

export async function getPairedDevices(): Promise<Array<{ name: string; address: string; paired: boolean }>> {
  if (isCapacitorBluetoothAvailable()) {
    const devices = await capGetPairedDevices();
    return devices.map(d => ({ ...d, paired: d.paired ?? true }));
  }
  try {
    const nav = navigator as NavigatorWithBluetooth;
    if (nav.bluetooth) {
      const devices = await nav.bluetooth.getDevices();
      return devices.filter(d => d.name).map(d => ({ name: d.name!, address: d.id, paired: true }));
    }
  } catch { /* ignore */ }
  return [];
}

export async function connectBluetooth(address: string): Promise<{ deviceName: string }> {
  if (isCapacitorBluetoothAvailable()) {
    return capConnectBluetooth(address);
  }
  const nav = navigator as NavigatorWithBluetooth;
  if (!nav.bluetooth) throw new Error("Web Bluetooth API tidak tersedia.");

  const ok = await tryReconnect(address);
  if (ok && cachedDevice?.name) {
    return { deviceName: cachedDevice.name };
  }

  const device = await nav.bluetooth.requestDevice({
    filters: [{ name: address }],
    optionalServices: SERVICE_UUIDS,
  }).catch(() => {
    return nav.bluetooth!.requestDevice({
      acceptAllDevices: true,
      optionalServices: SERVICE_UUIDS,
    });
  });

  if (!device.name) throw new Error("Perangkat Bluetooth tidak memiliki nama.");
  if (!device.gatt) throw new Error("Gagal mengakses GATT server pada perangkat Bluetooth.");
  const server = await device.gatt.connect();
  const characteristic = await findWritableCharacteristic(server);
  cachedDevice = device;
  cachedServer = server;
  cachedCharacteristic = characteristic;
  setupDisconnectHandler(device);
  return { deviceName: device.name };
}

export async function startDiscovery(): Promise<void> {
  if (isCapacitorBluetoothAvailable()) {
    await capStartDiscovery();
    return;
  }
}

export async function stopDiscovery(): Promise<void> {
  if (isCapacitorBluetoothAvailable()) {
    await capStopDiscovery();
  }
}

export async function getDiscoveredDevices(): Promise<{ devices: Array<{ name: string; address: string; paired: boolean }>; isDiscovering: boolean }> {
  if (isCapacitorBluetoothAvailable()) {
    return capGetDiscoveredDevices();
  }
  try {
    const nav = navigator as NavigatorWithBluetooth;
    if (nav.bluetooth) {
      const devices = await nav.bluetooth.getDevices();
      return {
        devices: devices.filter(d => d.name).map(d => ({ name: d.name!, address: d.id, paired: true })),
        isDiscovering: false,
      };
    }
  } catch { /* ignore */ }
  return { devices: [], isDiscovering: false };
}

export function isAndroidApp(): boolean {
  return capIsAndroidApp();
}

export { isCapacitorBluetoothAvailable };
