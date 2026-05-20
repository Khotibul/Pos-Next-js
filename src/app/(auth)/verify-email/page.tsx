import Link from "next/link";
import { verifyEmailByToken } from "@/modules/auth/email-verification/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  const token = sp.token?.trim() ?? "";

  let ok = false;
  let message = "Token tidak valid.";

  if (token) {
    try {
      await verifyEmailByToken({ token });
      ok = true;
      message = "Email berhasil diverifikasi. Silakan login untuk melanjutkan.";
    } catch (e: unknown) {
      message = e instanceof Error ? e.message : "Verifikasi gagal.";
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center px-6 py-12">
      <Card className="w-full rounded-3xl">
        <CardHeader>
          <CardTitle>{ok ? "Verifikasi Berhasil" : "Verifikasi Gagal"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="text-sm text-muted-foreground">{message}</div>
          <div className="flex gap-2">
            <Button asChild className="rounded-xl">
              <Link href="/login">Ke Login</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/register">Daftar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
