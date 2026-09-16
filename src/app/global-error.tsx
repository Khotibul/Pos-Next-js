"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", textAlign: "center" }}>
        <h2 style={{ marginBottom: "1rem" }}>Terjadi kesalahan sistem</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Aplikasi mengalami gangguan yang tidak terduga. Silakan muat ulang halaman.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1.5rem",
            borderRadius: "0.375rem",
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Muat Ulang
        </button>
      </body>
    </html>
  );
}
