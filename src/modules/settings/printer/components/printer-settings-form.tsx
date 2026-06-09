"use client";

import { useActionState } from "react";
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
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
          </select>
          <FieldError msg={fieldErrors.paper} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bluetoothDeviceName">Nama Perangkat Bluetooth</Label>
        <Input id="bluetoothDeviceName" name="bluetoothDeviceName" defaultValue={initial.bluetoothDeviceName} placeholder="Biarkan kosong jika ingin selalu memilih secara manual" />
        <div className="text-xs text-muted-foreground">Khusus untuk mode koneksi Bluetooth. (Note: browser mungkin akan tetap meminta izin/pemilihan perangkat)</div>
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
