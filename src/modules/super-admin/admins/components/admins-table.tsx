"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { ShieldMinus, ShieldPlus } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { revokeInternalAdminAction, upsertInternalAdminAction } from "@/modules/super-admin/admins/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; name: string | null; email: string | null; createdAt: string };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function AdminsTable({ items }: { items: Row[] }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertInternalAdminAction, null as ActionResult<{ id: string }> | null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) setOpen(false);
  }, [state]);

  const [isRevoking, startRevoke] = useTransition();

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Kelola admin internal (Super Admin) untuk platform SaaS.</div>
          <Button type="button" className="rounded-xl" onClick={() => setOpen(true)}>
            <ShieldPlus className="mr-2 h-4 w-4" />
            Tambah Admin
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Belum ada admin internal.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{u.email ?? "-"}</TableCell>
                  <TableCell className="text-sm">{new Date(u.createdAt).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-xl"
                      disabled={isRevoking}
                      onClick={() => {
                        setNotice(null);
                        startRevoke(async () => {
                          const res = await revokeInternalAdminAction(u.id);
                          if (!res.ok) setNotice(res.message);
                        });
                      }}
                    >
                      <ShieldMinus className="mr-2 h-4 w-4" />
                      Cabut
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tambah / Promote Admin</DialogTitle>
            <DialogDescription>Jika email sudah ada, sistem akan mempromosikan user menjadi Super Admin.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="admin@company.com" />
              <FieldError msg={fieldErrors.email} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nama (opsional)</Label>
              <Input id="name" name="name" placeholder="Admin SaaS" />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password (wajib untuk user baru)</Label>
              <Input id="password" name="password" type="password" placeholder="Min. 8 karakter" />
              <FieldError msg={fieldErrors.password} />
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

