"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { deleteGlobalSettingAction, upsertGlobalSettingAction } from "@/modules/super-admin/system-settings/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = { id: string; key: string; valueJson: string; updatedAt: string };

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function GlobalSettingsTable({ items }: { items: Row[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertGlobalSettingAction, null as ActionResult<{ id: string }> | null);
  const fieldErrors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) {
      setOpen(false);
      setEditing(null);
    }
  }, [state]);

  const [isDeleting, startDelete] = useTransition();
  const [confirm, setConfirm] = useState<Row | null>(null);

  return (
    <div className="grid gap-4">
      {notice ? <Alert variant="destructive">{notice}</Alert> : null}

      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="text-sm text-muted-foreground">Key-value global untuk aplikasi SaaS.</div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            Tambah Setting
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value (JSON)</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Belum ada global setting.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.key}</TableCell>
                  <TableCell className="max-w-[520px]">
                    <div className="line-clamp-2 font-mono text-xs text-muted-foreground">{s.valueJson}</div>
                  </TableCell>
                  <TableCell className="text-sm">{new Date(s.updatedAt).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 rounded-xl p-0"
                        onClick={() => {
                          setNotice(null);
                          setEditing(s);
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
                        onClick={() => setConfirm(s)}
                        aria-label="Delete"
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
            <DialogTitle>{editing ? "Ubah Global Setting" : "Tambah Global Setting"}</DialogTitle>
            <DialogDescription>Value disimpan sebagai JSON. Contoh: {"{\"trialDaysDefault\":14}"}</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" name="key" defaultValue={editing?.key ?? ""} placeholder="saas.trial.defaultDays" />
              <FieldError msg={fieldErrors.key} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valueJson">Value (JSON)</Label>
              <textarea
                id="valueJson"
                name="valueJson"
                defaultValue={editing?.valueJson ?? "{\n  \n}"}
                className="min-h-40 rounded-xl border bg-background px-3 py-2 font-mono text-xs outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              <FieldError msg={fieldErrors.valueJson} />
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
            <DialogTitle>Hapus setting?</DialogTitle>
            <DialogDescription>{confirm ? `Key "${confirm.key}" akan dihapus permanen.` : null}</DialogDescription>
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
                  const res = await deleteGlobalSettingAction(confirm.id);
                  if (!res.ok) setNotice(res.message);
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

