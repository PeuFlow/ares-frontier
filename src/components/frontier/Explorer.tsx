import { useState } from "react";
import { Move3d } from "lucide-react";
import { GlobeStage } from "@/components/three/GlobeStage";
import { TerritoryPanel } from "./TerritoryPanel";
import { useFrontier } from "@/hooks/use-frontier";
import { TERRITORIES, formatArea, formatMC } from "@/data/territories";
import { cn } from "@/lib/utils";

export function Explorer() {
  const { selectedId, select, byId } = useFrontier();
  const [reselect, setReselect] = useState(0);
  const t = byId(selectedId)!;
  return (
    <section id="explorar" className="scroll-mt-16 border-t border-border py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Módulo 01</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Exploração planetária</h2>
          </div>
          <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
            <Move3d className="h-4 w-4" /> Arraste para girar · role para aproximar · clique nos marcadores · clique de novo para voltar
          </p>
        </div>
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="instrument relative h-[440px] overflow-hidden sm:h-[560px]">
            <div className="tech-grid pointer-events-none absolute inset-0 opacity-60" />
            <GlobeStage selectedId={selectedId} onSelect={select} interactive reselectSignal={reselect} />
            <div
              key={t.id}
              className="animate-rise pointer-events-none absolute left-3 top-3 z-10 max-w-[230px] border border-border bg-background/80 p-3 backdrop-blur"
              aria-live="polite"
            >
              <p className="eyebrow !text-[10px]">{t.lot}</p>
              <p className="font-display text-lg font-semibold leading-tight">{t.region}</p>
              <p className="mt-1 font-mono text-xs text-mineral">{formatMC(t.priceMC)}</p>
              <p className="font-mono text-[10px] text-muted-foreground">{formatArea(t.areaKm2)}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex gap-1 overflow-x-auto border-t border-border bg-background/70 p-2 backdrop-blur" role="tablist" aria-label="Marcadores">
              {TERRITORIES.map((t, i) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={t.id === selectedId}
                  onClick={() => (t.id === selectedId ? setReselect((n) => n + 1) : select(t.id))}
                  className={cn(
                    "shrink-0 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors",
                    t.id === selectedId ? "bg-primary/15 text-mineral" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {String(i + 1).padStart(2, "0")} · {t.region}
                </button>
              ))}
            </div>
          </div>
          <TerritoryPanel />
        </div>
      </div>
    </section>
  );
}
