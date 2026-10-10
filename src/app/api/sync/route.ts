import { getMobileContext } from "@/lib/auth/mobile-token";
import { withApiHandler } from "@/lib/api-response";

export const runtime = "nodejs";

// GET /api/sync — penarikan data inkremental.
// Android modern melakukan sinkronisasi lewat endpoint per-entitas
// (/mobile/products, /sales, dst). Route ini hanya fallback kompatibilitas.
export const GET = withApiHandler(async (req: Request) => {
  await getMobileContext(req);
  const url = new URL(req.url);
  const table = url.searchParams.get("table")?.trim();

  if (!table) {
    return Response.json(
      { ok: false, code: "VALIDATION_ERROR", message: "Parameter table wajib diisi." },
      { status: 400 },
    );
  }

  // Daftar tabel yang dikenal — tolak yang lain agar tidak error Prisma
  const known = new Set([
    "products",
    "categories",
    "brands",
    "units",
    "suppliers",
    "customers",
    "sales",
    "purchases",
    "cashierShifts",
    "receivables",
    "payables",
  ]);
  if (!known.has(table)) {
    return Response.json(
      { ok: false, code: "NOT_FOUND", message: `Tabel ${table} tidak didukung.` },
      { status: 404 },
    );
  }

  return Response.json(
    { ok: true, data: [] },
    { headers: { "cache-control": "no-store" } },
  );
});

// POST /api/sync — batch antrian lama (legacy). Antrian lokal kosong pada build
// saat ini karena setiap entitas sudah push langsung ke endpointnya masing-masing.
// Semua item ditandai gagal dengan pesan jelas agar tidak retry tanpa henti.
export const POST = withApiHandler(async (req: Request) => {
  await getMobileContext(req);
  const body = (await req.json().catch(() => null)) as { items?: unknown[] } | null;
  const items = Array.isArray(body?.items) ? body!.items! : [];

  const failed = items
    .map((item) => {
      const rec = item as { id?: number };
      return typeof rec?.id === "number"
        ? { id: rec.id, error: "Batch sync sudah tidak digunakan. Data dikirim langsung ke endpoint entitas." }
        : null;
    })
    .filter(Boolean);

  return Response.json(
    { ok: true, synced_ids: [], failed },
    { headers: { "cache-control": "no-store" } },
  );
});
