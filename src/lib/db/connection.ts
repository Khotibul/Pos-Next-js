import path from "node:path";
import fs from "node:fs";

export function defaultDesktopSqlitePath(userDataDir: string) {
  return path.join(userDataDir, "data", "pos_desktop.sqlite3");
}

export function ensureParentDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function backupSqliteFiles(dbPath: string, reason = "repair") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(path.dirname(dbPath), "repair-backup");
  fs.mkdirSync(backupDir, { recursive: true });

  for (const suffix of ["", "-wal", "-shm"]) {
    const src = `${dbPath}${suffix}`;
    if (!fs.existsSync(src)) continue;
    const target = path.join(backupDir, `${path.basename(dbPath)}${suffix}.${reason}.${stamp}.bak`);
    try {
      fs.renameSync(src, target);
    } catch {
      try {
        fs.copyFileSync(src, target);
        fs.unlinkSync(src);
      } catch {
        // If a lock prevents backup/removal, leave the file in place.
      }
    }
  }
}
