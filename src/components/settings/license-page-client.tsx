"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type DeviceInfo = {
  deviceId: string;
  userData: string;
  dataDir: string;
  backupDir: string;
  logsDir: string;
  platform: string;
  arch: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function LicensePageClient() {
  const isDesktop = typeof window !== "undefined" && Boolean(window.posDesktop?.device?.getInfo);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [license, setLicense] = useState<PosDesktopLicenseRow | null>(null);
  const [valid, setValid] = useState<PosDesktopLicenseValidity | null>(null);

  const [pending, start] = useTransition();

  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [serial, setSerial] = useState("");

  async function refresh() {
    setNotice(null);
    if (!isDesktop || !window.posDesktop) return;
    try {
      const ensured = await window.posDesktop.database.ensure();
      if (ensured.ok !== true) {
        setNotice({
          tone: "error",
          message: isRecord(ensured) && typeof ensured.message === "string" ? ensured.message : "Database desktop belum siap.",
        });
      }
      const info = await window.posDesktop.device.getInfo();
      setDevice(info);
      const res = await window.posDesktop.license.getCurrent();
      if (res.ok === true) {
        setLicense(res.data.license ?? null);
        setValid(res.data.valid ?? null);
      } else {
        setNotice({ tone: "error", message: isRecord(res) && typeof res.message === "string" ? res.message : "Gagal memuat data lisensi." });
      }
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Gagal memuat data lisensi desktop." });
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = useMemo(() => {
    if (!isDesktop) return <Badge variant="secondary">Web</Badge>;
    if (!valid) return <Badge variant="secondary">Unknown</Badge>;
    return valid.ok ? <Badge>ACTIVE</Badge> : <Badge variant="destructive">INVALID</Badge>;
  }, [isDesktop, valid]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {notice ? (
        <Alert
          variant={notice.tone === "error" ? "destructive" : "default"}
          className={notice.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : undefined}
        >
          {notice.message}
        </Alert>
      ) : null}

      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Device Info</span>
            {statusBadge}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {!isDesktop ? (
            <div className="rounded-2xl border bg-muted/10 p-4 text-muted-foreground">
              Halaman ini berfungsi penuh hanya di aplikasi desktop (Electron). Di web, fitur database lokal (SQLite) & aktivasi offline tidak tersedia.
            </div>
          ) : (
            <div className="grid gap-2 rounded-2xl border bg-muted/10 p-4">
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Device ID</div>
                <div className="break-all font-mono text-xs">{device?.deviceId ?? "-"}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Platform</div>
                  <div className="font-medium">{device?.platform ?? "-"}</div>
                </div>
                <div className="grid gap-1">
                  <div className="text-xs text-muted-foreground">Arch</div>
                  <div className="font-medium">{device?.arch ?? "-"}</div>
                </div>
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">User Data</div>
                <div className="break-all font-mono text-xs">{device?.userData ?? "-"}</div>
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-muted-foreground">Database Dir</div>
                <div className="break-all font-mono text-xs">{device?.dataDir ?? "-"}</div>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => start(refresh)}
              disabled={pending || !isDesktop}
            >
              {pending ? "Memuat..." : "Refresh"}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => {
                setNotice(null);
                start(async () => {
                  if (!window.posDesktop) return;
                  const res = await window.posDesktop.database.ensure();
                  if (res.ok !== true) {
                    setNotice({
                      tone: "error",
                      message: isRecord(res) && typeof res.message === "string" ? res.message : "Database desktop belum siap.",
                    });
                    return;
                  }
                  await refresh();
                  setNotice({ tone: "success", message: res.data.message ?? "Database SQLite desktop siap." });
                });
              }}
              disabled={pending || !isDesktop}
            >
              Siapkan Database
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aktivasi Lisensi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground">
            Trial akan tersimpan di database lokal (SQLite) dan terenkripsi serta terikat device. Jika lisensi invalid, aplikasi desktop dapat memblokir akses modul transaksi.
          </div>

          <div className="grid gap-2">
            <Label>Serial License Key (dari Web)</Label>
            <Input value={serial} onChange={(e) => setSerial(e.currentTarget.value)} placeholder="PPOS-XXXX-XXXX-XXXX-XXXX" autoComplete="off" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl"
                disabled={pending || !isDesktop}
                onClick={() => {
                  setNotice(null);
                  start(async () => {
                    const dbReady = await window.posDesktop!.database.ensure();
                    if (dbReady.ok !== true) {
                      setNotice({
                        tone: "error",
                        message: isRecord(dbReady) && typeof dbReady.message === "string" ? dbReady.message : "Database desktop belum siap.",
                      });
                      return;
                    }
                    const res = await window.posDesktop!.license.activateKey({ serial: serial.trim() });
                    if (!isRecord(res) || res.ok !== true) {
                      setNotice({ tone: "error", message: isRecord(res) && typeof res.message === "string" ? res.message : "Aktivasi serial gagal." });
                      return;
                    }
                    await refresh();
                    setSerial("");
                    setNotice({ tone: "success", message: "Serial berhasil diaktifkan di perangkat ini." });
                  });
                }}
              >
                Aktifkan Serial
              </Button>
              <Button type="button" variant="secondary" className="rounded-xl" disabled={pending || !isDesktop} onClick={() => setSerial("")}>
                Clear
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Serial ini di-generate dari dashboard web (Super Admin) dan bisa dipakai untuk aktivasi tenant + aktivasi Desktop (device-bound).
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Nama Toko/Perusahaan</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.currentTarget.value)} placeholder="Contoh: Toko Maju Jaya" />
          </div>
          <div className="grid gap-2">
            <Label>Nama Owner</Label>
            <Input value={ownerName} onChange={(e) => setOwnerName(e.currentTarget.value)} placeholder="Contoh: Budi" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.currentTarget.value)} placeholder="owner@toko.com" />
            </div>
            <div className="grid gap-2">
              <Label>No. HP</Label>
              <Input value={phone} onChange={(e) => setPhone(e.currentTarget.value)} placeholder="08xxxxxxxxxx" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                type="button"
                className="rounded-xl"
                disabled={pending || !isDesktop}
                onClick={() => {
                  setNotice(null);
                  start(async () => {
                    const dbReady = await window.posDesktop!.database.ensure();
                    if (dbReady.ok !== true) {
                      setNotice({
                        tone: "error",
                        message: isRecord(dbReady) && typeof dbReady.message === "string" ? dbReady.message : "Database desktop belum siap.",
                      });
                      return;
                    }
                    const res = await window.posDesktop!.license.activateTrial({
                      companyName,
                      ownerName,
                      email,
                      phone,
                      days,
                    });
                    if (!isRecord(res) || res.ok !== true) {
                      setNotice({ tone: "error", message: isRecord(res) && typeof res.message === "string" ? res.message : "Aktivasi trial gagal." });
                      return;
                    }
                    await refresh();
                  });
                }}
              >
                Trial {days} hari
              </Button>
            ))}
          </div>

          <div className="rounded-2xl border bg-background p-4 text-sm">
            <div className="font-semibold">Status</div>
            <div className="mt-2 grid gap-1 text-muted-foreground">
              <div>License record: {license ? "Ada" : "Belum ada"}</div>
              <div>Valid: {valid ? (valid.ok ? "OK" : `NO (${valid.reason ?? "invalid"})`) : "-"}</div>
              {license?.planType ? <div>Plan: {license.planType}</div> : null}
              {license?.expiredDate ? <div>Expired: {new Date(license.expiredDate).toLocaleDateString("id-ID")}</div> : null}
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">Reset lisensi lokal (untuk re-aktivasi di device ini).</div>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={pending || !isDesktop}
              onClick={() => {
                setNotice(null);
                start(async () => {
                  const res = await window.posDesktop!.license.clear();
                  if (!isRecord(res) || res.ok !== true) {
                    setNotice({ tone: "error", message: isRecord(res) && typeof res.message === "string" ? res.message : "Gagal reset lisensi." });
                    return;
                  }
                  await refresh();
                });
              }}
            >
              Reset Lisensi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
