import "server-only";

import { SETTINGS_KEYS } from "@/modules/settings/keys";
import { getSetting, setSetting } from "@/modules/settings/service";
import {
  CustomerDisplaySettingsSchema,
  type CustomerDisplaySettings,
  UpdateCustomerDisplaySettingsFormSchema,
} from "@/modules/settings/customer-display/validators";

export const DEFAULT_CUSTOMER_DISPLAY_SETTINGS: CustomerDisplaySettings = CustomerDisplaySettingsSchema.parse({
  enabled: false,
  title: "POS Pro",
  subtitle: "Customer Display",
  welcomeMessage: "Selamat datang, silakan cek belanja Anda.",
  thankYouMessage: "Terima kasih sudah berbelanja.",
  idleMessage: "Transaksi siap diproses.",
  theme: "brand",
  layout: "standard",
  showLogo: true,
  showItemImages: true,
  showSku: false,
  showDiscount: true,
  showTax: true,
  showPaymentMethod: true,
  showReceivedAndChange: true,
  showQueueNumber: false,
  autoOpenOnPos: false,
  secondaryScreenUrl: "/customer-display",
});

export async function getCustomerDisplaySettings(params: { tenantId: string }): Promise<CustomerDisplaySettings> {
  const raw = await getSetting({ tenantId: params.tenantId, key: SETTINGS_KEYS.customerDisplay });
  if (!raw) return DEFAULT_CUSTOMER_DISPLAY_SETTINGS;
  const parsed = CustomerDisplaySettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_CUSTOMER_DISPLAY_SETTINGS;
}

export async function updateCustomerDisplaySettings(params: { tenantId: string; input: unknown }) {
  const parsed = UpdateCustomerDisplaySettingsFormSchema.safeParse(params.input);
  if (!parsed.success) return { ok: false as const, message: "Validasi gagal." };

  const normalized = CustomerDisplaySettingsSchema.parse({
    enabled: parsed.data.enabled ?? false,
    title: parsed.data.title,
    subtitle: parsed.data.subtitle ?? "",
    welcomeMessage: parsed.data.welcomeMessage ?? "",
    thankYouMessage: parsed.data.thankYouMessage ?? "",
    idleMessage: parsed.data.idleMessage ?? "",
    theme: parsed.data.theme,
    layout: parsed.data.layout,
    showLogo: parsed.data.showLogo ?? false,
    showItemImages: parsed.data.showItemImages ?? false,
    showSku: parsed.data.showSku ?? false,
    showDiscount: parsed.data.showDiscount ?? false,
    showTax: parsed.data.showTax ?? false,
    showPaymentMethod: parsed.data.showPaymentMethod ?? false,
    showReceivedAndChange: parsed.data.showReceivedAndChange ?? false,
    showQueueNumber: parsed.data.showQueueNumber ?? false,
    autoOpenOnPos: parsed.data.autoOpenOnPos ?? false,
    secondaryScreenUrl: parsed.data.secondaryScreenUrl || "/customer-display",
  });

  await setSetting({ tenantId: params.tenantId, key: SETTINGS_KEYS.customerDisplay, value: normalized });
  return { ok: true as const, data: normalized };
}
