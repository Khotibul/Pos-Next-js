/* eslint-disable no-console */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const ANDROID_DIR = path.join(ROOT, "android");

function javaExe(javaHome) {
  return path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
}

function getJavaMajor(javaHome) {
  const exe = javaExe(javaHome);
  if (!fs.existsSync(exe)) return null;
  const result = spawnSync(exe, ["-version"], { encoding: "utf8", windowsHide: true });
  const text = `${result.stderr || ""}\n${result.stdout || ""}`;
  const match = text.match(/version\s+"(?:(1)\.)?(\d+)/);
  if (!match) return null;
  return match[1] ? Number(match[2]) : Number(match[2]);
}

function isCompatibleJava(javaHome) {
  const major = getJavaMajor(javaHome);
  return major !== null && major >= 17 && major <= 24;
}

function candidates() {
  const values = [
    process.env.ANDROID_JAVA_HOME,
    process.env.JAVA_HOME,
    "C:\\Program Files\\Android\\Android Studio\\jbr",
    "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.8.9-hotspot",
    "C:\\Program Files\\Eclipse Adoptium\\jdk-21",
    "C:\\Program Files\\Java\\jdk-21",
    "C:\\Program Files\\Java\\jdk-17",
  ];
  return values.filter((v) => typeof v === "string" && v.trim()).map((v) => path.resolve(v));
}

function findJavaHome() {
  for (const javaHome of candidates()) {
    if (isCompatibleJava(javaHome)) return javaHome;
  }
  return null;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: node scripts/run-android-gradle.cjs <gradle-task> [...args]");
    process.exit(1);
  }

  const javaHome = findJavaHome();
  if (!javaHome) {
    console.error("[android-gradle] JDK kompatibel tidak ditemukan.");
    console.error("[android-gradle] Install JDK 17/21 atau set ANDROID_JAVA_HOME ke folder JDK.");
    console.error("[android-gradle] Java saat ini kemungkinan terlalu baru (contoh Java 25 -> Unsupported class file major version 69).");
    process.exit(1);
  }

  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`,
  };

  console.log(`[android-gradle] JAVA_HOME=${javaHome}`);
  const result = spawnSync(gradlew, args, {
    cwd: ANDROID_DIR,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: false,
  });

  process.exit(result.status ?? 1);
}

main();

