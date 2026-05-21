"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { redeemLicenseAction } from "@/modules/licenses/actions";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}

export function RedeemLicenseCard({ disabled }: { disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(redeemLicenseAction, null);
  const fieldErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const message = state && !state.ok ? state.message : null;
  const success = state && state.ok ? "Tenant berhasil diaktifkan." : null;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="py-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-4 w-4" />
          </span>
          Aktivasi Tenant
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {message ? <Alert variant="destructive">{message}</Alert> : null}
        {success ? <Alert>{success}</Alert> : null}

        <form action={formAction} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="serial">Serial Number</Label>
            <Input
              id="serial"
              name="serial"
              placeholder="PPOS-XXXX-XXXX-XXXX-XXXX"
              className="h-12"
              disabled={disabled || isPending}
            />
            <FieldError msg={fieldErrors.serial} />
            <div className="text-xs text-muted-foreground">
              Jika belum punya serial, Anda tetap bisa menggunakan sistem selama masa trial (30 hari untuk tenant baru).
            </div>
          </div>

          <Button type="submit" className="h-12 rounded-xl" disabled={disabled || isPending}>
            {isPending ? "Memproses..." : "Aktifkan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

