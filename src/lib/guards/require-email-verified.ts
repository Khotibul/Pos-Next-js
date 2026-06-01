import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCachedEmailVerified, setCachedEmailVerified } from "@/lib/cache/user-cache";
import { createDevTimer } from "@/lib/perf";

export async function requireEmailVerified(userId?: string) {
  const resolvedUserId = userId ?? (await auth())?.user?.id;
  if (!resolvedUserId) redirect("/login");

  const cached = await getCachedEmailVerified(resolvedUserId);
  if (cached === true) return true;
  if (cached === false) redirect("/verify-email");

  const end = createDevTimer("auth.emailVerified.cache.miss");
  const user = await prisma.user.findUnique({
    where: { id: resolvedUserId },
    select: { email: true, emailVerified: true },
  });
  end();

  if (!user) redirect("/login");

  const verified = Boolean(user.emailVerified);
  await setCachedEmailVerified(resolvedUserId, verified);

  if (!verified) {
    const url = new URL("/verify-email", "http://localhost");
    if (user.email) url.searchParams.set("email", user.email);
    redirect(`${url.pathname}${url.search}`);
  }

  return true;
}
