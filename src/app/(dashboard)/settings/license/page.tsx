import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { LicensePageClient } from "@/components/settings/license-page-client";

export default async function DesktopLicensePage() {
  return (
    <div className="grid gap-4">
      <PageHeader
        title="License (Desktop)"
        description="Aktivasi lisensi dan info perangkat untuk POS Desktop Enterprise."
        actions={
          <Button asChild variant="outline" className="gap-2 rounded-xl">
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />
      <LicensePageClient />
    </div>
  );
}
