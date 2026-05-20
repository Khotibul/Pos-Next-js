"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { upsertBranchAction, deleteBranchAction } from "@/modules/branches/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  name: string;
  code: string | null;
  categoryId: string | null;
  categoryName: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  updatedAt: string;
};

type Category = { id: string; name: string };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function BranchesTable({
  items,
  categories,
  query,
}: {
  items: Item[];
  categories: Category[];
  query: { q: string; categoryId: string };
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertBranchAction, null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
    }
  }, [state]);

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Item | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Daftar Cabang</CardTitle>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            Tambah Cabang
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3">
          <form className="flex flex-wrap gap-2">
            <Input name="q" defaultValue={query.q} placeholder="Cari cabang / kode..." className="max-w-sm" />
            <select name="categoryId" defaultValue={query.categoryId} className="h-11 rounded-xl border bg-background px-3 text-sm">
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="rounded-xl">
              Filter
            </Button>
          </form>

          <div className="overflow-x-auto rounded-2xl border bg-background">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Belum ada cabang.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="font-mono text-xs">{b.code ?? "-"}</TableCell>
                      <TableCell>{b.categoryName}</TableCell>
                      <TableCell>{b.phone ?? "-"}</TableCell>
                      <TableCell>
                        {b.isActive ? (
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
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
                              setEditing(b);
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
                              setConfirm(b);
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
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl" key={editing?.id ?? "new"}>
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Cabang" : "Tambah Cabang"}</DialogTitle>
            <DialogDescription>Cabang tersimpan per-tenant dan tercatat audit log.</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="name">Nama Cabang</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Contoh: Outlet Sudirman" />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="code">Kode</Label>
                <Input id="code" name="code" defaultValue={editing?.code ?? ""} placeholder="Opsional (unik)" />
                <FieldError msg={fieldErrors.code} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="categoryId">Kategori</Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={editing?.categoryId ?? ""}
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.categoryId} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="Opsional" />
                <FieldError msg={fieldErrors.phone} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={editing?.isActive === false ? "false" : "true"}
                  className="h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" name="address" defaultValue={editing?.address ?? ""} placeholder="Opsional" />
              <FieldError msg={fieldErrors.address} />
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
            <DialogTitle>Hapus cabang?</DialogTitle>
            <DialogDescription>{confirm ? `Cabang "${confirm.name}" akan dihapus. Aksi ini tidak bisa dibatalkan.` : null}</DialogDescription>
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
                  const res = await deleteBranchAction(confirm.id);
                  if (!res.ok) {
                    setNotice(res.message);
                    setConfirm(null);
                    return;
                  }
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
