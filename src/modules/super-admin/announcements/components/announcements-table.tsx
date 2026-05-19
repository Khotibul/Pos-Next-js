"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { deleteAnnouncementAction, upsertAnnouncementAction } from "@/modules/super-admin/announcements/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = {
  id: string;
  title: string;
  message: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function AnnouncementsTable({ items }: { items: Row[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(upsertAnnouncementAction, null as ActionResult<{ id: string }> | null);
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
          <div className="text-sm text-muted-foreground">Broadcast pengumuman untuk semua tenant.</div>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => {
              setNotice(null);
              setEditing(null);
              setOpen(true);
            }}
          >
            Buat Pengumuman
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-2xl border bg-background">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Belum ada pengumuman.
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs ${a.status === "PUBLISHED" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : a.status === "DRAFT" ? "bg-muted text-muted-foreground" : "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                      {a.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.startsAt ? new Date(a.startsAt).toLocaleDateString("id-ID") : "-"} — {a.endsAt ? new Date(a.endsAt).toLocaleDateString("id-ID") : "-"}
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
                          setEditing(a);
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
                        onClick={() => setConfirm(a)}
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
            <DialogTitle>{editing ? "Ubah Pengumuman" : "Buat Pengumuman"}</DialogTitle>
            <DialogDescription>Pengumuman ditampilkan di portal tenant (dashboard).</DialogDescription>
          </DialogHeader>

          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-3 grid gap-4">
            {editing?.id ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div className="grid gap-2">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" name="title" defaultValue={editing?.title ?? ""} />
              <FieldError msg={fieldErrors.title} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Pesan</Label>
              <textarea
                id="message"
                name="message"
                defaultValue={editing?.message ?? ""}
                className="min-h-28 rounded-xl border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              <FieldError msg={fieldErrors.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <select id="status" name="status" defaultValue={editing?.status ?? "DRAFT"} className="h-11 rounded-xl border bg-background px-3 text-sm">
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
                <FieldError msg={fieldErrors.status} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" name="startsAt" type="date" defaultValue={editing?.startsAt ? editing.startsAt.slice(0, 10) : ""} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" name="endsAt" type="date" defaultValue={editing?.endsAt ? editing.endsAt.slice(0, 10) : ""} />
              </div>
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
            <DialogTitle>Hapus pengumuman?</DialogTitle>
            <DialogDescription>{confirm ? `Pengumuman "${confirm.title}" akan dihapus permanen.` : null}</DialogDescription>
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
                  const res = await deleteAnnouncementAction(confirm.id);
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

