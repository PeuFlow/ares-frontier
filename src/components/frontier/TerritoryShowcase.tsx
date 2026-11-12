import { useCallback, useState } from "react";
import { GlobeStage } from "@/components/three/GlobeStage";
import { useTerritoryPresentation } from "@/hooks/use-territory-presentation";
import { PRESENTED_TERRITORIES } from "@/lib/territory-presentation";
import { TerritoryLabel } from "./TerritoryLabel";

export function TerritoryShowcase() {
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFallback = useCallback(() => setFallback(true), []);
  const { ref, index, phase, reduced, paused, onSurfaceChange } = useTerritoryPresentation(
    ready,
    PRESENTED_TERRITORIES.length,
    fallback,
  );
  const item = PRESENTED_TERRITORIES[index]!;
  return (
    <figure
      ref={ref}
      data-territory-presentation
      data-presentation-index={index}
      data-presentation-phase={phase}
      className="relative isolate -mx-5 h-[460px] overflow-hidden sm:h-[560px] lg:mx-0 lg:h-[720px]"
    >
      <div className="absolute inset-0">
        <GlobeStage
          selectedId={item.territory.id}
          presentation={{ phase, description: item.description, paused, onChange: onSurfaceChange }}
          onReady={onReady}
          onFallback={onFallback}
          fallbackContent={<TerritoryLabel {...item} phase={phase} />}
        />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-8 font-mono text-[10px] leading-5 text-muted-foreground sm:left-8"
      >
        <div>ORB · 3.72 m/s² REF</div>
        <div>SOL 0412 / UTC+M</div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-5 right-5 flex items-center justify-between gap-3 border-t border-border/60 pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground sm:left-8 sm:right-8"
      >
        <span>{reduced ? "Territórios do catálogo" : "Arraste para girar"}</span>
        <span className="shrink-0 text-mineral">
          {String(PRESENTED_TERRITORIES.length).padStart(2, "0")} regiões
        </span>
      </div>
      <figcaption className="sr-only">
        Apresentação informativa dos territórios do catálogo no globo de Marte. Os marcadores não
        são interativos. Localizações aproximadas do protótipo.
        <ul>
          {PRESENTED_TERRITORIES.map(({ territory, description }) => (
            <li key={territory.id}>
              {territory.region} — {description} {territory.lot}.
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
