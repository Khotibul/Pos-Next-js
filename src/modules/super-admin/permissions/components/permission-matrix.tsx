"use client";

import { useActionState, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action";
import { updatePermissionMatrixAction } from "@/modules/super-admin/permissions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Role = {
  id: string;
  name: string;
  tenantName: string | null;
  permissionIds: string[];
};

type Permission = {
  id: string;
  key: string;
  name: string;
  tenantName: string | null;
};

function moduleName(key: string) {
  return key.split(".")[0] || "general";
}

export function PermissionMatrix({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
  const [state, formAction, pending] = useActionState(updatePermissionMatrixAction, null as ActionResult<{ id: string }> | null);
  const [query, setQuery] = useState("");
  const filteredPermissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter((permission) => `${permission.key} ${permission.name}`.toLowerCase().includes(q));
  }, [permissions, query]);

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="text-sm text-muted-foreground">
            Matrix {roles.length.toLocaleString("id-ID")} role x {permissions.length.toLocaleString("id-ID")} permission.
          </div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search permission..." className="max-w-sm rounded-xl" />
        </CardContent>
      </Card>
      {state && !state.ok ? <Alert variant="destructive">{state.message}</Alert> : null}
      {state?.ok ? <Alert>Permission matrix berhasil disimpan.</Alert> : null}
      <form action={formAction} className="grid gap-4">
        {roles.map((role) => (
          <input key={role.id} type="hidden" name="roleId" value={role.id} />
        ))}
        <div className="max-h-[70vh] overflow-auto rounded-2xl border bg-background">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead className="min-w-[280px]">Permission</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="min-w-[150px] text-center">
                    <div className="font-semibold">{role.name}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">{role.tenantName ?? "Global"}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.map((permission) => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <div className="font-mono text-xs text-primary">{permission.key}</div>
                    <div className="text-sm">{permission.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {moduleName(permission.key)} · {permission.tenantName ?? "Global"}
                    </div>
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role.id} className="text-center">
                      <input
                        type="checkbox"
                        name={`grant:${role.id}`}
                        value={permission.id}
                        defaultChecked={role.permissionIds.includes(permission.id)}
                        className="h-4 w-4 rounded border"
                        aria-label={`${role.name} ${permission.key}`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="sticky bottom-4 flex justify-end">
          <Button type="submit" className="rounded-xl shadow-xl shadow-primary/20" disabled={pending}>
            {pending ? "Menyimpan..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
