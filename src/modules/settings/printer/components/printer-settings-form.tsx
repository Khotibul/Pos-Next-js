"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/lib/action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrinterSettings } from "@/modules/settings/printer/validators";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

interface NavigatorWithBluetooth extends Navigator {
  bluetooth?: {
    requestDevice: (options: { acceptAllDevices?: boolean; optionalServices?: string[] }) => Promise<{ name?: string }>;
  };
}

export function PrinterSettingsForm({
  initial,
  action,
}: {
  initial: PrinterSettings;
  action: (prev: unknown, formData: FormData) => Promise<ActionResult<{ ok: true }>>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const fieldErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const message = state && !state.ok ? state.message : null;
  const [desktopPrinters, setDesktopPrinters] = useState<Array<{ name: string; displayName: string }>>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.posDesktop?.printer) {
      window.posDesktop.printer.getPrinters().then(setDesktopPrinters).catch(() => {});
    }
  }, []);

  const handleCariBluetooth = async () => {
    try {
      const nav = navigator as NavigatorWithBluetooth;
      if (!nav.bluetooth) {
        alert("Browser atau perangkat ini tidak mendukung fitur Web Bluetooth.");
        return;
      }
      
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', '00001101-0000-1000-8000-00805f9b34fb']
      });
      if (device && device.name) {
        const input = document.getElementById("bluetoothDeviceName") as HTMLInputElement;
        if (input) input.value = device.name;
      }
    } catch (err) {
      console.error(err);
      alert("Pencarian dibatalkan atau gagal: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRefreshDesktopPrinters = async () => {
    if (typeof window !== "undefined" && window.posDesktop?.printer) {
      try {
        const list = await window.posDesktop.printer.getPrinters();
        setDesktopPrinters(list);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <form action={formAction} className="grid gap-5">
      {message ? <Alert variant="destructive">{message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="connectionType">Mode Koneksi</Label>
          <select id="connectionType" name="connectionType" defaultValue={initial.connectionType || "browser"} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="browser">Browser Print (Default / USB / Jaringan)</option>
            <option value="bluetooth">Bluetooth (Web Bluetooth API)</option>
          </select>
          <FieldError msg={fieldErrors.connectionType} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="paper">Ukuran Kertas</Label>
          <select id="paper" name="paper" defaultValue={initial.paper} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="48mm">48mm</option>
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
            <option value="custom">Custom (Menyesuaikan)</option>
          </select>
          <FieldError msg={fieldErrors.paper} />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="defaultBrowserPrinter">Printer Default (Khusus Aplikasi Desktop)</Label>
          {desktopPrinters.length > 0 && (
             <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefreshDesktopPrinters}>
               Refresh List Printer
             </Button>
          )}
        </div>
        {desktopPrinters.length > 0 ? (
          <div className="flex items-center gap-2">
            <select id="defaultBrowserPrinter" name="defaultBrowserPrinter" defaultValue={initial.defaultBrowserPrinter || ""} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">
              <option value="">-- Pilih Printer (Dialog Standar) --</option>
              {desktopPrinters.map(p => (
                <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <Input id="defaultBrowserPrinter" name="defaultBrowserPrinter" defaultValue={initial.defaultBrowserPrinter} placeholder="Nama printer di OS (biarkan kosong untuk dialog standar)" />
        )}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span>Jika diisi, aplikasi Desktop akan mencetak langsung ke printer ini tanpa dialog konfirmasi.</span>
          <a href="ms-settings:printers" className="text-primary hover:underline font-medium">Buka Setting Printer OS (Windows)</a>
        </div>
        <FieldError msg={fieldErrors.defaultBrowserPrinter} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bluetoothDeviceName">Nama Perangkat Bluetooth</Label>
        <div className="flex items-center gap-2">
          <Input id="bluetoothDeviceName" name="bluetoothDeviceName" defaultValue={initial.bluetoothDeviceName} placeholder="Contoh: RPP02N" className="flex-1" />
          <Button type="button" variant="secondary" onClick={handleCariBluetooth} className="shrink-0 rounded-xl">
            Cari / Add Printer
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">Khusus untuk mode koneksi Bluetooth. Klik Cari / Add Printer untuk mendeteksi perangkat.</div>
        <FieldError msg={fieldErrors.bluetoothDeviceName} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="headerTitle">Header Title</Label>
        <Input id="headerTitle" name="headerTitle" defaultValue={initial.headerTitle} />
        <FieldError msg={fieldErrors.headerTitle} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="headerSubtitle">Header Subtitle</Label>
        <Input id="headerSubtitle" name="headerSubtitle" defaultValue={initial.headerSubtitle} placeholder="Alamat / Telp (opsional)" />
        <FieldError msg={fieldErrors.headerSubtitle} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="footerNote">Footer Note</Label>
        <Input id="footerNote" name="footerNote" defaultValue={initial.footerNote} />
        <FieldError msg={fieldErrors.footerNote} />
      </div>

      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
        <div>
          <div className="text-sm font-semibold">Custom Keranjang POS</div>
          <div className="mt-1 text-xs text-muted-foreground">Atur field yang tampil di keranjang kasir. Jika pajak/diskon dimatikan, POS tidak akan mengenakan nilai tersebut.</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cartShowSku" defaultChecked={initial.cartShowSku} />
            Tampilkan SKU di keranjang
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cartShowStock" defaultChecked={initial.cartShowStock} />
            Tampilkan stok produk
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cartShowDiscount" defaultChecked={initial.cartShowDiscount} />
            Aktifkan diskon di keranjang
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cartShowTax" defaultChecked={initial.cartShowTax} />
            Aktifkan pajak di keranjang
          </label>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
        <div>
          <div className="text-sm font-semibold">Tampilan Struk</div>
          <div className="mt-1 text-xs text-muted-foreground">Hasil cetak mengikuti setting ini agar sinkron dengan keranjang POS.</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="autoPrintAfterPayment" defaultChecked={initial.autoPrintAfterPayment} />
          Auto print setelah transaksi selesai
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showLogo" defaultChecked={initial.showLogo} />
          Tampilkan logo (placeholder)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showDiscount" defaultChecked={initial.showDiscount} />
          Tampilkan diskon
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showTax" defaultChecked={initial.showTax} />
          Tampilkan pajak
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showSkuOnReceipt" defaultChecked={initial.showSkuOnReceipt} />
          Tampilkan SKU item
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="showUnitPriceOnReceipt" defaultChecked={initial.showUnitPriceOnReceipt} />
          Tampilkan harga satuan
        </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/pos/history">Buka Riwayat</Link>
        </Button>
        <Button type="submit" disabled={isPending} className="rounded-xl">
          {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </form>
  );
}
