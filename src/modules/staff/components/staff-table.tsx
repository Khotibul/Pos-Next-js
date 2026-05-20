"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { upsertStaffAction, deleteStaffAction } from "@/modules/staff/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = { id: string; name: string };
type Branch = { id: string; name: string };

type Item = {
  id: string; // tenantUserId
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  roleId: string;
  roleName: string;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function StaffTable({
  items,
  roles,
  branches,
  q,
}: {
  items: Item[];
  roles: Role[];
  branches: Branch[];
  q?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertStaffAction, null);
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
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari nama / email / role..."
              className="h-11 w-full max-w-md rounded-xl border bg-background px-3 text-sm"
            />
            <Button type="submit" variant="outline" className="rounded-xl">
              Cari
            </Button>
            <Button
              type="button"
              className="ml-auto rounded-xl"
              onClick={() => {
                setNotice(null);
                setEditing(null);
                setOpen(true);
              }}
            >
              Tambah Pegawai
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada pegawai.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.roleName}</TableCell>
                  <TableCell>{u.branchName ?? "-"}</TableCell>
                  <TableCell>
                    {u.emailVerified ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-900">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
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
                          setEditing(u);
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
                          setConfirm(u);
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
            <DialogTitle>{editing ? "Ubah Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>
              Buat akun Manager/Gudang/Akuntan/Kasir dan atur role + cabang. Sistem akan mengirim email verifikasi (jika email provider dikonfigurasi).
            </DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Nama pegawai" />
              <FieldError msg={fieldErrors.name} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" defaultValue={editing?.email ?? ""} placeholder="email@domain.com" />
                <FieldError msg={fieldErrors.email} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telepon</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="Opsional" />
                <FieldError msg={fieldErrors.phone} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="roleId">Role</Label>
                <select id="roleId" name="roleId" defaultValue={editing?.roleId ?? roles[0]?.id ?? ""} className="h-11 rounded-xl border bg-background px-3 text-sm">
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.roleId} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branchId">Cabang</Label>
                <select id="branchId" name="branchId" defaultValue={editing?.branchId ?? ""} className="h-11 rounded-xl border bg-background px-3 text-sm">
                  <option value="">Semua cabang / tidak dibatasi</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.branchId} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{editing ? "Reset Password (opsional)" : "Password"}</Label>
              <Input id="password" name="password" type="password" defaultValue="" placeholder={editing ? "Kosongkan jika tidak diubah" : "Minimal 8 karakter"} />
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

      <Dialog open={Boolean(confirm)} onOpenChange={(v) => (!v ? setConfirm(null) : null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Hapus pegawai?</DialogTitle>
            <DialogDescription>{confirm ? `Akun "${confirm.name}" akan dihapus dari tenant ini.` : null}</DialogDescription>
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
                  const res = await deleteStaffAction(confirm.id);
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

