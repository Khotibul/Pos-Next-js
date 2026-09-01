const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "toko-beras" } });
  const units = await prisma.productUnit.findMany({ where: { tenantId: tenant.id } });
  console.log(units.map((u) => u.name).join(", "));
  await prisma.$disconnect();
})();
