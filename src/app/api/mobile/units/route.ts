import { prisma } from "@/lib/prisma";
import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler, apiOk } from "@/lib/api-response";

export const runtime = "nodejs";

export const GET = withApiHandler(async (req: Request) => {
  const ctx = await getMobileContext(req);

  const units = await prisma.productUnit.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { name: "asc" },
  });

  return apiOk(
    units.map((u) => ({
      id: u.id,
      name: u.name,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  );
});
