export const SETTINGS_KEYS = {
  customerDisplay: "customer_display",
  printer: "printer",
} as const;

export type SettingKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];
