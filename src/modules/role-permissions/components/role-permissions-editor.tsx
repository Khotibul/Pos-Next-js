"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ActionResult } from "@/lib/action";
import { updateRolePermissionsAction } from "@/modules/role-permissions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Role = { id: string; name: string };
type Perm = { id: string; key: string; name: string };

export function RolePermissionsEditor({
  roles,
  permissions,
  initialRoleId,
  initialPermissionIds,
}: {
  roles: Role[];
  permissions: Perm[];
  initialRoleId: string | null;
  initialPermissionIds: Record<string, string[]>;
}) {
  const [roleId, setRoleId] = useState<string>(initialRoleId ?? (roles[0]?.id ?? ""));
  const [selected, setSelected] = useState<Set<string>>(new Set(initialPermissionIds[roleId] ?? []));

  useEffect(() => {
    setSelected(new Set(initialPermissionIds[roleId] ?? []));
  }, [roleId, initialPermissionIds]);

  const [state, formAction, isPending] = useActionState(updateRolePermissionsAction, null as ActionResult<{ id: string }> | null);
  const message = state && !state.ok ? state.message : null;
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <div className="grid gap-2">
            <Label htmlFor="roleId">Role</Label>
            <select
              id="roleId"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-sm"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {fieldErrors.roleId ? <p className="text-xs text-destructive">{fieldErrors.roleId}</p> : null}
          </div>
        </CardContent>
      </Card>

      {message ? <Alert variant="destructive">{message}</Alert> : null}

      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="roleId" value={roleId} />

        <div className="grid gap-2 rounded-2xl border bg-background p-4">
          <div className="text-sm font-medium">Permissions</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {permissions.map((p) => {
              const checked = selected.has(p.id);
              return (
                <label key={p.id} className="flex items-start gap-3 rounded-xl border bg-muted/10 p-3 text-sm">
                  <input
                    type="checkbox"
                    name="permissionIds"
                    value={p.id}
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(p.id);
                      else next.delete(p.id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{p.key}</span>
                    <span className="block text-xs text-muted-foreground">{p.name}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" className="rounded-xl" disabled={isPending || !roleId}>
            {isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

