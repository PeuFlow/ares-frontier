import type { Territory } from "@/data/territories";
import type { PresentationPhase } from "@/lib/territory-presentation";

export function TerritoryLabel({
  territory,
  description,
  phase,
}: {
  territory: Territory;
  description: string;
  phase: PresentationPhase;
}) {
  return (
    <div
      data-territory-label={territory.id}
      data-phase={phase}
      className="territory-label pointer-events-none w-48 max-w-[calc(100vw-3rem)] rounded-lg border border-mineral/25 bg-background/95 px-3 py-2.5 text-left shadow-lg"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-mineral">
        {territory.lot}
      </p>
      <p className="mt-1 font-display text-sm font-semibold leading-tight text-foreground">
        {territory.region}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
