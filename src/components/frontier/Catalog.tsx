import { useMemo, useState } from "react";
import { Heart, Search, RotateCcw, Crosshair, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RegionThumb } from "./RegionThumb";
import { useFrontier } from "@/hooks/use-frontier";
import {
  PROFILE_LABEL, TERRITORIES, filterTerritories, formatArea, formatMC,
  type MissionProfile, type SortKey, type Territory,
} from "@/data/territories";
import { cn } from "@/lib/utils";

const PROFILES: (MissionProfile | "all")[] = ["all", "cientifico", "residencial", "industrial"];

function TerritoryCard({ t, index }: { t: Territory; index: number }) {
  const { selectedId, select, favorites, toggleFavorite, compare, toggleCompare, openDetails } = useFrontier();
  const fav = favorites.includes(t.id);
  const cmp = compare.includes(t.id);
  const sel = selectedId === t.id;
  return (
    <article className={cn("group flex flex-col border bg-card transition-colors duration-300", sel ? "border-mineral/70" : "border-border hover:border-muted-foreground/50")}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <RegionThumb seed={t.seed} alt={`Representação topográfica de ${t.region}`} className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105 group-hover:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        <span className="absolute left-3 top-3 font-mono text-[10px] text-foreground/80">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute right-3 top-3 border border-border bg-background/70 px-2 py-1 font-mono text-[10px] uppercase tracking-wider backdrop-blur">
          {PROFILE_LABEL[t.profile]}
        </span>
        <button
          onClick={() => toggleFavorite(t.id)}
          aria-pressed={fav}
          aria-label={fav ? `Remover ${t.region} dos favoritos` : `Favoritar ${t.region}`}
          className="absolute bottom-3 right-3 rounded-full border border-border bg-background/70 p-2 backdrop-blur transition hover:border-mineral"
        >
          <Heart className={cn("h-4 w-4", fav ? "fill-primary text-primary" : "text-foreground")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold">{t.region}</h3>
        <p className="font-mono text-xs text-mineral">{t.lot}</p>
        <dl className="mt-4 grid grid-cols-2 gap-y-3 font-mono text-xs">
          <div><dt className="text-muted-foreground">Área</dt><dd className="tabular-nums">{formatArea(t.areaKm2)}</dd></div>
          <div><dt className="text-muted-foreground">Preço</dt><dd className="tabular-nums">{formatMC(t.priceMC)}</dd></div>
          <div><dt className="text-muted-foreground">Relevo</dt><dd className="tabular-nums">{t.relief}/100</dd></div>
          <div><dt className="text-muted-foreground">Solar</dt><dd className="tabular-nums">{t.solar}/100</dd></div>
        </dl>
        <div className="mt-auto flex flex-wrap gap-2 pt-5">
          <Button size="sm" onClick={() => openDetails(t.id)}>Detalhes</Button>
          <Button size="sm" variant="outline" onClick={() => { select(t.id); document.getElementById("explorar")?.scrollIntoView(); }} aria-label={`Localizar ${t.region} no globo`}>
            <Crosshair />
          </Button>
          <label className={cn("ml-auto flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-wider", cmp ? "text-mineral" : "text-muted-foreground")}>
            <input type="checkbox" className="peer sr-only" checked={cmp} onChange={() => toggleCompare(t.id)} />
            <span className="flex h-4 w-4 items-center justify-center border border-border peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-ring">
              {cmp && <Check className="h-3 w-3" />}
            </span>
            Comparar
          </label>
        </div>
      </div>
    </article>
  );
}

export function Catalog() {
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<MissionProfile | "all">("all");
  const [sort, setSort] = useState<SortKey>("none");
  const list = useMemo(() => filterTerritories(TERRITORIES, query, profile, sort), [query, profile, sort]);
  const dirty = query || profile !== "all" || sort !== "none";
  const reset = () => { setQuery(""); setProfile("all"); setSort("none"); };

  return (
    <section id="terrenos" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="eyebrow">Módulo 02 · Catálogo</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Fronteiras disponíveis</h2>
          <p className="max-w-sm text-muted-foreground">Cada território representa uma nova possibilidade de exploração.</p>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-y border-border py-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por região ou lote (ex.: A-104)" className="h-10 rounded-sm bg-card pl-9 font-mono text-xs" aria-label="Pesquisar terrenos" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por perfil">
            {PROFILES.map((p) => (
              <button key={p} onClick={() => setProfile(p)} aria-pressed={profile === p}
                className={cn("h-10 border px-3 font-mono text-[10px] uppercase tracking-wider transition-colors",
                  profile === p ? "border-mineral text-mineral" : "border-border text-muted-foreground hover:text-foreground")}>
                {p === "all" ? "Todos" : PROFILE_LABEL[p]}
              </button>
            ))}
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-full rounded-sm bg-card font-mono text-xs lg:w-48" aria-label="Ordenar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ordem padrão</SelectItem>
              <SelectItem value="price-asc">Menor preço</SelectItem>
              <SelectItem value="price-desc">Maior preço</SelectItem>
              <SelectItem value="area-desc">Maior área</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={reset} disabled={!dirty}><RotateCcw /> Limpar</Button>
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground" aria-live="polite">
          {String(list.length).padStart(2, "0")} {list.length === 1 ? "resultado encontrado" : "resultados encontrados"}
        </p>

        {list.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => <TerritoryCard key={t.id} t={t} index={TERRITORIES.indexOf(t)} />)}
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center border border-dashed border-border py-20 text-center">
            <Crosshair className="h-6 w-6 text-muted-foreground" />
            <p className="mt-4 font-display text-lg">Nenhum território no radar</p>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste a busca ou os filtros para ampliar a varredura.</p>
            <Button variant="outline" className="mt-6" onClick={reset}>Limpar filtros</Button>
          </div>
        )}
      </div>
    </section>
  );
}
