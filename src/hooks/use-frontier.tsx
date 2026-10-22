import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { TERRITORIES, addToCompare, MAX_COMPARE, type Territory } from "@/data/territories";

interface FrontierState {
  selectedId: string;
  select: (id: string) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  compare: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
  detailsId: string | null;
  openDetails: (id: string | null) => void;
  reserveId: string | null;
  openReserve: (id: string | null) => void;
  compareOpen: boolean;
  setCompareOpen: (v: boolean) => void;
  byId: (id: string) => Territory | undefined;
}

const Ctx = createContext<FrontierState | null>(null);
const LS_KEY = "ares-frontier:v1";

export function FrontierProvider({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState(TERRITORIES[0]!.id);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [reserveId, setReserveId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { favorites?: string[]; compare?: string[] };
        const valid = (a?: string[]) => (a ?? []).filter((id) => TERRITORIES.some((t) => t.id === id));
        setFavorites(valid(d.favorites));
        setCompare(valid(d.compare).slice(0, MAX_COMPARE));
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(LS_KEY, JSON.stringify({ favorites, compare }));
  }, [favorites, compare, loaded]);

  const byId = useCallback((id: string) => TERRITORIES.find((t) => t.id === id), []);

  const toggleFavorite = useCallback(
    (id: string) => {
      const t = byId(id);
      setFavorites((f) => {
        const has = f.includes(id);
        toast(has ? "Removido dos favoritos" : "Adicionado aos favoritos", { description: t?.region });
        return has ? f.filter((x) => x !== id) : [...f, id];
      });
    },
    [byId],
  );

  const toggleCompare = useCallback(
    (id: string) => {
      const t = byId(id);
      if (compare.includes(id)) {
        setCompare(compare.filter((x) => x !== id));
        toast("Removido da comparação", { description: t?.region });
        return;
      }
      const next = addToCompare(compare, id);
      if (!next) {
        toast("Limite de comparação atingido", { description: "Compare no máximo dois terrenos por vez." });
        return;
      }
      setCompare(next);
      toast("Adicionado à comparação", { description: `${t?.region} · ${next.length}/${MAX_COMPARE}` });
    },
    [compare, byId],
  );

  const value = useMemo<FrontierState>(
    () => ({
      selectedId,
      select: setSelectedId,
      favorites,
      toggleFavorite,
      compare,
      toggleCompare,
      clearCompare: () => setCompare([]),
      detailsId,
      openDetails: setDetailsId,
      reserveId,
      openReserve: setReserveId,
      compareOpen,
      setCompareOpen,
      byId,
    }),
    [selectedId, favorites, toggleFavorite, compare, toggleCompare, detailsId, reserveId, compareOpen, byId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFrontier() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFrontier must be used inside FrontierProvider");
  return c;
}
