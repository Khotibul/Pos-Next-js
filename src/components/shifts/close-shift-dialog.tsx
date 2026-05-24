"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { DoorClosed } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { closeShiftAction } from "@/modules/shifts/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function CloseShiftDialog({
  shiftId,
  disabled = false,
  triggerLabel = "Tutup Shift",
}: {
  shiftId: string | null;
  disabled?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(closeShiftAction, null as ActionResult<{ id: string }> | null);

  const errors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(true)} disabled={disabled || !shiftId}>
        <DoorClosed className="mr-2 h-4 w-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={(v) => (pending ? null : setOpen(v))}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Tutup Shift</DialogTitle>
            <DialogDescription>Masukkan uang aktual (cash counted) untuk menutup shift.</DialogDescription>
          </DialogHeader>
          {message ? <Alert variant="destructive">{message}</Alert> : null}
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="shiftId" value={shiftId ?? ""} />
            <div className="grid gap-2">
              <Label htmlFor="cashCounted">Cash Counted</Label>
              <Input id="cashCounted" name="cashCounted" type="number" step="1" defaultValue="0" />
              <FieldError msg={errors.cashCounted} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="closeNote">Catatan</Label>
              <Input id="closeNote" name="closeNote" placeholder="Opsional" />
              <FieldError msg={errors.closeNote} />
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-xl" disabled={pending || !shiftId}>
                {pending ? "Memproses..." : "Tutup Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

