import { NextResponse } from "next/server";
import { getLatestRelease } from "@/config/downloads";

export const runtime = "nodejs";

export async function GET() {
  const android = getLatestRelease("ANDROID");
  const windows = getLatestRelease("WINDOWS");

  return NextResponse.json({
    android: android
      ? {
          version: android.version,
          downloadUrl: android.downloadUrl,
          fileSize: android.fileSize ?? null,
          sha256: android.sha256 ?? null,
          changelog: android.changelog,
          releaseDate: android.releaseDate,
        }
      : null,
    windows: windows
      ? {
          version: windows.version,
          downloadUrl: windows.downloadUrl,
          fileSize: windows.fileSize ?? null,
          sha256: windows.sha256 ?? null,
          changelog: windows.changelog,
          releaseDate: windows.releaseDate,
        }
      : null,
  });
}

