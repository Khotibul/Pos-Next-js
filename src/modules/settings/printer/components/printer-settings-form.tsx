"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import type { ActionResult } from "@/lib/action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PrinterSettings } from "@/modules/settings/printer/validators";
import { pairWithPrinter, disconnectBluetooth, getBluetoothStatus, isAndroidApp, isCapacitorBluetoothAvailable, connectBluetooth, startDiscovery, stopDiscovery, getDiscoveredDevices, requestBluetoothPermissions } from "@/modules/settings/printer/bluetooth";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
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
  const [selectedPaper, setSelectedPaper] = useState(initial.paper);
  const [btStatus, setBtStatus] = useState<{ connected: boolean; deviceName: string | null }>({ connected: false, deviceName: null });
  const [btPairing, setBtPairing] = useState(false);
  const [pairedDevices, setPairedDevices] = useState<Array<{ name: string; address: string; paired: boolean }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const isAndroid = isAndroidApp();
  const hasCapacitorBt = isAndroid && isCapacitorBluetoothAvailable();

  useEffect(() => {
    if (typeof window !== "undefined" && window.posDesktop?.printer) {
      window.posDesktop.printer.getPrinters().then(setDesktopPrinters).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try {
        const status = await getBluetoothStatus();
        setBtStatus(status);
      } catch {
        setBtStatus({ connected: false, deviceName: null });
      }
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll discovered devices while scanning
  useEffect(() => {
    if (!hasCapacitorBt || !isScanning) return;
    const poll = async () => {
      try {
        const result = await getDiscoveredDevices();
        setPairedDevices(result.devices);
        if (!result.isDiscovering) {
          setIsScanning(false);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(poll, 1500);
    return () => clearInterval(interval);
  }, [hasCapacitorBt, isScanning]);

  const handlePairBluetooth = async () => {
    setBtPairing(true);
    try {
      const name = await pairWithPrinter();
      const input = document.getElementById("bluetoothDeviceName") as HTMLInputElement;
      if (input) input.value = name;
      const status = await getBluetoothStatus();
      setBtStatus(status);
      alert(`Berhasil terhubung ke "${name}". Koneksi akan tersimpan untuk cetak berikutnya.`);
    } catch (err) {
      console.error(err);
      if (err instanceof DOMException && err.name === "NotFoundError") {
        alert("Pencarian dibatalkan.");
      } else {
        alert("Gagal: " + (err instanceof Error ? err.message : String(err)));
      }
    } finally {
      setBtPairing(false);
    }
  };

  const handleAndroidConnect = async (address: string, name: string) => {
    setBtPairing(true);
    try {
      await connectBluetooth(address);
      const input = document.getElementById("bluetoothDeviceName") as HTMLInputElement;
      if (input) input.value = address;
      const status = await getBluetoothStatus();
      setBtStatus(status);
      alert(`Berhasil terhubung ke "${name}". Alamat printer disimpan agar cetak berikutnya otomatis.`);
    } catch (err) {
      alert("Gagal: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setBtPairing(false);
    }
  };

  const handleDisconnectBluetooth = async () => {
    disconnectBluetooth();
    const status = await getBluetoothStatus();
    setBtStatus(status);
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

  const [requestingPerms, setRequestingPerms] = useState(false);

  const handleRequestPermissions = async () => {
    setRequestingPerms(true);
    try {
      const granted = await requestBluetoothPermissions(true);
      if (!granted) {
        alert(
          "Izin Bluetooth dan lokasi diperlukan untuk memindai perangkat. " +
          "Buka Pengaturan > Aplikasi > POSQU Pro > Izin, lalu aktifkan Nearby devices dan Lokasi."
        );
      }
      return granted;
    } catch (err) {
      alert("Gagal meminta izin: " + (err instanceof Error ? err.message : String(err)));
      return false;
    } finally {
      setRequestingPerms(false);
    }
  };

  const handleScanAndroidDevices = async () => {
    const granted = await handleRequestPermissions();
    if (!granted && hasCapacitorBt) {
      return;
    }
    setIsScanning(true);
    try {
      await startDiscovery();
      // Polling will update the list; auto-stop after 12s
      setTimeout(async () => {
        try {
          await stopDiscovery();
          setIsScanning(false);
        } catch { /* ignore */ }
      }, 12000);
    } catch (err) {
      setIsScanning(false);
      alert("Gagal scan: " + (err instanceof Error ? err.message : String(err)));
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
            <option value="bluetooth">{isAndroid ? "Bluetooth (Android Native)" : "Bluetooth (Web Bluetooth API)"}</option>
          </select>
          <FieldError msg={fieldErrors.connectionType} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="paper">Ukuran Kertas</Label>
          <select id="paper" name="paper" defaultValue={initial.paper} onChange={(e) => setSelectedPaper(e.target.value as typeof initial.paper)} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="48mm">48mm</option>
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
            <option value="custom">Custom</option>
          </select>
          <FieldError msg={fieldErrors.paper} />
        </div>
      </div>

      {selectedPaper === "custom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="customWidthMm">Lebar Kertas (mm)</Label>
            <Input id="customWidthMm" name="customWidthMm" type="number" min={10} max={200} defaultValue={initial.customWidthMm ?? 58} placeholder="Contoh: 58" />
            <div className="text-xs text-muted-foreground">Min: 10mm, Maks: 200mm</div>
            <FieldError msg={fieldErrors.customWidthMm} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customHeightMm">Tinggi Kertas (mm)</Label>
            <Input id="customHeightMm" name="customHeightMm" type="number" min={10} max={500} defaultValue={initial.customHeightMm ?? 150} placeholder="Contoh: 150" />
            <div className="text-xs text-muted-foreground">Min: 10mm, Maks: 500mm (opsional, untuk @page)</div>
            <FieldError msg={fieldErrors.customHeightMm} />
          </div>
        </div>
      ) : null}

      {!isAndroid ? (
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
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="bluetoothDeviceName">Nama Perangkat Bluetooth</Label>
        {hasCapacitorBt ? (
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Input id="bluetoothDeviceName" name="bluetoothDeviceName" defaultValue={initial.bluetoothDeviceName} placeholder="Nama atau alamat MAC" className="flex-1" />
              <Button type="button" variant="secondary" onClick={handleScanAndroidDevices} disabled={isScanning || btPairing || requestingPerms} className="shrink-0 rounded-xl">
                {requestingPerms ? "Meminta izin..." : isScanning ? "Memindai..." : "Scan"}
              </Button>
            </div>
            {pairedDevices.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border bg-background p-1">
                {pairedDevices.map((d) => (
                  <div key={d.address} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{d.address}{d.paired ? " (ter-pair)" : ""}</div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 rounded-lg text-xs h-8"
                      disabled={btPairing}
                      onClick={() => handleAndroidConnect(d.address, d.name)}
                    >
                      {btPairing ? "..." : "Hubungkan"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : isScanning ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border bg-muted/10 px-3 py-6 text-sm text-muted-foreground">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Memindai perangkat Bluetooth...
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input id="bluetoothDeviceName" name="bluetoothDeviceName" defaultValue={initial.bluetoothDeviceName} placeholder="Contoh: RPP02N" className="flex-1" />
            <Button type="button" variant="secondary" onClick={handlePairBluetooth} disabled={btPairing} className="shrink-0 rounded-xl">
              {btPairing ? "Menghubungkan..." : "Pairing / Hubungkan"}
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          {btStatus.connected ? (
            <span className="inline-flex items-center gap-1 font-medium text-green-600">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              Terhubung ke {btStatus.deviceName}
            </span>
          ) : btStatus.deviceName ? (
            <span className="inline-flex items-center gap-1 font-medium text-amber-600">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Perangkat dikenal ({btStatus.deviceName}) — tekan Cetak untuk konek ulang
            </span>
          ) : (
            <span className="text-muted-foreground">Klik Pairing untuk mencari dan menyambungkan printer Bluetooth. Cukup 1 kali, cetak berikutnya otomatis.</span>
          )}
          {btStatus.deviceName ? (
            <button type="button" onClick={handleDisconnectBluetooth} className="text-destructive hover:underline ml-2">Lupakan</button>
          ) : null}
        </div>
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
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="receiptFontSize">Ukuran Font Struk</Label>
          <select id="receiptFontSize" name="receiptFontSize" defaultValue={initial.receiptFontSize || "medium"} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="small">Kecil</option>
            <option value="medium">Sedang</option>
            <option value="large">Besar</option>
          </select>
          <div className="text-xs text-muted-foreground">Menyesuaikan ukuran teks pada hasil cetak struk.</div>
          <FieldError msg={fieldErrors.receiptFontSize} />
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
