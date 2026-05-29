import path from "node:path";
import fs from "node:fs";

export function defaultDesktopSqlitePath(userDataDir: string) {
  return path.join(userDataDir, "data", "pos_desktop.sqlite3");
}

export function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}
