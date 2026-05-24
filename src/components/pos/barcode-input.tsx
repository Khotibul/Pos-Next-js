"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BarcodeInput({
  placeholder = "Input barcode / SKU...",
  onSubmitCode,
  disabled,
}: {
  placeholder?: string;
  onSubmitCode: (code: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [code, setCode] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = code.trim();
        if (!v) return;
        void onSubmitCode(v);
        setCode("");
      }}
    >
      <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={placeholder} disabled={disabled} />
      <Button type="submit" className="rounded-xl" disabled={disabled || !code.trim()}>
        Tambah
      </Button>
    </form>
  );
}

