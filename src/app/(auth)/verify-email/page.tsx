import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyEmailByToken } from "@/modules/auth/email-verification/service";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const sp = await searchParams;
  const token = sp.token?.trim() ?? "";

  let tokenOk: boolean | null = null;
  let tokenMessage: string | null = null;

  if (token) {
    try {
      await verifyEmailByToken({ token });
      tokenOk = true;
      tokenMessage = "Email berhasil diverifikasi. Silakan lanjut ke dashboard.";
    } catch (e: unknown) {
      tokenOk = false;
      tokenMessage = e instanceof Error ? e.message : "Verifikasi gagal.";
    }
  }

  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, emailVerified: true },
      })
    : null;

  return (
    <VerifyEmailPanel
      email={user?.email ?? null}
      verified={Boolean(user?.emailVerified) || tokenOk === true}
      tokenMessage={tokenMessage}
      tokenOk={tokenOk}
    />
  );
}
