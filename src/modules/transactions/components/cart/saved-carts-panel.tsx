"use client";

import { useEffect, useState } from "react";
import { BookmarkPlus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Product } from "./cart-common";
import { rupiah } from "./cart-common";

type SavedCart = {
  id: string;
  name: string;
  cart: Record<string, number>;
  createdAt: string;
};

const STORAGE_KEY = "pos:savedCarts";

function loadSavedCarts(): SavedCart[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCart[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedCarts(carts: SavedCart[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
  } catch {}
}

export function SavedCartsPanel({
  cart,
  productMap,
  setCart,
  setNotice,
}: {
  cart: Record<string, number>;
  productMap: Map<string, Product>;
  setCart: (v: Record<string, number>) => void;
  setNotice: (v: string | null) => void;
}) {
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setSavedCarts(loadSavedCarts());
  }, []);

  const cartItemCount = Object.values(cart).filter((qty) => qty > 0).length;
  const hasItems = cartItemCount > 0;

  const handleSave = () => {
    if (!hasItems) return;
    const now = new Date();
    const defaultName = `Keranjang ${savedCarts.length + 1} • ${now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    const finalName = name.trim() || defaultName;
    const newCart: SavedCart = {
      id: crypto.randomUUID(),
      name: finalName,
      cart: { ...cart },
      createdAt: now.toISOString(),
    };
    const next = [newCart, ...savedCarts].slice(0, 10);
    setSavedCarts(next);
    persistSavedCarts(next);
    setName("");
    setNotice(`Keranjang disimpan: ${finalName}`);
  };

  const handleLoad = (sc: SavedCart) => {
    const hasCurrent = hasItems;
    if (hasCurrent) {
      const ok = window.confirm(`Muat "${sc.name}"? Keranjang saat ini akan diganti.`);
      if (!ok) return;
    }
    setCart({ ...sc.cart });
    setNotice(`Keranjang dimuat: ${sc.name}`);
  };

  const handleDelete = (id: string) => {
    const next = savedCarts.filter((c) => c.id !== id);
    setSavedCarts(next);
    persistSavedCarts(next);
  };

  const handleClearAll = () => {
    if (savedCarts.length === 0) return;
    if (!window.confirm(`Hapus semua ${savedCarts.length} keranjang tersimpan?`)) return;
    setSavedCarts([]);
    persistSavedCarts([]);
  };

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BookmarkPlus className="h-4 w-4 text-primary" />
          Simpan Keranjang
          {savedCarts.length > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{savedCarts.length}</span>
          ) : null}
        </div>
        {savedCarts.length > 0 ? (
          <button type="button" onClick={handleClearAll} className="text-xs text-muted-foreground hover:text-destructive">
            Hapus semua
          </button>
        ) : null}
      </div>

      <div className="p-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={hasItems ? `Nama keranjang (opsional)` : "Keranjang kosong"}
            className="h-9 flex-1 rounded-xl text-sm"
            disabled={!hasItems}
          />
          <Button type="button" onClick={handleSave} disabled={!hasItems} className="h-9 rounded-xl px-4 gap-1.5 shrink-0">
            <BookmarkPlus className="h-4 w-4" />
            Simpan
          </Button>
        </div>
        {!hasItems && savedCarts.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Tambah produk dulu untuk menyimpan keranjang.</p>
        ) : null}
      </div>

      {savedCarts.length > 0 ? (
        <div className="max-h-[180px] overflow-y-auto border-t">
          <div className="grid gap-2 p-2">
            {savedCarts.map((sc) => {
              const items = Object.entries(sc.cart).filter(([, qty]) => qty > 0);
              const totalQty = items.reduce((a, [, qty]) => a + qty, 0);
              const totalPrice = items.reduce((a, [pid, qty]) => {
                const p = productMap.get(pid);
                return a + (p ? Number(p.price) * qty : 0);
              }, 0);
              return (
                <div key={sc.id} className="flex items-center gap-2 rounded-xl border bg-muted/20 p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium leading-tight">{sc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {items.length} produk • {totalQty} item • {rupiah(totalPrice)}
                    </div>
                    <div className="text-[11px] text-muted-foreground/70">
                      {new Date(sc.createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={() => handleLoad(sc)}>
                      Muat
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(sc.id)} aria-label="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
