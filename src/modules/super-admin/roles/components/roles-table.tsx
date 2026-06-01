"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action";
import { cloneRoleAction, createRoleAction, deleteRoleAction } from "@/modules/super-admin/roles/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RoleRow = {
  id: string;
  name: string;
  tenantId: string | null;
  tenantName: string | null;
  permissionCount: number;
  userCount: number;
  createdAt: string;
};

type TenantOption = { id: string; name: string; slug: string };

export function RolesTable({ items, tenants }: { items: RoleRow[]; tenants: TenantOption[] }) {
  const [createState, createFormAction, createPending] = useActionState(createRoleAction, null as ActionResult<{ id: string }> | null);
  const [cloneState, cloneFormAction, clonePending] = useActionState(cloneRoleAction, null as ActionResult<{ id: string }> | null);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteRoleAction, null as ActionResult<{ id: string }> | null);

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="grid gap-4 py-4 lg:grid-cols-2">
          <form action={createFormAction} className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
            <div className="font-semibold">Create Role</div>
            {createState && !createState.ok ? <Alert variant="destructive">{createState.message}</Alert> : null}
            <div className="grid gap-2">
              <Label>Nama Role</Label>
              <Input name="name" placeholder="MANAGER" />
            </div>
            <div className="grid gap-2">
              <Label>Tenant</Label>
              <select name="tenantId" className="h-11 rounded-xl border bg-background px-3 text-sm">
                <option value="">Global Template</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="rounded-xl" disabled={createPending}>
              Create Role
            </Button>
          </form>

          <form action={cloneFormAction} className="grid gap-3 rounded-2xl border bg-muted/20 p-4">
            <div className="font-semibold">Clone Role</div>
            {cloneState && !cloneState.ok ? <Alert variant="destructive">{cloneState.message}</Alert> : null}
            <div className="grid gap-2">
              <Label>Role Sumber</Label>
              <select name="roleId" className="h-11 rounded-xl border bg-background px-3 text-sm">
                {items.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} · {role.tenantName ?? "Global"}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Nama Role Baru</Label>
              <Input name="name" placeholder="MANAGER_COPY" />
            </div>
            <div className="grid gap-2">
              <Label>Tenant Tujuan</Label>
              <select name="tenantId" className="h-11 rounded-xl border bg-background px-3 text-sm">
                <option value="">Global Template</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="rounded-xl" disabled={clonePending}>
              Clone Role
            </Button>
          </form>
        </CardContent>
      </Card>

      {deleteState && !deleteState.ok ? <Alert variant="destructive">{deleteState.message}</Alert> : null}
      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.tenantName ?? "Global Template"}</TableCell>
                <TableCell className="text-right">{role.permissionCount.toLocaleString("id-ID")}</TableCell>
                <TableCell className="text-right">{role.userCount.toLocaleString("id-ID")}</TableCell>
                <TableCell>{new Date(role.createdAt).toLocaleDateString("id-ID")}</TableCell>
                <TableCell className="text-right">
                  <form action={deleteFormAction}>
                    <input type="hidden" name="roleId" value={role.id} />
                    <Button type="submit" variant="outline" size="sm" className="rounded-xl" disabled={deletePending || role.userCount > 0}>
                      Delete
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
