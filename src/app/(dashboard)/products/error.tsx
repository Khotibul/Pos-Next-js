"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logErrorAction } from "@/lib/monitoring/log-error-action";

export default function ProductsError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    logErrorAction({ source: "products-error-boundary", message: error.message, stack: error.stack }).catch(() => {});
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terjadi kesalahan</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button asChild variant="outline">
          <Link href="/products">Kembali</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
