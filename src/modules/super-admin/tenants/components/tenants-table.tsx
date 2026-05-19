"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { upsertTenantAction } from "@/modules/super-admin/tenants/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PlanOption = { id: string; slug: string; name: string };

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  subdomain: string | null;
  status: string;
  trialEndsAt: string | null;
  suspendedAt: string | null;
  planId: string | null;
  planName: string | null;
  createdAt: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function TenantsTable({ items, plans }: { items: TenantRow[]; plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TenantRow | null>(null);

  const [state, formAction, isPending] = useActionState(upsertTenantAction, null as ActionResult<{ id: string }> | null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
    }
  }, [state]);

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Kelola tenant: aktif/nonaktif, trial, domain/subdomain, dan paket.</div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Tambah Tenant
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial Ends</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada tenant.
                </TableCell>
              </TableRow>
            ) : (
              items.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{t.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm">{t.planName ?? "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${t.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : t.status === "TRIAL" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" : t.status === "SUSPENDED" ? "bg-orange-500/15 text-orange-700 dark:text-orange-300" : "bg-muted text-muted-foreground"}`}>
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-sm">{t.domain || t.subdomain ? `${t.subdomain ? `${t.subdomain}.` : ""}${t.domain ?? ""}` : "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 rounded-xl p-0"
                      onClick={() => {
                        setEditing(t);
                        setOpen(true);
                      }}
                      aria-label="Edit tenant"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
            <DialogTitle>{editing ? "Ubah Tenant" : "Tambah Tenant"}</DialogTitle>
            <DialogDescription>Pengaturan ini mempengaruhi akses tenant ke sistem.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Nama bisnis" />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" defaultValue={editing?.slug ?? ""} placeholder="demo-mart" />
              <FieldError msg={fieldErrors.slug} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="planId">Plan</Label>
                <select
                  id="planId"
                  name="planId"
                  defaultValue={editing?.planId ?? ""}
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">(Tidak ada)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.planId} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={editing?.status ?? "TRIAL"}
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="TRIAL">TRIAL</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
                <FieldError msg={fieldErrors.status} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="trialEndsAt">Trial Ends At</Label>
                <Input id="trialEndsAt" name="trialEndsAt" type="date" defaultValue={editing?.trialEndsAt ? editing.trialEndsAt.slice(0, 10) : ""} />
                <FieldError msg={fieldErrors.trialEndsAt} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="suspendedAt">Suspended At</Label>
                <Input id="suspendedAt" name="suspendedAt" type="date" defaultValue={editing?.suspendedAt ? editing.suspendedAt.slice(0, 10) : ""} />
                <FieldError msg={fieldErrors.suspendedAt} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" defaultValue={editing?.domain ?? ""} placeholder="contoh.com" />
                <FieldError msg={fieldErrors.domain} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <Input id="subdomain" name="subdomain" defaultValue={editing?.subdomain ?? ""} placeholder="demo" />
                <FieldError msg={fieldErrors.subdomain} />
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
    </div>
  );
}

