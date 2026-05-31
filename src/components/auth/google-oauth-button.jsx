"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

function GoogleMark({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.152 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.87 19.51C14.655 15.108 18.956 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.047 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.132 0-9.62-3.317-11.283-7.946l-6.52 5.025C9.505 39.556 16.227 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a11.99 11.99 0 0 1-4.087 5.57h.003l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917Z"
      />
    </svg>
  );
}

export function GoogleOAuthButton({ callbackUrl, label, disabled, variant = "outline", onClickOverride, purpose = "login" }) {
  const [enabled, setEnabled] = useState(true);
  const [isElectron, setIsElectron] = useState(false);
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let ignore = false;
    setIsElectron(Boolean(window.posDesktop) || /Electron/i.test(window.navigator.userAgent));
    setIsCapacitor(Boolean(window.Capacitor?.isNativePlatform?.()) || Boolean(window.Capacitor?.Plugins?.GoogleAuth));
    fetch("/api/auth/google-enabled")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (ignore) return;
        if (j && typeof j.enabled === "boolean") setEnabled(j.enabled);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  async function onClick() {
    if (isElectron) return;
    if (isCapacitor) {
      const googleAuth = window.Capacitor?.Plugins?.GoogleAuth;
      if (!googleAuth?.signIn) {
        setMessage("Google native login belum tersedia di APK. Gunakan email/password atau pasang plugin GoogleAuth.");
        return;
      }
      try {
        setMessage(null);
        if (googleAuth.initialize) {
          await googleAuth.initialize({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            serverClientId: process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          });
        }
        const result = await googleAuth.signIn();
        const idToken = result?.authentication?.idToken || result?.idToken;
        if (!idToken) throw new Error("GOOGLE_TOKEN_INVALID");
        const res = await fetch("/api/mobile/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.message || "Login Google Android gagal.");
        window.localStorage.setItem("pos_mobile_token", json.token);
        window.location.href = json.needsOnboarding ? "/onboarding" : callbackUrl || "/dashboard";
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Login Google Android gagal.");
      }
      return;
    }
    if (onClickOverride) return onClickOverride();
    // For login flow, set a short-lived cookie used to safely auto-link Google
    // to an existing verified credentials account (prevents OAuthAccountNotLinked).
    if (purpose === "login") {
      try {
        await fetch("/api/auth/oauth-link", { method: "POST" });
      } catch {
        // ignore
      }
    }
    await signIn("google", { callbackUrl: callbackUrl || "/onboarding" });
  }

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant={variant}
        className="h-12 w-full gap-2 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
        onClick={onClick}
        disabled={disabled || !enabled || isElectron}
        title={
          isElectron
            ? "Login Google tidak tersedia di aplikasi desktop. Gunakan email/password."
            : !enabled
              ? "Google OAuth belum dikonfigurasi (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET)."
              : undefined
        }
      >
        <GoogleMark className="h-4 w-4" />
        {isElectron ? "Google tidak tersedia di Desktop" : label || "Masuk dengan Google"}
      </Button>
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
