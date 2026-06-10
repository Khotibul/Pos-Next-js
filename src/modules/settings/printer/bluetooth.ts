"use client";

import type { PrinterSettings } from "@/modules/settings/printer/validators";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

function padRight(str: string, length: number) {
  return str.length > length ? str.substring(0, length) : str.padEnd(length, " ");
}

function getCharsPerLine(printer: PrinterSettings): number {
  if (printer.paper === "48mm") return 24;
  if (printer.paper === "58mm") return 32;
  if (printer.paper === "80mm") return 48;
  return Math.max(12, Math.round((printer.customWidthMm ?? 58) * 0.6));
}

export function generateReceiptText(sale: ReceiptSale, printer: PrinterSettings) {
  const width = getCharsPerLine(printer);
  let text = "";

  const centerText = (str: string) => {
    if (str.length >= width) return str.substring(0, width) + "\n";
    const leftPad = Math.floor((width - str.length) / 2);
    return " ".repeat(leftPad) + str + "\n";
  };

  const line = "-".repeat(width) + "\n";

  text += "\x1B\x61\x01";
  text += centerText(printer.headerTitle);
  if (printer.headerSubtitle) {
    text += centerText(printer.headerSubtitle);
  }
  text += "\n";

  text += "\x1B\x61\x00";
  text += `No: ${sale.invoiceNo}\n`;
  text += `Tgl: ${new Date(sale.createdAt).toLocaleString("id-ID")}\n`;
  text += line;

  for (const item of sale.items) {
    text += `${item.name}\n`;
    if (printer.showSkuOnReceipt && item.sku) {
      text += `SKU: ${item.sku}\n`;
    }
    
    const qtyPrice = `${item.qty} x ${formatCurrency(item.price)}`;
    const total = formatCurrency(item.lineTotal);
    
    if (printer.showUnitPriceOnReceipt) {
      const spaceLeft = width - total.length;
      text += padRight(qtyPrice, spaceLeft) + total + "\n";
    } else {
      const qtyStr = `${item.qty} item`;
      const spaceLeft = width - total.length;
      text += padRight(qtyStr, spaceLeft) + total + "\n";
    }
  }
  text += line;

  const addTotalLine = (label: string, value: number) => {
    const valStr = formatCurrency(value);
    const spaceLeft = width - valStr.length;
    text += padRight(label, spaceLeft) + valStr + "\n";
  };

  addTotalLine("Subtotal", sale.subtotal);
  if (printer.showDiscount && sale.discount > 0) {
    addTotalLine("Diskon", sale.discount);
  }
  if (printer.showTax && sale.tax > 0) {
    addTotalLine("Pajak", sale.tax);
  }
  addTotalLine("Total", sale.total);
  
  if (sale.payments && sale.payments.length > 0) {
    text += line;
    for (const p of sale.payments) {
      addTotalLine(`Bayar (${p.method})`, p.amount);
      if (p.changeAmount > 0) {
        addTotalLine("Kembali", p.changeAmount);
      }
    }
  }

  text += line;
  text += "\x1B\x61\x01";
  if (printer.footerNote) {
    text += centerText(printer.footerNote);
  }
  text += "\n\n\n";

  return text;
}

// --- Internal types for Web Bluetooth ---

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

// --- Connection Cache ---

const SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '00001101-0000-1000-8000-00805f9b34fb',
];

let cachedDevice: BluetoothDevice | null = null;
let cachedServer: BluetoothGATTServer | null = null;
let cachedCharacteristic: BluetoothGATTCharacteristic | null = null;
let disconnectHandler: (() => void) | null = null;

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

/**
 * Find a writable characteristic from a connected GATT server.
 */
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

/**
 * Try to reconnect using a previously paired device.
 * Checks the in-memory cache first, then tries getDevices().
 */
