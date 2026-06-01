"use client";

import { useActionState } from "react";
import type { ActionResult } from "@/lib/action";
import { updateSubscriptionAction } from "@/modules/super-admin/subscriptions/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId: string | null;
  planName: string | null;
  priceMonthly: string;
  trialEndsAt: string | null;
  createdAt: string;
};

type Plan = { id: string; name: string; slug: string };

export function SubscriptionTable({ items, plans, total, page, pageSize }: { items: Row[]; plans: Plan[]; total: number; page: number; pageSize: number }) {
  const [state, formAction, pending] = useActionState(updateSubscriptionAction, null as ActionResult<{ id: string }> | null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
        {total.toLocaleString("id-ID")} subscription tenant · halaman {page}/{totalPages}
      </div>
      {state && !state.ok ? <Alert variant="destructive">{state.message}</Alert> : null}
      {state?.ok ? <Alert>Subscription berhasil diperbarui.</Alert> : null}
      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trial Ends</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{item.slug}</div>
                </TableCell>
                <TableCell>{item.planName ?? "-"}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{item.trialEndsAt ? new Date(item.trialEndsAt).toLocaleDateString("id-ID") : "-"}</TableCell>
                <TableCell>{item.priceMonthly}</TableCell>
                <TableCell className="text-right">
                  <form action={formAction} className="flex flex-wrap justify-end gap-2">
                    <input type="hidden" name="tenantId" value={item.id} />
                    <select name="planId" defaultValue={item.planId ?? ""} className="h-9 rounded-xl border bg-background px-2 text-xs">
                      <option value="">No Plan</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <select name="status" defaultValue={item.status} className="h-9 rounded-xl border bg-background px-2 text-xs">
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="EXPIRED">EXPIRED</option>
                    </select>
                    <input name="trialEndsAt" type="date" defaultValue={item.trialEndsAt ? item.trialEndsAt.slice(0, 10) : ""} className="h-9 rounded-xl border bg-background px-2 text-xs" />
                    <Button type="submit" size="sm" className="rounded-xl" disabled={pending}>
                      Save
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
