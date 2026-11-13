import { CatalogItemDetails, catalogSearch } from "@/components/frontier/CatalogItemDetails";
import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { DemoNotice, PageHeader } from "@/components/frontier/PageHeader";
import { EXPERIENCES } from "@/data/catalog";
import { formatMC } from "@/data/territories";
import { useMission } from "@/hooks/use-mission";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/experiencias")({
  validateSearch: catalogSearch,
  head: () => pageHead("/experiencias", "Experiências em Marte — Ares Frontier", "Rover, observação astronômica, treino de astronauta e mais atividades fictícias."),
  component: Experiences,
});

function Experiences() {
  const { mission, toggleExperience } = useMission();
  return (
    <main>
      <CatalogItemDetails category="experience" />
      <PageHeader eyebrow="Módulo 05 · Experiências" title="Complemente a sua missão">
        Adicione quantas atividades quiser. Toque novamente para remover.
      </PageHeader>
      <div className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <ol className="divide-y divide-border border-y border-border">
          {EXPERIENCES.map((e, i) => {
            const on = mission.experienceIds.includes(e.id);
            return (
              <li key={e.id}>
                <button data-ai-section="experiencias" data-ai-element={e.id} onClick={() => toggleExperience(e.id)} aria-pressed={on}
                  className={cn("group grid w-full grid-cols-[auto_1fr_auto] items-center gap-5 py-6 text-left transition-colors md:grid-cols-[auto_1fr_auto_auto]", on && "bg-mineral/5")}>
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block font-display text-xl font-semibold group-hover:text-mineral">{e.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{e.description}</span>
                    <span className="mt-1 block font-mono text-[11px] md:hidden">{e.hours} h · {formatMC(e.priceMC)}</span>
                  </span>
                  <span className="hidden text-right font-mono text-xs md:block">{e.hours} h<br /><span className="text-foreground">{formatMC(e.priceMC)}</span></span>
                  <span className={cn("flex h-9 w-9 items-center justify-center border", on ? "border-mineral bg-mineral text-primary-foreground" : "border-border")}>
                    {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-10"><DemoNotice /></div>
      </div>
    </main>
  );
}
