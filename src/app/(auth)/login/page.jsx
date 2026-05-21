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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [queryError, setQueryError] = useState(null);
  const [queryRegistered, setQueryRegistered] = useState(false);

  // Avoid `useSearchParams` CSR bailout warning in prerender.
  // Parse query params on client only.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setQueryError(sp.get("error"));
    setQueryRegistered(Boolean(sp.get("registered")));
  }, []);

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
        </div>
      ) : null}

      {queryError === "GOOGLE_NOT_REGISTERED" ? (
        <Alert variant="destructive" className="mt-6">
          Login Google hanya bisa untuk akun yang sudah didaftarkan lewat menu Registrasi dengan Google.
        </Alert>
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
