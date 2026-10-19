const { spawnSync } = require("child_process");

const env = { ...process.env };
const isNeon = (v) => typeof v === "string" && v.includes("neon.tech");
if (isNeon(env.DATABASE_URL) && !isNeon(env.DIRECT_URL)) {
  env.DIRECT_URL = env.DATABASE_URL;
}

function run() {
  return spawnSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", "src/prisma/schema.prisma"],
    { stdio: "inherit", env, shell: process.platform === "win32" },
  );
}

let lastStatus = 1;
for (let attempt = 1; attempt <= 3; attempt++) {
  const r = run();
  lastStatus = r.status ?? 1;
  if (lastStatus === 0) process.exit(0);
  if (attempt < 3) {
    console.error(`prisma migrate deploy gagal (percobaan ${attempt}/3), mengulang dalam ${attempt * 5} detik...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 5000);
  }
}
console.error("prisma migrate deploy gagal setelah 3 percobaan.");
process.exit(lastStatus);
