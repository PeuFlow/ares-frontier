import { ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobeStage } from "@/components/three/GlobeStage";
import { useFrontier } from "@/hooks/use-frontier";
import { PROFILE_LABEL, formatArea } from "@/data/territories";

const STATS = [
  ["06", "territórios demonstrativos"],
  ["03", "perfis de missão"],
  ["01", "novo horizonte"],
];

export function Hero() {
  const { selectedId, byId } = useFrontier();
  const t = byId(selectedId)!;
  return (
    <section id="top" className="tech-grid relative overflow-hidden pt-16">
      <div className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-7xl items-center gap-6 px-5 md:px-8 lg:grid-cols-[1fr_1.15fr]">
        <div className="relative z-10 py-12 lg:py-0">
          <p className="eyebrow animate-rise flex items-center gap-3">
            <span className="glow-dot h-1.5 w-1.5 rounded-full bg-primary" />
            Human Expansion Program / 2089
          </p>
          <h1 className="animate-rise mt-6 font-display text-5xl font-semibold leading-[0.95] tracking-tight [animation-delay:120ms] sm:text-6xl xl:text-7xl">
            Um novo mundo.
            <br />
            <span className="text-mineral">Um novo endereço.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-md text-base leading-relaxed text-muted-foreground [animation-delay:240ms]">
            Explore territórios marcianos, descubra novas fronteiras e encontre o lugar ideal para sua próxima missão.
          </p>
          <div className="animate-rise mt-9 flex flex-wrap gap-3 [animation-delay:360ms]">
            <Button asChild size="lg">
              <a href="#explorar">Explorar Marte <ArrowDownRight /></a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#terrenos">Ver terrenos</a>
            </Button>
          </div>
          <dl className="animate-rise mt-14 grid max-w-md grid-cols-3 border-t border-border [animation-delay:480ms]">
            {STATS.map(([n, l]) => (
              <div key={l} className="border-r border-border pr-3 pt-4 last:border-r-0 [&:not(:first-child)]:pl-4">
                <dt className="sr-only">{l}</dt>
                <dd className="font-mono text-2xl tabular-nums text-foreground">{n}</dd>
                <dd className="mt-1 text-xs leading-snug text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">Dados ilustrativos do protótipo.</p>
        </div>

        <div className="relative -mx-5 h-[460px] sm:h-[560px] lg:mx-0 lg:h-[720px]">
          <GlobeStage selectedId={selectedId} />
          <div className="pointer-events-none absolute left-4 top-8 font-mono text-[10px] leading-5 text-muted-foreground sm:left-8">
            <div>ORB · 3.72 m/s² REF</div>
            <div>SOL 0412 / UTC+M</div>
          </div>
          <div className="instrument corner-ticks absolute bottom-8 right-4 w-60 p-4 sm:right-8">
            <p className="eyebrow !text-[9px]">Localização em foco</p>
            <p className="mt-2 font-display text-lg leading-tight">{t.region}</p>
            <p className="font-mono text-xs text-mineral">{t.lot}</p>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-mono text-[11px] text-muted-foreground">
              <span>{formatArea(t.areaKm2)}</span>
              <span>{PROFILE_LABEL[t.profile]}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
