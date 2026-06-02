"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <section style={{ maxWidth: 520, textAlign: "center" }}>
        <p style={{ margin: 0, color: "#0b57d0", fontWeight: 700, letterSpacing: "0.08em" }}>POS Pro</p>
        <h1 style={{ margin: "12px 0", fontSize: 32 }}>Terjadi kesalahan server</h1>
        <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
          Silakan muat ulang halaman atau kembali ke dashboard. Sistem tetap mencatat aktivitas penting secara aman.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 20,
            padding: "10px 24px",
            background: "#0b57d0",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Coba lagi
        </button>
      </section>
    </main>
  );
}
