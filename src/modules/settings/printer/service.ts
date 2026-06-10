import "server-only";

import { SETTINGS_KEYS } from "@/modules/settings/keys";
import { getSetting, setSetting } from "@/modules/settings/service";
import { PrinterSettingsSchema, type PrinterSettings, UpdatePrinterSettingsFormSchema } from "@/modules/settings/printer/validators";
import { getCache, setCache, deleteCache } from "@/lib/redis";

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = PrinterSettingsSchema.parse({
  paper: "80mm",
  customWidthMm: 58,
  customHeightMm: 150,
  autoPrintAfterPayment: false,
  showLogo: false,
  headerTitle: "POS Pro",
  headerSubtitle: "",
  footerNote: "Terima kasih sudah berbelanja.",
  showTax: true,
  showDiscount: true,
  showSkuOnReceipt: true,
  showUnitPriceOnReceipt: true,
    cartShowSku: true,
    cartShowStock: true,
    cartShowDiscount: true,
    cartShowTax: true,
    receiptFontSize: "medium",
  });

export async function getPrinterSettings(params: { tenantId: string }): Promise<PrinterSettings> {
  const cacheKey = `printer:settings:${params.tenantId}`;
  const cached = await getCache<PrinterSettings>(cacheKey);
  if (cached) return cached;

  const raw = await getSetting({ tenantId: params.tenantId, key: SETTINGS_KEYS.printer });
  if (!raw) return DEFAULT_PRINTER_SETTINGS;
  const parsed = PrinterSettingsSchema.safeParse(raw);
  const result = parsed.success ? parsed.data : DEFAULT_PRINTER_SETTINGS;

  await setCache(cacheKey, result, 120);
  return result;
}

export async function updatePrinterSettings(params: { tenantId: string; input: unknown }) {
  const parsed = UpdatePrinterSettingsFormSchema.safeParse(params.input);
  if (!parsed.success) return { ok: false as const, message: "Validasi gagal." };
  const normalized = PrinterSettingsSchema.parse({
    connectionType: parsed.data.connectionType ?? "browser",
    bluetoothDeviceName: parsed.data.bluetoothDeviceName ?? "",
    paper: parsed.data.paper,
    customWidthMm: parsed.data.customWidthMm ?? 58,
    customHeightMm: parsed.data.customHeightMm ?? 150,
    autoPrintAfterPayment: parsed.data.autoPrintAfterPayment ?? false,
    showLogo: parsed.data.showLogo ?? false,
    headerTitle: parsed.data.headerTitle,
    headerSubtitle: parsed.data.headerSubtitle ?? "",
    footerNote: parsed.data.footerNote ?? "",
    showTax: parsed.data.showTax ?? true,
    showDiscount: parsed.data.showDiscount ?? true,
    showSkuOnReceipt: parsed.data.showSkuOnReceipt ?? true,
    showUnitPriceOnReceipt: parsed.data.showUnitPriceOnReceipt ?? true,
    cartShowSku: parsed.data.cartShowSku ?? true,
    cartShowStock: parsed.data.cartShowStock ?? true,
    cartShowDiscount: parsed.data.cartShowDiscount ?? true,
    cartShowTax: parsed.data.cartShowTax ?? true,
    receiptFontSize: parsed.data.receiptFontSize ?? "medium",
  });

  await setSetting({ tenantId: params.tenantId, key: SETTINGS_KEYS.printer, value: normalized });
  await deleteCache(`printer:settings:${params.tenantId}`);
  return { ok: true as const, data: normalized };
}
