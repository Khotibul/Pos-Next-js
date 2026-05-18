import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant-context";
import { PERMISSIONS } from "@/lib/permissions-keys";
import { Errors } from "@/lib/errors";
import { getPrinterSettings } from "@/modules/settings/printer/service";

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) {
    const canRead = ctx.permissions.includes(PERMISSIONS.settings_read) || ctx.permissions.includes(PERMISSIONS.sales_write);
    if (!canRead) throw Errors.forbidden("Anda tidak punya akses pengaturan printer.");
  }
  const settings = await getPrinterSettings({ tenantId: ctx.tenantId });
  return NextResponse.json({ ok: true, data: settings });
}
