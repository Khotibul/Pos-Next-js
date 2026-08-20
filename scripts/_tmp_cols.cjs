const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  const rows = await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='Product' ORDER BY column_name`;
  console.log("Product columns:", rows.map((r) => r.column_name).join(", "));
  await p.$disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });