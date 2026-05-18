"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { completeOnboardingAction } from "@/modules/tenants/actions";

export function OnboardingForm({ defaultPlanSlug }) {
  const sp = useSearchParams();
  const planFromUrl = (sp.get("plan") || defaultPlanSlug || "pro").toLowerCase();

  const [state, formAction, isPending] = useActionState(completeOnboardingAction, null);

  const fieldErrors = (state && !state.ok ? state.fieldErrors : undefined) ?? {};
  const message = state && !state.ok ? state.message : null;

  return (
    <div className="w-full max-w-lg">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Aktifkan Tenant</CardTitle>
          <CardDescription>Lengkapi nama bisnis untuk mulai menggunakan POS Pro.</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? <Alert variant="destructive">{message}</Alert> : null}

          <form action={formAction} className="mt-4 grid gap-4">
            <input type="hidden" name="planSlug" value={planFromUrl} />

            <div className="grid gap-2">
              <Label htmlFor="tenantName">Nama Bisnis</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="tenantName" name="tenantName" required className="pl-10" placeholder="Nama toko/perusahaan" />
              </div>
              {fieldErrors.tenantName ? <p className="text-xs text-destructive">{fieldErrors.tenantName}</p> : null}
            </div>

            <Button type="submit" disabled={isPending} className="h-12 gap-2 rounded-xl">
              {isPending ? "Memproses..." : "Lanjutkan"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-muted-foreground">
              Paket: <span className="font-mono">{planFromUrl}</span>. Anda bisa mengubah paket dari menu billing setelah masuk.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

