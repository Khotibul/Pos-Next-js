"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

const AUTH_ERROR_MESSAGES = {
  OAuthAccountNotLinked:
    "Akun dengan email ini sudah terdaftar dengan metode login lain. Silakan login memakai email & password, atau gunakan Registrasi Google untuk menghubungkan akun.",
  EMAIL_NOT_VERIFIED: "Email belum diverifikasi. Silakan cek inbox Gmail Anda dan klik link verifikasi.",
  GOOGLE_NOT_REGISTERED: "Login Google hanya bisa untuk akun yang sudah didaftarkan lewat menu Registrasi dengan Google.",
  GOOGLE_ACCOUNT_IN_USE: "Akun Google ini sudah terhubung ke user lain. Silakan gunakan akun Google yang benar atau hubungi admin.",
  GOOGLE_TOKEN_INVALID: "Token Google tidak valid. Silakan coba login ulang.",
  GOOGLE_EMAIL_NOT_VERIFIED: "Email Google belum terverifikasi oleh Google.",
  CALLBACK_URL_ERROR: "Callback URL Google tidak valid. Pastikan AUTH_URL/NEXTAUTH_URL sesuai domain aplikasi.",
  Configuration: "Konfigurasi Google OAuth belum lengkap. Periksa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_URL, dan callback URL.",
  AccessDenied: "Akses Google ditolak atau akun belum memenuhi syarat login.",
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [queryRegistered, setQueryRegistered] = useState(false);
  const [queryEmailSent, setQueryEmailSent] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Avoid `useSearchParams` CSR bailout warning in prerender.
  // Parse query params on client only.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQueryError(sp.get("error"));
    setQueryRegistered(Boolean(sp.get("registered")));
    setQueryEmailSent(sp.get("emailSent"));
    setInfo(sp.get("msg"));
    const emailFromQuery = sp.get("email");
    if (emailFromQuery) setEmail(emailFromQuery);
  }, []);

  async function resendVerification(targetEmail) {
    const e = (targetEmail || "").trim();
    if (!e) {
      setError("Masukkan email terlebih dahulu untuk kirim ulang verifikasi.");
      return;
    }
    setResendLoading(true);
    setError(null);
    setInfo(null);
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: e }),
    });
    setResendLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Gagal mengirim ulang email verifikasi.");
      return;
    }
    setInfo("Email verifikasi telah dikirim. Silakan cek inbox/spam Gmail Anda.");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setIsLoading(false);
    if (res?.error) {
      if (res.error === "EMAIL_NOT_VERIFIED") {
        setError("Email belum diverifikasi. Silakan cek inbox Gmail Anda dan klik link verifikasi.");
        return;
      }
      setError("Login gagal. Periksa email/password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Selamat Datang Kembali</h1>
      <p className="mt-2 text-sm text-muted-foreground">Silakan masuk ke akun Anda untuk melanjutkan operasional.</p>

      {queryRegistered ? (
        <div className="mt-6 rounded-2xl border bg-muted/20 p-4 text-sm">
          Registrasi berhasil. Silakan cek email Anda untuk verifikasi, lalu login.
          {queryEmailSent === "0" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-destructive">Email verifikasi belum terkirim.</span>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl"
                onClick={() => resendVerification(email)}
                disabled={resendLoading}
              >
                {resendLoading ? "Mengirim..." : "Kirim Ulang"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {queryError === "GOOGLE_NOT_REGISTERED" ? (
        <Alert variant="destructive" className="mt-6">
          {AUTH_ERROR_MESSAGES.GOOGLE_NOT_REGISTERED}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline" className="h-9 rounded-xl">
              <Link href="/register">Daftar dengan Google</Link>
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setQueryError(null)}>
              Gunakan email/password
            </Button>
          </div>
        </Alert>
      ) : null}

      {queryError === "EMAIL_NOT_VERIFIED" ? (
        <Alert variant="destructive" className="mt-6">
          {AUTH_ERROR_MESSAGES.EMAIL_NOT_VERIFIED} Jika belum menerima email, kirim ulang verifikasi.
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-xl"
              onClick={() => resendVerification(email)}
              disabled={resendLoading}
            >
              {resendLoading ? "Mengirim..." : "Kirim Ulang Verifikasi"}
            </Button>
          </div>
        </Alert>
      ) : null}

      {queryError && !["GOOGLE_NOT_REGISTERED", "EMAIL_NOT_VERIFIED"].includes(queryError) ? (
        <Alert variant="destructive" className="mt-6">
          {AUTH_ERROR_MESSAGES[queryError] ?? "Login Google gagal. Silakan coba ulang atau gunakan email/password."}
          <div className="mt-3 flex flex-wrap gap-2">
            <GoogleOAuthButton callbackUrl="/onboarding" label="Coba login ulang" disabled={isLoading} />
            <Button type="button" variant="outline" className="h-9 rounded-xl" onClick={() => setQueryError(null)}>
              Gunakan email/password
            </Button>
          </div>
        </Alert>
      ) : null}

      {info ? (
        <Alert className="mt-6">{info}</Alert>
      ) : null}

      <form onSubmit={onSubmit} className="mt-8 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="email">Alamat Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-muted/40 pl-10"
              placeholder="nama@perusahaan.com"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Kata Sandi</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 bg-muted/40 pl-10 pr-10"
              placeholder="********"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Ingat Saya
          </label>
          <Link className="text-sm font-medium text-primary hover:underline" href="#">
            Lupa Password?
          </Link>
        </div>

      {error ? <Alert variant="destructive">{error}</Alert> : null}

      {error && error.toLowerCase().includes("belum diverifikasi") ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl"
          onClick={() => resendVerification(email)}
          disabled={resendLoading}
        >
          {resendLoading ? "Mengirim..." : "Kirim Ulang Email Verifikasi"}
        </Button>
      ) : null}

      <Button type="submit" disabled={isLoading} className="h-14 gap-2 rounded-2xl text-base shadow-md">
        {isLoading ? "Memproses..." : "Masuk"}
        <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <div className="text-xs text-muted-foreground">atau masuk dengan</div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleOAuthButton callbackUrl="/onboarding" label="Masuk dengan Google" disabled={isLoading} />
    </div>
  );
}
