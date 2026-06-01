"use client";

import { useActionState } from "react";
import { removeUserFromTenantAction, resetUserPasswordAction, verifyUserEmailAction } from "@/modules/super-admin/users/actions";
import type { ActionResult } from "@/lib/action";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Membership = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  roleName: string | null;
  branchName: string | null;
  createdAt: string;
};

type AuditItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
};

export function UserDetailPanel({
  user,
  memberships,
  auditLogs,
}: {
  user: { id: string; name: string | null; email: string | null; phone: string | null; emailVerified: string | null; isSuperAdmin: boolean; isActive: boolean; createdAt: string };
  memberships: Membership[];
  auditLogs: AuditItem[];
}) {
  const [resetState, resetFormAction, resetPending] = useActionState(resetUserPasswordAction, null as ActionResult<{ id: string }> | null);
  const [verifyState, verifyFormAction, verifyPending] = useActionState(verifyUserEmailAction, null as ActionResult<{ id: string }> | null);
  const [removeState, removeFormAction, removePending] = useActionState(removeUserFromTenantAction, null as ActionResult<{ id: string }> | null);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Profil User</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Nama</span>
              <span className="font-medium">{user.name ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium">{user.phone ?? "-"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email Verified</span>
              <Badge variant={user.emailVerified ? "default" : "secondary"}>{user.emailVerified ? "Verified" : "Unverified"}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Super Admin</span>
              <Badge variant={user.isSuperAdmin ? "default" : "secondary"}>{user.isSuperAdmin ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={user.isActive ? "default" : "destructive"}>{user.isActive ? "Active" : "Disabled"}</Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Created At</span>
              <span>{new Date(user.createdAt).toLocaleString("id-ID")}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {resetState && !resetState.ok ? <Alert variant="destructive">{resetState.message}</Alert> : null}
            {verifyState && !verifyState.ok ? <Alert variant="destructive">{verifyState.message}</Alert> : null}
            <form action={resetFormAction} className="grid gap-2">
              <input type="hidden" name="id" value={user.id} />
              <Label>Password Baru</Label>
              <Input name="password" type="password" placeholder="Minimal 8 karakter" />
              <Button type="submit" className="rounded-xl" disabled={resetPending}>
                Reset Password
              </Button>
            </form>
            {!user.emailVerified ? (
              <form action={verifyFormAction}>
                <input type="hidden" name="id" value={user.id} />
                <Button type="submit" variant="outline" className="w-full rounded-xl" disabled={verifyPending}>
                  Verify Email Manual
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tenant Membership</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {removeState && !removeState.ok ? <Alert variant="destructive">{removeState.message}</Alert> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    User belum memiliki tenant.
                  </TableCell>
                </TableRow>
              ) : (
                memberships.map((membership) => (
                  <TableRow key={membership.tenantId}>
                    <TableCell>
                      <div className="font-medium">{membership.tenantName}</div>
                      <div className="font-mono text-xs text-muted-foreground">{membership.tenantSlug}</div>
                    </TableCell>
                    <TableCell>{membership.tenantStatus}</TableCell>
                    <TableCell>{membership.roleName ?? "-"}</TableCell>
                    <TableCell>{membership.branchName ?? "-"}</TableCell>
                    <TableCell>{new Date(membership.createdAt).toLocaleDateString("id-ID")}</TableCell>
                    <TableCell className="text-right">
                      <form action={removeFormAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="tenantId" value={membership.tenantId} />
                        <Button type="submit" variant="outline" size="sm" className="rounded-xl" disabled={removePending}>
                          Remove
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Audit Log User</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {auditLogs.length === 0 ? (
            <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">Belum ada audit log.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    {log.action} · {log.entity}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">{log.entityId ?? "-"}</div>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("id-ID")}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
