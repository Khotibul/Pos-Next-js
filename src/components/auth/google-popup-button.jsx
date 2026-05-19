"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal load Google script")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal load Google script"));
    document.head.appendChild(script);
  });
}

export function GooglePopupButton({
  clientId,
  callbackUrl,
  label = "Masuk dengan Google",
  variant = "outline",
  disabled,
}) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isEnabled = useMemo(() => Boolean(clientId), [clientId]);

  useEffect(() => {
    if (!isEnabled) return;
    let mounted = true;
    loadGoogleScript()
      .then(() => mounted && setReady(true))
      .catch((e) => mounted && setError(e?.message || "Google auth tidak tersedia"));
    return () => {
      mounted = false;
    };
  }, [isEnabled]);

  async function onClick() {
    try {
      setBusy(true);
      setError(null);
      await loadGoogleScript();

      if (!window.google?.accounts?.id) throw new Error("Google auth tidak siap");

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            const token = resp?.credential;
            if (!token) throw new Error("Token Google tidak ditemukan");

            const res = await signIn("google-id-token", {
              token,
              redirect: false,
            });

            if (res?.error) throw new Error("Gagal login dengan Google");
            window.location.href = callbackUrl || "/onboarding";
          } catch (e) {
            setError(e?.message || "Gagal login dengan Google");
            setBusy(false);
          }
        },
        ux_mode: "popup",
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          setBusy(false);
        }
      });
    } catch (e) {
      setError(e?.message || "Gagal membuka Google auth");
      setBusy(false);
    }
  }

  if (!isEnabled) return null;

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant={variant}
        className="h-12 w-full gap-2 rounded-xl"
        onClick={onClick}
        disabled={disabled || busy || !ready}
      >
        <Globe className="h-4 w-4" />
        {busy ? "Memproses..." : label}
      </Button>
      {error ? <div className="text-xs text-destructive">{error}</div> : null}
    </div>
  );
}

