"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action";
import type { CustomerDisplaySettings } from "@/modules/settings/customer-display/validators";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ToggleField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border bg-background p-3 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-muted-foreground/40" />
      <span>{label}</span>
    </label>
  );
}

export function CustomerDisplaySettingsForm({
  initial,
  action,
}: {
  initial: CustomerDisplaySettings;
  action: (prev: unknown, formData: FormData) => Promise<ActionResult<{ ok: true }>>;
}) {
  const [state, formAction, isPending] = useActionState(action, null);
  const fieldErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const message = state && !state.ok ? state.message : null;
  const success = state?.ok ? "Pengaturan customer display berhasil disimpan." : null;

  return (
    <form action={formAction} className="grid gap-5">
      {message ? <Alert variant="destructive">{message}</Alert> : null}
      {success ? <Alert>{success}</Alert> : null}

      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
        <div>
          <div className="text-sm font-semibold">Status Display</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Aktifkan customer display untuk layar kedua, tablet pelanggan, atau monitor kasir menghadap customer.
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField name="enabled" label="Aktifkan Customer Display" defaultChecked={initial.enabled} />
          <ToggleField name="autoOpenOnPos" label="Auto buka saat POS dibuka" defaultChecked={initial.autoOpenOnPos} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="title">Judul Display</Label>
          <Input id="title" name="title" defaultValue={initial.title} placeholder="POS Pro" />
          <FieldError message={fieldErrors.title} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subtitle">Subjudul</Label>
          <Input id="subtitle" name="subtitle" defaultValue={initial.subtitle} placeholder="Customer Display" />
          <FieldError message={fieldErrors.subtitle} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="theme">Tema</Label>
          <select id="theme" name="theme" defaultValue={initial.theme} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="brand">Brand Blue</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <FieldError message={fieldErrors.theme} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="layout">Layout</Label>
          <select id="layout" name="layout" defaultValue={initial.layout} className="h-10 rounded-xl border bg-background px-3 text-sm">
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="media">Media / Promo</option>
          </select>
          <FieldError message={fieldErrors.layout} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="secondaryScreenUrl">URL Layar Display</Label>
          <Input id="secondaryScreenUrl" name="secondaryScreenUrl" defaultValue={initial.secondaryScreenUrl} />
          <FieldError message={fieldErrors.secondaryScreenUrl} />
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="welcomeMessage">Pesan Selamat Datang</Label>
          <Input id="welcomeMessage" name="welcomeMessage" defaultValue={initial.welcomeMessage} />
          <FieldError message={fieldErrors.welcomeMessage} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="idleMessage">Pesan Saat Idle</Label>
          <Input id="idleMessage" name="idleMessage" defaultValue={initial.idleMessage} />
          <FieldError message={fieldErrors.idleMessage} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="thankYouMessage">Pesan Setelah Transaksi</Label>
          <Input id="thankYouMessage" name="thankYouMessage" defaultValue={initial.thankYouMessage} />
          <FieldError message={fieldErrors.thankYouMessage} />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-muted/10 p-4">
        <div>
          <div className="text-sm font-semibold">Informasi yang Ditampilkan</div>
          <div className="mt-1 text-xs text-muted-foreground">Sesuaikan field customer display dengan keranjang dan struk POS.</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleField name="showLogo" label="Tampilkan logo toko" defaultChecked={initial.showLogo} />
          <ToggleField name="showItemImages" label="Tampilkan gambar produk" defaultChecked={initial.showItemImages} />
          <ToggleField name="showSku" label="Tampilkan SKU item" defaultChecked={initial.showSku} />
          <ToggleField name="showDiscount" label="Tampilkan diskon" defaultChecked={initial.showDiscount} />
          <ToggleField name="showTax" label="Tampilkan pajak" defaultChecked={initial.showTax} />
          <ToggleField name="showPaymentMethod" label="Tampilkan metode pembayaran" defaultChecked={initial.showPaymentMethod} />
          <ToggleField name="showReceivedAndChange" label="Tampilkan uang dibayar & kembalian" defaultChecked={initial.showReceivedAndChange} />
          <ToggleField name="showQueueNumber" label="Tampilkan nomor antrean/order" defaultChecked={initial.showQueueNumber} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/settings">Kembali</Link>
        </Button>
        <Button type="submit" disabled={isPending} className="rounded-xl">
          {isPending ? "Menyimpan..." : "Simpan Customer Display"}
        </Button>
      </div>
    </form>
  );
}
