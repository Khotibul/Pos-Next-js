"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Copy, Ban, Plus } from "lucide-react";
import { generateLicenseKeysAction, revokeLicenseKeyAction } from "@/modules/licenses/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Item = {
  id: string;
  serial: string;
  createdAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
  expiresAt: string | null;
  planName: string;
  tenantName: string | null;
};

export function LicensesAdmin({
  items,
  q,
}: {
  items: Item[];
  q?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(generateLicenseKeysAction, null);
  const message = state && !state.ok ? state.message : null;
  const createdSerials = state && state.ok ? state.data?.serials ?? [] : [];

  const [revoking, startRevoke] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const copyAll = useMemo(() => createdSerials.join("\n"), [createdSerials]);

  return (
    <div className="grid gap-4">
      {message ? <Alert variant="destructive">{message}</Alert> : null}
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="py-4">
          <form className="flex flex-wrap gap-2">
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Cari serial / tenant..."
              className="h-11 w-full max-w-md rounded-xl border bg-background px-3 text-sm"
            />
            <Button type="submit" variant="outline" className="rounded-xl">
              Cari
            </Button>
            <Button type="button" className="ml-auto gap-2 rounded-xl" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Generate
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Serial</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Belum ada lisensi.
                </TableCell>
              </TableRow>
            ) : (
              items.map((x) => {
                const status = x.revokedAt ? "REVOKED" : x.redeemedAt ? "USED" : "UNUSED";
                return (
                  <TableRow key={x.id}>
                    <TableCell className="font-mono text-xs">{x.serial}</TableCell>
                    <TableCell>{x.planName}</TableCell>
                    <TableCell className="text-muted-foreground">{x.tenantName ?? "-"}</TableCell>
                    <TableCell>{status}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(x.createdAt).toLocaleString("id-ID")}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-xl p-0"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(x.serial);
                            } catch {}
                          }}
                          aria-label="Copy"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-xl p-0"
                          disabled={revoking || Boolean(x.revokedAt)}
                          onClick={() => {
                            const ok = window.confirm(`Revoke serial ${x.serial}?`);
                            if (!ok) return;
                            setNotice(null);
                            startRevoke(async () => {
                              const res = await revokeLicenseKeyAction(x.id);
                              if (!res.ok) setNotice(res.message);
                            });
                          }}
                          aria-label="Revoke"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Generate Serial Number</DialogTitle>
            <DialogDescription>Buat serial untuk aktivasi tenant. Simpan serial yang dibuat.</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="planSlug">Plan</Label>
              <select id="planSlug" name="planSlug" className="h-11 rounded-xl border bg-background px-3 text-sm" defaultValue="pro">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="qty">Jumlah</Label>
                <Input id="qty" name="qty" defaultValue="1" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiresAt">Expired (opsional)</Label>
                <Input id="expiresAt" name="expiresAt" type="date" />
              </div>
            </div>

            {createdSerials.length > 0 ? (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-medium">Serial dibuat</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(copyAll);
                      } catch {}
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs">{copyAll}</pre>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="submit" className="rounded-xl" disabled={isPending}>
                {isPending ? "Membuat..." : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

