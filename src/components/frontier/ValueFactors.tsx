import { useEffect, useState } from "react";
import { ChevronDown, Gem, TriangleAlert } from "lucide-react";
import { formatImpact, type Territory } from "@/data/territories";
import { cn } from "@/lib/utils";

export function ValueFactors({ t, className }: { t: Territory; className?: string }) {
  const [open, setOpen] = useState(false);
  const net = [...t.resources, ...t.risks].reduce((s, r) => s + r.impact, 0);

  // A seção começa recolhida ao trocar de terreno.
  useEffect(() => {
    setOpen(false);
  }, [t.id]);

  return (
    <div className={cn("border border-border bg-card/40", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="eyebrow !text-[10px]">Fatores de valor</p>
        <span
          className={cn("font-mono text-[11px] tabular-nums", net >= 0 ? "text-mineral" : "text-destructive")}
          title="Soma do impacto ilustrativo de recursos e riscos"
        >
          {formatImpact(net)} líquido
        </span>
      </div>
      <div className="p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Características que influenciam o valor demonstrativo deste terreno.
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mineral transition-colors hover:text-foreground"
        >
          {open ? "Recolher" : "Saber mais"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", open && "rotate-180")} />
        </button>
        {open && (
          <div key={t.id} className="mt-4">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-mineral">
              <Gem className="h-3 w-3 shrink-0" /> Recursos que valorizam
            </p>
            <ul className="mt-2 space-y-1.5">
              {t.resources.map((r, i) => (
                <li
                  key={r.label}
                  className="flex animate-arrive items-center gap-2.5 border-l-2 border-mineral/60 bg-mineral/10 px-3 py-2"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <span className="flex-1 text-xs leading-snug">{r.label}</span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-mineral">{formatImpact(r.impact)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-destructive">
              <TriangleAlert className="h-3 w-3 shrink-0" /> Riscos que desvalorizam
            </p>
            <ul className="mt-2 space-y-1.5">
              {t.risks.map((r, i) => (
                <li
                  key={r.label}
                  className="flex animate-arrive items-center gap-2.5 border-l-2 border-destructive/60 bg-destructive/10 px-3 py-2"
                  style={{ animationDelay: `${(t.resources.length + i) * 90}ms` }}
                >
                  <span className="flex-1 text-xs leading-snug">{r.label}</span>
                  <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-destructive">{formatImpact(r.impact)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-[10px] text-muted-foreground/70">
              Impacto ilustrativo sobre o valor base do lote — não são dados científicos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
