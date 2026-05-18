"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProviders, signIn } from "next-auth/react";
import { ArrowRight, Globe, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    getProviders()
      .then((p) => setGoogleEnabled(Boolean(p?.google)))
      .catch(() => setGoogleEnabled(false));
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
      setError("Login gagal. Periksa email/password.");
      return;
    }
    router.push("/dashboard");
  }

  async function onGoogle() {
    setIsLoading(true);
    setError(null);
    await signIn("google", { callbackUrl: "/onboarding" });
  }

  return (
    <div className="w-full max-w-md">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Selamat Datang Kembali</CardTitle>
          <CardDescription>Silakan masuk ke akun Anda untuk melanjutkan operasional.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
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
                  className="pl-10"
                  placeholder="nama@perusahaan.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Kata Sandi</Label>
                <Link className="text-xs font-medium text-primary hover:underline" href="#">
                  Lupa Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error ? <Alert variant="destructive">{error}</Alert> : null}
            <Button type="submit" disabled={isLoading} className="h-12 gap-2 rounded-xl">
              {isLoading ? "Memproses..." : "Masuk"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {googleEnabled ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <div className="text-xs text-muted-foreground">atau</div>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="outline" className="h-12 w-full gap-2 rounded-xl" onClick={onGoogle} disabled={isLoading}>
                <Globe className="h-4 w-4" />
                Masuk dengan Google
              </Button>
            </>
          ) : null}

          <p className="mt-6 text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link className="font-medium text-primary hover:underline" href="/register">
              Daftar Akun Baru
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

