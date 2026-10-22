import { Eye, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Meter } from "./Meter";
import { useFrontier } from "@/hooks/use-frontier";
import { PROFILE_LABEL, formatArea, formatMC } from "@/data/territories";

export function TerritoryPanel() {
  const { selectedId, byId, openDetails, toggleCompare, compare } = useFrontier();
  const t = byId(selectedId)!;
  const inCompare = compare.includes(t.id);
  return (
    <aside className="instrument corner-ticks flex flex-col p-6" aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Terreno selecionado</span>
        <span className="font-mono text-[10px] text-muted-foreground">ID·{t.id.toUpperCase()}</span>
      </div>
      <h3 key={t.id} className="animate-rise mt-5 font-display text-3xl font-semibold leading-tight">{t.region}</h3>
      <p className="font-mono text-sm text-mineral">{t.lot}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.summary}</p>
      <dl className="mt-6 grid grid-cols-2 border-y border-border">
        <div className="border-r border-border py-4 pr-4">
          <dt className="eyebrow !text-[10px]">Área</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{formatArea(t.areaKm2)}</dd>
        </div>
        <div className="py-4 pl-4">
          <dt className="eyebrow !text-[10px]">Preço</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{formatMC(t.priceMC)}</dd>
        </div>
        <div className="col-span-2 border-t border-border py-4">
          <dt className="eyebrow !text-[10px]">Perfil sugerido de missão</dt>
          <dd className="mt-1 font-display">{PROFILE_LABEL[t.profile]}</dd>
        </div>
      </dl>
      <div className="mt-6 space-y-4">
        <Meter label="Relevo" value={t.relief} />
        <Meter label="Exposição solar" value={t.solar} />
      </div>
      <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">Indicadores ilustrativos — não são dados científicos.</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Button onClick={() => openDetails(t.id)}><Eye /> Ver detalhes</Button>
        <Button variant="outline" onClick={() => toggleCompare(t.id)} aria-pressed={inCompare}>
          <GitCompare /> {inCompare ? "Na comparação" : "Adicionar à comparação"}
        </Button>
      </div>
    </aside>
  );
}
