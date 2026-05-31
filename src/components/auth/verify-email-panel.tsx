"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MailCheck, RefreshCcw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type VerifyEmailPanelProps = {
  email: string | null;
  verified: boolean;
  tokenMessage: string | null;
  tokenOk: boolean | null;
};

export function VerifyEmailPanel({ email, verified, tokenMessage, tokenOk }: VerifyEmailPanelProps) {
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<string | null>(tokenMessage);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const canResend = useMemo(() => Boolean(email) && !verified && seconds === 0 && !sending, [email, seconds, sending, verified]);

  async function resend() {
    if (!email || !canResend) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) throw new Error(json?.message ?? "Gagal mengirim ulang email verifikasi.");
      setStatus("Email verifikasi berhasil dikirim ulang. Silakan cek inbox atau folder spam.");
      setSeconds(60);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal mengirim ulang email verifikasi.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-6 py-12">
      <Card className="w-full rounded-3xl border-border/70 shadow-xl shadow-primary/5">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle>{verified || tokenOk ? "Email Terverifikasi" : "Verifikasi Email Anda"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {verified || tokenOk
              ? "Akun Anda sudah siap digunakan. Silakan lanjut masuk ke dashboard."
              : "Kami perlu memastikan email Anda aktif sebelum mengakses sistem POS."}
          </p>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
            <div className="text-muted-foreground">Status email</div>
            <div className="mt-1 font-medium">{email ?? "Email akun tidak tersedia"}</div>
            <div className={verified || tokenOk ? "mt-2 text-emerald-600" : "mt-2 text-amber-600"}>
              {verified || tokenOk ? "Sudah diverifikasi" : "Belum diverifikasi"}
            </div>
          </div>

          {status ? (
            <Alert variant={tokenOk === false ? "destructive" : "default"}>
              <AlertTitle>{tokenOk === false ? "Verifikasi gagal" : "Informasi"}</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          ) : null}

          {verified || tokenOk ? (
            <Button asChild className="h-12 rounded-xl">
              <Link href="/dashboard">Masuk Dashboard</Link>
            </Button>
          ) : (
            <Button onClick={resend} disabled={!canResend} className="h-12 rounded-xl">
              <RefreshCcw className={sending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {seconds > 0 ? `Kirim ulang dalam ${seconds}s` : sending ? "Mengirim..." : "Kirim Ulang Verifikasi"}
            </Button>
          )}

          <div className="flex items-center justify-between text-sm">
            <Link className="text-primary hover:underline" href="/login">
              Kembali ke Login
            </Link>
            <Link className="text-muted-foreground hover:text-primary" href="/register">
              Daftar akun baru
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
