"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrScannerDialog } from "@/components/pos/qr-scanner-dialog";

export function BarcodeScannerDialog({
  onDetected,
  label = "Scan Barcode",
}: {
  onDetected: (code: string) => Promise<void>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => setOpen(true)}>
        <ScanLine className="h-4 w-4" />
        {label}
      </Button>
      <QrScannerDialog
        open={open}
        onOpenChange={setOpen}
        onDetected={async (code) => {
          await onDetected(code);
        }}
      />
    </>
  );
}

