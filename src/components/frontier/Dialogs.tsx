import { useState } from "react";
import { BadgeCheck, GitCompare, Heart, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Meter } from "./Meter";
import { ValueFactors } from "./ValueFactors";
import { useFrontier } from "@/hooks/use-frontier";
import { MAX_COMPARE, PROFILE_LABEL, formatArea, formatMC, type Territory } from "@/data/territories";
import { cn } from "@/lib/utils";

const panel = "rounded-sm border-border bg-card";

export function DetailsDialog() {
  const { detailsId, openDetails, byId, favorites, toggleFavorite, toggleCompare, compare, openReserve } = useFrontier();
  const t = detailsId ? byId(detailsId) : undefined;
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && openDetails(null)}>
      <DialogContent className={cn(panel, "max-w-2xl gap-0 overflow-hidden p-0")}>
        {t && (
          <>
            <img key={t.id} src={t.image} alt={t.imageAlt} title={t.imageSource} className="h-44 w-full object-cover" />
            <div className="p-6">
              <DialogHeader className="text-left">
                <p className="eyebrow">{PROFILE_LABEL[t.profile]} · {t.lot}</p>
                <DialogTitle className="font-display text-3xl">{t.region}</DialogTitle>
                <DialogDescription>{t.summary}</DialogDescription>
              </DialogHeader>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-y border-border py-4 font-mono">
                <div><dt className="eyebrow !text-[10px]">Área</dt><dd className="text-lg">{formatArea(t.areaKm2)}</dd></div>
                <div><dt className="eyebrow !text-[10px]">Preço</dt><dd className="text-lg">{formatMC(t.priceMC)}</dd></div>
              </dl>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Meter label="Relevo" value={t.relief} />
                <Meter label="Exposição solar" value={t.solar} />
                <Meter label="Estabilidade" value={t.stability} />
              </div>
              <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">Métricas demonstrativas.</p>
              <ValueFactors t={t} className="mt-6" />
              <div className="mt-6 flex flex-wrap gap-2">
                <Button onClick={() => { openDetails(null); openReserve(t.id); }}>Simular reserva</Button>
                <Button variant="outline" onClick={() => toggleCompare(t.id)}><GitCompare /> {compare.includes(t.id) ? "Remover da comparação" : "Comparar"}</Button>
                <Button variant="ghost" onClick={() => toggleFavorite(t.id)}>
                  <Heart className={favorites.includes(t.id) ? "fill-primary text-primary" : ""} /> Favorito
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReserveDialog() {
  const { reserveId, openReserve, byId } = useFrontier();
  const [done, setDone] = useState(false);
  const t = reserveId ? byId(reserveId) : undefined;
  const code = t ? `AF-DEMO-${t.seed.toString().padStart(3, "0")}-${t.lot.replace(/\W/g, "").slice(-4).toUpperCase()}` : "";
  const close = () => { openReserve(null); setDone(false); };
  return (
    <Dialog open={!!t} onOpenChange={(o) => !o && close()}>
      <DialogContent className={cn(panel, "max-w-md")}>
        {t && !done && (
          <>
            <DialogHeader className="text-left">
              <p className="eyebrow">Simulação de reserva</p>
              <DialogTitle className="font-display text-2xl">{t.region} — {t.lot}</DialogTitle>
              <DialogDescription>Esta é uma demonstração. Nenhum pagamento será solicitado e nenhuma propriedade real será adquirida.</DialogDescription>
            </DialogHeader>
            <div className="border-y border-border py-4 font-mono text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Área</span><span>{formatArea(t.areaKm2)}</span></div>
              <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Valor simulado</span><span>{formatMC(t.priceMC)}</span></div>
            </div>
            <Button onClick={() => setDone(true)}>Confirmar simulação</Button>
          </>
        )}
        {t && done && (
          <div className="corner-ticks relative border border-border p-6 text-center">
            <BadgeCheck className="mx-auto h-8 w-8 text-mineral" />
            <p className="eyebrow mt-4 !text-mineral">Certificado demonstrativo</p>
            <DialogTitle className="mt-2 font-display text-2xl">Reserva simulada confirmada</DialogTitle>
            <DialogDescription className="mt-2">{t.region} · {t.lot}</DialogDescription>
            <p className="mt-4 font-mono text-xs">{code}</p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Documento fictício, sem valor legal. Não representa propriedade sobre áreas em Marte.</p>
            <Button variant="outline" className="mt-6" onClick={close}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function rows(a: Territory, b?: Territory) {
  const r: { k: string; f: (t: Territory) => string; v: (t: Territory) => number; better: "high" | "low" | null }[] = [
    { k: "Preço", f: (t) => formatMC(t.priceMC), v: (t) => t.priceMC, better: "low" },
    { k: "Área", f: (t) => formatArea(t.areaKm2), v: (t) => t.areaKm2, better: "high" },
    { k: "Categoria", f: (t) => PROFILE_LABEL[t.profile], v: () => 0, better: null },
    { k: "Relevo", f: (t) => `${t.relief}/100`, v: (t) => t.relief, better: null },
    { k: "Exposição solar", f: (t) => `${t.solar}/100`, v: (t) => t.solar, better: "high" },
    { k: "Estabilidade", f: (t) => `${t.stability}/100`, v: (t) => t.stability, better: "high" },
  ];
  return r.map((row) => {
    let win: 0 | 1 | null = null;
    if (b && row.better && row.v(a) !== row.v(b)) {
      const aBetter = row.better === "high" ? row.v(a) > row.v(b) : row.v(a) < row.v(b);
      win = aBetter ? 0 : 1;
    }
    return { ...row, win };
  });
}

export function CompareDialog() {
  const { compareOpen, setCompareOpen, compare, byId, toggleCompare } = useFrontier();
  const items = compare.map(byId).filter(Boolean) as Territory[];
  return (
    <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
      <DialogContent className={cn(panel, "max-w-3xl")}>
        <DialogHeader className="text-left">
          <p className="eyebrow">Análise comparativa</p>
          <DialogTitle className="font-display text-2xl">Comparação de terrenos</DialogTitle>
          <DialogDescription>Valores em destaque indicam a vantagem relativa em cada atributo demonstrativo.</DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum terreno selecionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 text-left font-normal text-muted-foreground">Atributo</th>
                  {items.map((t) => (
                    <th key={t.id} className="py-3 text-left font-normal">
                      <div className="flex items-start justify-between gap-2">
                        <span><span className="block font-display text-base">{t.region}</span><span className="text-mineral">{t.lot}</span></span>
                        <button onClick={() => toggleCompare(t.id)} aria-label={`Remover ${t.region}`} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                      </div>
                    </th>
                  ))}
                  {items.length < MAX_COMPARE && <th className="py-3 text-left font-normal text-muted-foreground">Selecione mais um lote</th>}
                </tr>
              </thead>
              <tbody>
                {rows(items[0]!, items[1]).map((row) => (
                  <tr key={row.k} className="border-b border-border/60">
                    <td className="py-3 text-muted-foreground">{row.k}</td>
                    {items.map((t, i) => (
                      <td key={t.id} className={cn("py-3 tabular-nums", row.win === i && "text-mineral")}>
                        {row.f(t)} {row.win === i && "▲"}
                      </td>
                    ))}
                    {items.length < MAX_COMPARE && <td className="py-3 text-muted-foreground">—</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CompareBar() {
  const { compare, byId, setCompareOpen, clearCompare, favorites } = useFrontier();
  if (!compare.length && !favorites.length) return null;
  return (
    <div className="instrument fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-4 px-4 py-2 shadow-2xl">
      <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground" aria-label={`${favorites.length} favoritos`}>
        <Heart className="h-3.5 w-3.5" /> {favorites.length}
      </span>
      <span className="h-4 w-px bg-border" />
      <span className="font-mono text-[11px]" aria-live="polite">
        Comparação <span className="text-mineral">{compare.length}/{MAX_COMPARE}</span>
        <span className="hidden text-muted-foreground sm:inline"> {compare.map((id) => byId(id)?.region).join(" · ")}</span>
      </span>
      {compare.length > 0 && (
        <>
          <Button size="sm" onClick={() => setCompareOpen(true)}>Comparar</Button>
          <Button size="sm" variant="ghost" onClick={clearCompare} aria-label="Limpar comparação"><X /></Button>
        </>
      )}
    </div>
  );
}
