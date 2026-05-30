/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const KEYSTORE = path.join(ROOT, "android", "app", "pos-pro-release.keystore");
const PROPS = path.join(ROOT, "android", "keystore.properties");

function main() {
  const password = process.env.ANDROID_KEYSTORE_PASSWORD;
  if (!password || password.length < 8) {
    console.error("Set ANDROID_KEYSTORE_PASSWORD minimal 8 karakter sebelum menjalankan script ini.");
    console.error('Contoh PowerShell: $env:ANDROID_KEYSTORE_PASSWORD="PasswordKuat123!"');
    process.exit(1);
  }

  if (fs.existsSync(KEYSTORE)) {
    console.error(`Keystore sudah ada: ${KEYSTORE}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(KEYSTORE), { recursive: true });
  const keytool = "keytool";
  const result = spawnSync(
    keytool,
    [
      "-genkeypair",
      "-v",
      "-keystore",
      KEYSTORE,
      "-alias",
      "pospro",
      "-keyalg",
      "RSA",
      "-keysize",
      "2048",
      "-validity",
      "10000",
      "-storepass",
      password,
      "-keypass",
      password,
      "-dname",
      "CN=POS Pro, OU=POS, O=POS Pro, L=Jakarta, ST=DKI Jakarta, C=ID",
    ],
    { stdio: "inherit", windowsHide: true },
  );

  if (result.status !== 0) process.exit(result.status ?? 1);

  fs.writeFileSync(
    PROPS,
    [
      "storeFile=app/pos-pro-release.keystore",
      `storePassword=${password}`,
      "keyAlias=pospro",
      `keyPassword=${password}`,
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`Keystore dibuat: ${KEYSTORE}`);
  console.log(`Config signing dibuat: ${PROPS}`);
}

main();

