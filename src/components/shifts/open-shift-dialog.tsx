"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { DoorOpen } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { openShiftAction } from "@/modules/shifts/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function OpenShiftDialog({
  disabled = false,
  triggerLabel = "Buka Shift",
  open,
  onOpenChange,
  hideTrigger,
  preventClose,
  onOpened,
}: {
  disabled?: boolean;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
  preventClose?: boolean;
  onOpened?: (shiftId: string) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [state, formAction, pending] = useActionState(openShiftAction, null as ActionResult<{ id: string }> | null);

  const errors = useMemo(() => ((state && !state.ok ? state.fieldErrors : undefined) ?? {}) as Record<string, string>, [state]);
  const message = state && !state.ok ? state.message : null;

  useEffect(() => {
    if (state && state.ok) setInternalOpen(false);
  }, [state]);

  // Backward-compatible: if used without control props, behaves like old component.
  return (
    <OpenShiftDialogControlled
      disabled={disabled}
      triggerLabel={triggerLabel}
      internalOpen={internalOpen}
      setInternalOpen={setInternalOpen}
      state={state}
      formAction={formAction}
      pending={pending}
      errors={errors}
      message={message}
      open={open}
      onOpenChange={onOpenChange}
      hideTrigger={hideTrigger}
      preventClose={preventClose}
      onOpened={onOpened}
    />
  );
}

function OpenShiftDialogControlled({
  disabled,
  triggerLabel,
  internalOpen,
  setInternalOpen,
  state,
  formAction,
  pending,
  errors,
  message,
  open: controlledOpen,
  onOpenChange,
  hideTrigger,
  preventClose,
  onOpened,
}: {
  disabled: boolean;
  triggerLabel: string;
  internalOpen: boolean;
  setInternalOpen: (v: boolean) => void;
  state: ActionResult<{ id: string }> | null;
  formAction: (payload: FormData) => void;
  pending: boolean;
  errors: Record<string, string>;
  message: string | null;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
  preventClose?: boolean;
  onOpened?: (shiftId: string) => void;
}) {
  const open = typeof controlledOpen === "boolean" ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (typeof controlledOpen === "boolean") onOpenChange?.(v);
    else setInternalOpen(v);
  };

  useEffect(() => {
    if (state && state.ok) {
      onOpened?.(state.data.id);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <>
      {hideTrigger ? null : (
        <Button type="button" className="rounded-xl" onClick={() => setOpen(true)} disabled={disabled}>
          <DoorOpen className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (pending) return;
          if (preventClose && v === false) return;
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Buka Shift</DialogTitle>
            <DialogDescription>Set modal awal (opening cash) sebelum mulai transaksi.</DialogDescription>
          </DialogHeader>
          {message ? <Alert variant="destructive">{message}</Alert> : null}
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="openingCash">Opening Cash</Label>
              <Input id="openingCash" name="openingCash" type="number" step="1" defaultValue="0" />
              <FieldError msg={errors.openingCash} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openNote">Catatan</Label>
              <Input id="openNote" name="openNote" placeholder="Opsional" />
              <FieldError msg={errors.openNote} />
            </div>
            <DialogFooter>
              <Button type="submit" className="rounded-xl" disabled={pending}>
                {pending ? "Memproses..." : "Buka Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
