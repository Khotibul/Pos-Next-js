"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { upsertPlanAction, deletePlanAction } from "@/modules/plans/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Plan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  priceMonthly: string;
  trialDays: number;
  isPopular: boolean;
  isActive: boolean;
  updatedAt: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function PlansTable({ items }: { items: Plan[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertPlanAction, null as ActionResult<{ id: string }> | null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
    }
  }, [state]);

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Plan | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Kelola paket: trial days dan harga per bulan.</div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            Tambah Paket
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Harga / bulan</TableHead>
              <TableHead>Trial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada paket.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                  <TableCell className="font-medium">
                    {p.name} {p.isPopular ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">POPULAR</span> : null}
                  </TableCell>
                  <TableCell>{`${p.currency} ${p.priceMonthly}`}</TableCell>
                  <TableCell>{p.trialDays} hari</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${p.isActive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                      {p.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 rounded-xl p-0"
                        onClick={() => {
                          setNotice(null);
                          setEditing(p);
                          setOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 rounded-xl p-0"
                        onClick={() => {
                          setNotice(null);
                          setConfirm(p);
                        }}
                        aria-label="Hapus"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Paket" : "Tambah Paket"}</DialogTitle>
            <DialogDescription>Perubahan pricing langsung mempengaruhi halaman Pricing dan registrasi tenant.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={editing?.slug ?? ""} placeholder="starter / pro / enterprise" />
              <FieldError msg={fieldErrors.slug} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Pro" />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" name="description" defaultValue={editing?.description ?? ""} placeholder="Untuk bisnis berkembang" />
              <FieldError msg={fieldErrors.description} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" name="currency" defaultValue={editing?.currency ?? "IDR"} />
                <FieldError msg={fieldErrors.currency} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="priceMonthly">Harga / bulan</Label>
                <Input id="priceMonthly" name="priceMonthly" type="number" step="1" defaultValue={editing?.priceMonthly ?? "0"} />
                <FieldError msg={fieldErrors.priceMonthly} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="trialDays">Trial (hari)</Label>
                <Input id="trialDays" name="trialDays" type="number" step="1" defaultValue={String(editing?.trialDays ?? 14)} />
                <FieldError msg={fieldErrors.trialDays} />
              </div>
              <div className="grid gap-2">
                <Label>Flags</Label>
                <div className="flex flex-wrap gap-4 pt-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isPopular" defaultChecked={editing?.isPopular ?? false} />
                    Popular
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isPending} className="rounded-xl">
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirm)} onOpenChange={(v) => (!v ? setConfirm(null) : null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus paket?</DialogTitle>
            <DialogDescription>{confirm ? `Paket "${confirm.name}" akan dihapus permanen.` : null}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" type="button" onClick={() => setConfirm(null)} disabled={isDeleting}>
              Batal
            </Button>
            <Button
              className="rounded-xl"
              type="button"
              disabled={isDeleting || !confirm}
              onClick={() => {
                if (!confirm) return;
                setNotice(null);
                startDelete(async () => {
                  const res = await deletePlanAction(confirm.id);
                  if (!res.ok) setNotice(res.message);
                  setConfirm(null);
                });
              }}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