async function tryReconnect(deviceName?: string): Promise<boolean> {
  // Already connected and cached
  if (cachedCharacteristic && cachedServer?.connected) {
    return true;
  }

  // Cache exists but disconnected — try to reconnect
  if (cachedDevice && !cachedServer?.connected) {
    try {
      cachedServer = await cachedDevice.gatt!.connect();
      cachedCharacteristic = await findWritableCharacteristic(cachedServer);
      setupDisconnectHandler(cachedDevice);
      return true;
    } catch {
      clearCache();
    }
  }

  // Try getDevices() — find previously authorized device
  const bluetooth = getNav();
  try {
    const devices = await bluetooth.getDevices();
    const targetName = deviceName?.trim().toLowerCase();
    for (const device of devices) {
      const match = targetName
        ? device.name?.toLowerCase() === targetName
        : true;
      if (match && device.gatt) {
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

/**
 * Send data in chunks to the characteristic.
 */
async function sendData(data: Uint8Array) {
  if (!cachedCharacteristic) throw new Error("Tidak ada koneksi Bluetooth aktif.");
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await cachedCharacteristic.writeValue(chunk);
  }
}

// --- Public API ---

/**
 * Pair with a new Bluetooth printer (shows browser chooser).
 * Connects, discovers services, and caches the connection for subsequent use.
 * Returns the device name on success.
 */
export async function pairWithPrinter(): Promise<string> {
  const bluetooth = getNav();

  // Disconnect any existing connection first
  disconnectBluetooth();

  const device = await bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICE_UUIDS,
  });

  if (!device.name) {
    throw new Error("Perangkat Bluetooth tidak memiliki nama.");
  }

  const server = await device.gatt!.connect();
  const characteristic = await findWritableCharacteristic(server);

  cachedDevice = device;
  cachedServer = server;
  cachedCharacteristic = characteristic;
  setupDisconnectHandler(device);

  return device.name;
}

/**
 * Print receipt text via Bluetooth.
 * Automatically reuses cached connection or reconnects to a previously paired device.
 * Only shows browser chooser as last resort (requires user gesture context).
 */
export async function printViaBluetooth(text: string, deviceName?: string) {
  const connected = await tryReconnect(deviceName);

  if (!connected) {
    // Last resort: request a new device (needs user gesture)
    const bluetooth = getNav();
    let device: BluetoothDevice;
    if (deviceName && deviceName.trim() !== "") {
      device = await bluetooth.requestDevice({
        filters: [{ name: deviceName }],
        optionalServices: SERVICE_UUIDS,
      }).catch(() => {
        return bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: SERVICE_UUIDS,
        });
      });
    } else {
      device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: SERVICE_UUIDS,
      });
    }

    const server = await device.gatt!.connect();
    const characteristic = await findWritableCharacteristic(server);

    cachedDevice = device;
    cachedServer = server;
    cachedCharacteristic = characteristic;
    setupDisconnectHandler(device);
  }

  const encoder = new TextEncoder();
  const initCmd = new Uint8Array([0x1B, 0x40]);
  const cutCmd = new Uint8Array([0x1D, 0x56, 0x41, 0x00]);
  const lf = new Uint8Array([0x0A, 0x0A, 0x0A]);
  const textBytes = encoder.encode(text);

  try {
    await sendData(initCmd);
    await sendData(textBytes);
    await sendData(lf);
    try { await sendData(cutCmd); } catch { /* ignore cut errors */ }
  } catch (err) {
    // Connection lost during send — clear cache and rethrow
    clearCache();
    throw err;
  }
}

/**
 * Disconnect the current Bluetooth printer and clear the cache.
 */
export function disconnectBluetooth() {
  if (cachedServer?.connected) {
    try {
      cachedServer.disconnect();
    } catch { /* ignore */ }
  }
  clearCache();
}

/**
 * Check if we have an active Bluetooth connection.
 */
export function getBluetoothStatus(): { connected: boolean; deviceName: string | null } {
  if (cachedServer?.connected && cachedDevice?.name) {
    return { connected: true, deviceName: cachedDevice.name };
  }
  if (cachedDevice?.name) {
    return { connected: false, deviceName: cachedDevice.name };
  }
  return { connected: false, deviceName: null };
}
