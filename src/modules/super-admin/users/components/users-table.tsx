"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { Eye, KeyRound, MailCheck, Plus, UserPlus } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { assignUserToTenantAction, createUserAction, resetUserPasswordAction, updateUserAction, verifyUserEmailAction } from "@/modules/super-admin/users/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  emailVerified: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  tenantCount: number;
  createdAt: string;
};

type TenantOption = { id: string; name: string; slug: string };
type RoleOption = { id: string; name: string; tenantId: string | null };
type BranchOption = { id: string; name: string; tenantId: string };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function UsersTable({
  items,
  tenants,
  roles,
  branches,
  total,
  page,
  pageSize,
}: {
  items: UserRow[];
  tenants: TenantOption[];
  roles: RoleOption[];
  branches: BranchOption[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [assignUser, setAssignUser] = useState<UserRow | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState(tenants[0]?.id ?? "");

  const [createState, createFormAction, createPending] = useActionState(createUserAction, null as ActionResult<{ id: string }> | null);
  const [updateState, updateFormAction, updatePending] = useActionState(updateUserAction, null as ActionResult<{ id: string }> | null);
  const [resetState, resetFormAction, resetPending] = useActionState(resetUserPasswordAction, null as ActionResult<{ id: string }> | null);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyUserEmailAction, null as ActionResult<{ id: string }> | null);
  const [assignState, assignFormAction, assignPending] = useActionState(assignUserToTenantAction, null as ActionResult<{ id: string }> | null);

  const createErrors = useMemo(() => ((createState && !createState.ok ? createState.fieldErrors : undefined) ?? {}) as Record<string, string>, [createState]);
  const updateErrors = useMemo(() => ((updateState && !updateState.ok ? updateState.fieldErrors : undefined) ?? {}) as Record<string, string>, [updateState]);
  const resetErrors = useMemo(() => ((resetState && !resetState.ok ? resetState.fieldErrors : undefined) ?? {}) as Record<string, string>, [resetState]);
  const assignErrors = useMemo(() => ((assignState && !assignState.ok ? assignState.fieldErrors : undefined) ?? {}) as Record<string, string>, [assignState]);
  const filteredRoles = roles.filter((role) => role.tenantId === null || role.tenantId === selectedTenantId);
  const filteredBranches = branches.filter((branch) => branch.tenantId === selectedTenantId);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (createState?.ok) setCreateOpen(false);
    if (updateState?.ok) setEditUser(null);
    if (resetState?.ok) setResetUser(null);
    if (assignState?.ok) setAssignUser(null);
  }, [assignState, createState, resetState, updateState]);

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-sm text-muted-foreground">
            {total.toLocaleString("id-ID")} user global terdaftar. Halaman {page} dari {totalPages}.
          </div>
          <Button type="button" className="gap-2 rounded-xl" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Tambah User
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>Super Admin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tenant Count</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  User tidak ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{user.email ?? "-"}</div>
                  </TableCell>
                  <TableCell>{user.phone ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={user.emailVerified ? "default" : "secondary"}>{user.emailVerified ? "Verified" : "Unverified"}</Badge>
                  </TableCell>
                  <TableCell>{user.isSuperAdmin ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell>{user.isActive ? <Badge>Active</Badge> : <Badge variant="destructive">Disabled</Badge>}</TableCell>
                  <TableCell className="text-right">{user.tenantCount.toLocaleString("id-ID")}</TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="h-9 w-9 rounded-xl p-0" aria-label="Detail">
                        <Link href={`/super-admin/users/${user.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl" onClick={() => setEditUser(user)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-xl p-0" onClick={() => setAssignUser(user)} aria-label="Assign tenant">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" className="h-9 w-9 rounded-xl p-0" onClick={() => setResetUser(user)} aria-label="Reset password">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {!user.emailVerified ? (
                        <form action={verifyFormAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <Button type="submit" variant="outline" size="sm" className="h-9 w-9 rounded-xl p-0" disabled={verifyPending} aria-label="Verify email">
                            <MailCheck className="h-4 w-4" />
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {verifyState && !verifyState.ok ? <Alert variant="destructive">{verifyState.message}</Alert> : null}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tambah User Global</DialogTitle>
            <DialogDescription>User bisa dihubungkan ke tenant setelah dibuat.</DialogDescription>
          </DialogHeader>
          {createState && !createState.ok ? <Alert variant="destructive">{createState.message}</Alert> : null}
          <form action={createFormAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nama</Label>
              <Input name="name" />
              <FieldError msg={createErrors.name} />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input name="email" type="email" />
              <FieldError msg={createErrors.email} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input name="phone" />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input name="password" type="password" />
              <FieldError msg={createErrors.password} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailVerified" value="true" />
              Email sudah verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isSuperAdmin" value="true" />
              Jadikan Super Admin
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" value="true" defaultChecked />
              User aktif
            </label>
            <DialogFooter>
              <Button type="submit" disabled={createPending} className="rounded-xl">
                {createPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editUser)} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="rounded-2xl" key={editUser?.id ?? "edit"}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Perbarui profil dan akses global user.</DialogDescription>
          </DialogHeader>
          {updateState && !updateState.ok ? <Alert variant="destructive">{updateState.message}</Alert> : null}
          <form action={updateFormAction} className="grid gap-4">
            <input type="hidden" name="id" value={editUser?.id ?? ""} />
            <div className="grid gap-2">
              <Label>Nama</Label>
              <Input name="name" defaultValue={editUser?.name ?? ""} />
              <FieldError msg={updateErrors.name} />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input name="phone" defaultValue={editUser?.phone ?? ""} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="emailVerified" value="true" defaultChecked={Boolean(editUser?.emailVerified)} />
              Email verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isSuperAdmin" value="true" defaultChecked={Boolean(editUser?.isSuperAdmin)} />
              Super Admin
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" value="true" defaultChecked={editUser?.isActive ?? true} />
              User aktif
            </label>
            <DialogFooter>
              <Button type="submit" disabled={updatePending} className="rounded-xl">
                {updatePending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetUser)} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>{resetUser?.email ?? resetUser?.name}</DialogDescription>
          </DialogHeader>
          {resetState && !resetState.ok ? <Alert variant="destructive">{resetState.message}</Alert> : null}
          <form action={resetFormAction} className="grid gap-4">
            <input type="hidden" name="id" value={resetUser?.id ?? ""} />
            <div className="grid gap-2">
              <Label>Password Baru</Label>
              <Input name="password" type="password" />
              <FieldError msg={resetErrors.password} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={resetPending} className="rounded-xl">
                Reset
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignUser)} onOpenChange={(open) => !open && setAssignUser(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Assign User ke Tenant</DialogTitle>
            <DialogDescription>{assignUser?.email ?? assignUser?.name}</DialogDescription>
          </DialogHeader>
          {assignState && !assignState.ok ? <Alert variant="destructive">{assignState.message}</Alert> : null}
          <form action={assignFormAction} className="grid gap-4">
            <input type="hidden" name="userId" value={assignUser?.id ?? ""} />
            <div className="grid gap-2">
              <Label>Tenant</Label>
              <select name="tenantId" value={selectedTenantId} onChange={(event) => setSelectedTenantId(event.target.value)} className="h-11 rounded-xl border bg-background px-3 text-sm">
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
              <FieldError msg={assignErrors.tenantId} />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <select name="roleId" className="h-11 rounded-xl border bg-background px-3 text-sm">
                {filteredRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} {role.tenantId ? "" : "(global)"}
                  </option>
                ))}
              </select>
              <FieldError msg={assignErrors.roleId} />
            </div>
            <div className="grid gap-2">
              <Label>Cabang</Label>
              <select name="branchId" className="h-11 rounded-xl border bg-background px-3 text-sm">
                <option value="">Semua / default tenant</option>
                {filteredBranches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={assignPending} className="rounded-xl">
                Assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
