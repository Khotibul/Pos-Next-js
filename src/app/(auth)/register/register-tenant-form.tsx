"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { ArrowRight, Globe, Lock, Mail, Store, User } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterTenantForm({ planSlug }: { planSlug: string }) {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders()
      .then((p) => setGoogleEnabled(Boolean(p?.google)))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/auth/register-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantName, ownerName, email, password, planSlug }),
    });
    setIsLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(data?.message ?? "Registrasi gagal.");
      return;
    }
    router.push("/login");
  }

  async function onGoogleSignup() {
    setIsLoading(true);
    setError(null);
    await signIn("google", { callbackUrl: `/onboarding?plan=${encodeURIComponent(planSlug)}` });
  }

  return (
    <div className="w-full max-w-lg">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Mulai Bisnis Anda</CardTitle>
          <CardDescription>
            Lengkapi formulir di bawah untuk mendaftarkan tenant Anda (paket: {planSlug.toUpperCase()}).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {googleEnabled ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full gap-2 rounded-xl"
                onClick={onGoogleSignup}
                disabled={isLoading}
              >
                <Globe className="h-4 w-4" />
                Daftar dengan Google
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">atau daftar dengan email</div>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          ) : null}

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="ownerName">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required className="pl-10" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tenantName">Nama Bisnis</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="tenantName" value={tenantName} onChange={(e) => setTenantName(e.target.value)} required className="pl-10" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Bisnis</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-10" />
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
                  className="pl-10"
                />
              </div>
            </div>
            {error ? <Alert variant="destructive">{error}</Alert> : null}
            <Button type="submit" disabled={isLoading} className="h-12 gap-2 rounded-xl">
              {isLoading ? "Memproses..." : "Daftar Sekarang"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link className="font-medium text-primary hover:underline" href="/login">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
