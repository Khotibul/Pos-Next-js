export {};

declare global {
  type PosDesktopApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; message?: string };

  type PosDesktopDeviceInfo = {
    deviceId: string;
    userData: string;
    dataDir: string;
    backupDir: string;
    logsDir: string;
    platform: string;
    arch: string;
  };

  type PosDesktopLicenseRow = {
    id: string;
    tenantId?: string | null;
    licenseKey: string | null;
    companyName: string | null;
    ownerName: string | null;
    email: string | null;
    phone: string | null;
    deviceId: string | null;
    activationDate: string | null;
    expiredDate: string | null;
    maxUsers: number;
    maxBranches: number;
    planType: string;
    isActive: boolean;
    lastValidationAt: string | null;
    offlineGraceDays: number;
    signatureHash: string | null;
    encryptedPayload: string | null;
  };

  type PosDesktopLicenseValidity = { ok: boolean; reason?: string };

  type PosDesktopLicenseGetCurrent = PosDesktopApiResult<{
    license: PosDesktopLicenseRow | null;
    payload: unknown | null;
    valid: PosDesktopLicenseValidity | null;
  }>;

  type PosDesktopLicenseActivateTrial = PosDesktopApiResult<{ id: string }>;
  type PosDesktopLicenseClear = PosDesktopApiResult<{ ok: true }>;
  type PosDesktopLicenseActivateKey = PosDesktopApiResult<{ id: string }>;

  interface Window {
    posDesktop?: {
      device: {
        getInfo: () => Promise<PosDesktopDeviceInfo>;
      };
      database: {
        ensure: () => Promise<
          PosDesktopApiResult<{
            ready: boolean;
            userData: string;
            dataDir: string;
            backupDir: string;
            logsDir: string;
            message?: string;
          }>
        >;
      };
      license: {
        getCurrent: () => Promise<PosDesktopLicenseGetCurrent>;
        activateTrial: (input: { companyName: string; ownerName: string; email: string; phone: string; days: number }) => Promise<PosDesktopLicenseActivateTrial>;
        activateKey: (input: { serial: string }) => Promise<PosDesktopLicenseActivateKey>;
        clear: () => Promise<PosDesktopLicenseClear>;
      };
    };
  }
}
