"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type GateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "allowed" }
  | { status: "blocked"; message: string };

function isElectron() {
  return typeof window !== "undefined" && Boolean(window.posDesktop);
}

export function DesktopLicenseGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GateState>({ status: "idle" });

  const isOnLicensePage = useMemo(() => pathname?.startsWith("/settings/license"), [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isElectron()) return;
      if (isOnLicensePage) return;

      setState({ status: "loading" });
      try {
        const res = await window.posDesktop!.license.getCurrent();
        if (!res.ok) {
          if (!cancelled) setState({ status: "blocked", message: res.message || "Gagal membaca lisensi desktop." });
          return;
        }

        const valid = res.data.valid;
        // No license => block by default (user can activate trial).
        if (!res.data.license || !valid || !valid.ok) {
          const reason = valid?.reason || "Lisensi belum aktif atau tidak valid.";
          if (!cancelled) setState({ status: "blocked", message: reason });
          return;
        }

        if (!cancelled) setState({ status: "allowed" });
      } catch (e) {
        if (!cancelled) setState({ status: "blocked", message: e instanceof Error ? e.message : "Gagal validasi lisensi." });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOnLicensePage]);

  if (!isElectron()) return null;
  // Never block the license screen itself; users must be able to activate/repair license.
  if (isOnLicensePage) return null;
  if (state.status === "idle" || state.status === "loading" || state.status === "allowed") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-6 backdrop-blur">
      <Card className="w-full max-w-lg p-6">
        <div className="text-lg font-semibold">Aktivasi Lisensi Diperlukan</div>
        <div className="mt-2 text-sm text-muted-foreground">{state.message}</div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              // Hide overlay immediately to avoid trapping navigation.
              setState({ status: "idle" });
              router.push("/settings/license");
            }}
          >
            Buka Menu Lisensi
          </Button>
          <Button variant="secondary" onClick={() => router.refresh()}>
            Coba Lagi
          </Button>
        </div>
      </Card>
    </div>
  );
}
