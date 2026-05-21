"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, Lock, Mail, Phone, Store, User } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleOAuthButton } from "@/components/auth/google-oauth-button";

export function RegisterTenantForm({ planSlug, initialError }) {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(initialError || null);

  async function onSubmit(e) {
    e.preventDefault();
    if (!agreed) {
      setError("Anda harus menyetujui syarat & ketentuan.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantName, ownerName, email, phone, password, planSlug }),
    });
    const data = await res.json().catch(() => null);
    setIsLoading(false);
    if (!res.ok) {
      setError(data?.message ?? "Registrasi gagal.");
      return;
    }

    const emailSent = data?.verificationEmailSent === false ? "0" : "1";
    const msg = data?.message ? `&msg=${encodeURIComponent(data.message)}` : "";
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
    router.push(`/login?registered=1&emailSent=${emailSent}${emailParam}${msg}`);
  }

  async function onRegisterWithGoogle() {
    if (!agreed) {
      setError("Anda harus menyetujui syarat & ketentuan.");
      return;
    }
    if (!tenantName.trim() || tenantName.trim().length < 2 || !ownerName.trim() || ownerName.trim().length < 2) {
      setError("Nama lengkap dan nama bisnis wajib diisi untuk daftar dengan Google.");
      return;
    }

    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/auth/oauth-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantName, ownerName, phone, planSlug }),
    });
    setIsLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.message ?? "Registrasi Google gagal.");
      return;
    }

    await signIn("google", { callbackUrl: "/api/auth/clear-oauth-reg?next=/onboarding" });
  }

  return (
    <div className="w-full">
      <h1 className="text-4xl font-semibold tracking-tight">Mulai Bisnis Anda</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Lengkapi formulir di bawah untuk mendaftarkan akun PointPro POS Anda dalam hitungan menit.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="ownerName">Nama Lengkap</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
              className="h-12 bg-muted/40 pl-10"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tenantName">Nama Bisnis</Label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="tenantName"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              required
              className="h-12 bg-muted/40 pl-10"
              placeholder="Nama Toko atau Perusahaan"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email Bisnis</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-muted/40 pl-10"
              placeholder="contoh@bisnis.com"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Nomor Telepon</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 bg-muted/40 pl-10"
              placeholder="0812 3456 7890"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 bg-muted/40 pl-10"
              placeholder="Min. 8 Karakter"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>
            Saya menyetujui{" "}
            <Link className="font-medium text-primary hover:underline" href="#">
              Syarat dan Ketentuan
            </Link>{" "}
            serta{" "}
            <Link className="font-medium text-primary hover:underline" href="#">
              Kebijakan Privasi
            </Link>{" "}
            yang berlaku di PointPro POS.
          </span>
        </label>

        {error ? <Alert variant="destructive">{error}</Alert> : null}

        <Button type="submit" disabled={isLoading} className="h-14 rounded-2xl text-base shadow-md">
          {isLoading ? "Memproses..." : "Daftar Sekarang"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <div className="text-xs text-muted-foreground">atau daftar dengan</div>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleOAuthButton
        label="Daftar dengan Google"
        disabled={isLoading}
        callbackUrl="/onboarding"
        variant="outline"
        onClickOverride={onRegisterWithGoogle}
      />

      <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
        Butuh bantuan?{" "}
        <Link className="font-medium text-primary hover:underline" href="#">
          Hubungi Tim Support
        </Link>
      </div>
    </div>
  );
}
