import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "@/app/(auth)/onboarding/onboarding-form";

export default async function OnboardingPage({ searchParams }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { memberships: { select: { tenantId: true }, take: 1 } },
  });

  if (user?.memberships?.length) redirect("/dashboard");

  const sp = await searchParams;
  const planSlug = (sp?.plan || "pro").toLowerCase();
  return <OnboardingForm defaultPlanSlug={planSlug} />;
}

