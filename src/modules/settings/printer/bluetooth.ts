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
  // For custom, approximate: chars = widthMm * 0.6 (roughly 0.6 chars per mm)
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

  // Header
  text += "\x1B\x61\x01"; // Align center
  text += centerText(printer.headerTitle);
  if (printer.headerSubtitle) {
    text += centerText(printer.headerSubtitle);
  }
  text += "\n";

  // Metadata
  text += "\x1B\x61\x00"; // Align left
  text += `No: ${sale.invoiceNo}\n`;
  text += `Tgl: ${new Date(sale.createdAt).toLocaleString("id-ID")}\n`;
  text += line;

  // Items
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

  // Totals
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

  // Footer
  text += line;
  text += "\x1B\x61\x01"; // Align center
  if (printer.footerNote) {
    text += centerText(printer.footerNote);
  }
  text += "\n\n\n";

  return text;
}

type BluetoothDevice = {
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothRemoteGATTServer>;
    disconnect: () => void;
  };
};

type BluetoothRemoteGATTServer = {
  getPrimaryServices: () => Promise<BluetoothRemoteGATTService[]>;
};

type BluetoothRemoteGATTService = {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristic[]>;
};

type BluetoothRemoteGATTCharacteristic = {
  properties: { write?: boolean; writeWithoutResponse?: boolean };
  writeValue: (value: Uint8Array) => Promise<void>;
};

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice: (options: { filters?: { name?: string }[]; acceptAllDevices?: boolean; optionalServices?: string[] }) => Promise<BluetoothDevice>;
  };
}

export async function printViaBluetooth(text: string, deviceName?: string) {
  const nav = navigator as NavigatorWithBluetooth;
  if (!nav.bluetooth) {
    throw new Error("Browser ini tidak mendukung Web Bluetooth API.");
  }
  
  let device: BluetoothDevice | null = null;
  if (deviceName && deviceName.trim() !== "") {
    device = await nav.bluetooth.requestDevice({
      filters: [{ name: deviceName }],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '00001101-0000-1000-8000-00805f9b34fb']
    }).catch(() => null);
  }
  
  if (!device) {
     device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '00001101-0000-1000-8000-00805f9b34fb']
    });
  }

  const server = await device.gatt?.connect();
  if (!server) throw new Error("Gagal terhubung ke GATT server bluetooth");

  const services = await server.getPrimaryServices();
  if (services.length === 0) throw new Error("Tidak ada service bluetooth yang ditemukan.");
  
  let writeCharacteristic;
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    for (const char of characteristics) {
      if (char.properties.write || char.properties.writeWithoutResponse) {
        writeCharacteristic = char;
        break;
      }
    }
    if (writeCharacteristic) break;
  }

  if (!writeCharacteristic) throw new Error("Tidak dapat menemukan characteristic untuk mengirim data ke printer.");

  const encoder = new TextEncoder();
  const initCmd = new Uint8Array([0x1B, 0x40]); 
  const cutCmd = new Uint8Array([0x1D, 0x56, 0x41, 0x00]); // GS V A 0
  const lf = new Uint8Array([0x0A, 0x0A, 0x0A]);
  
  const textBytes = encoder.encode(text);
  
  const sendData = async (data: Uint8Array) => {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      await writeCharacteristic!.writeValue(chunk);
    }
  };

  await sendData(initCmd);
  await sendData(textBytes);
  await sendData(lf);
  // Only some support cut, but it's safe to send
  try { await sendData(cutCmd); } catch { /* ignore cut errors */ }
  
  await device.gatt?.disconnect();
}