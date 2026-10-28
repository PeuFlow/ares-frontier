import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoNotice, PageHeader } from "@/components/frontier/PageHeader";
import { formatMC } from "@/data/territories";
import { useMission, type DemoReservation } from "@/hooks/use-mission";

export const Route = createFileRoute("/missao")({
  head: () => ({
    meta: [
      { title: "Minha missão — Ares Frontier" },
      { name: "description", content: "Monte seu pacote fictício para Marte: viagem, hospedagem, experiências e território." },
      { property: "og:title", content: "Minha missão — Ares Frontier" },
      { property: "og:description", content: "Planejador de missão demonstrativo com total calculado automaticamente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Mission,
});

function Mission() {
  const m = useMission();
  const [done, setDone] = useState<DemoReservation | null>(null);
  const remove = (kind: string, id: string) => {
    if (kind === "Viagem") m.setTrip(null);
    else if (kind === "Hospedagem") m.setStay(null);
    else if (kind === "Experiência") m.toggleExperience(id);
    else m.setTerritory(null);
  };
  const missing = [
    !m.mission.tripId && { to: "/viagens", label: "Escolher viagem" },
    !m.mission.stayId && { to: "/hospedagens", label: "Escolher hospedagem" },
    { to: "/experiencias", label: "Adicionar experiências" },
    !m.mission.territoryId && { to: "/territorios", label: "Reservar território (opcional)" },
  ].filter(Boolean) as { to: "/viagens" | "/hospedagens" | "/experiencias" | "/territorios"; label: string }[];

  return (
    <main>
      <PageHeader eyebrow="Módulo 06 · Planejador" title="MINHA MISSÃO">Combine uma viagem, uma hospedagem, experiências e, se quiser, um território.</PageHeader>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:px-8 lg:grid-cols-[1fr_360px]">
        <section aria-label="Itens da missão">
          {m.lines.length ? (
            <ul className="border-t border-border">
              {m.lines.map((l) => (
                <li key={l.kind + l.id} className="flex animate-arrive items-center gap-4 border-b border-border py-5">
                  <span className="w-24 shrink-0 font-mono text-[10px] uppercase tracking-wider text-mineral">{l.kind}</span>
                  <span className="flex-1"><span className="block font-display text-lg">{l.label}</span><span className="font-mono text-[11px] text-muted-foreground">{l.detail}</span></span>
                  <span className="font-mono text-sm tabular-nums">{formatMC(l.priceMC)}</span>
                  <Button size="icon" variant="ghost" aria-label={`Remover ${l.label}`} onClick={() => remove(l.kind, l.id)}><X /></Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-dashed border-border py-16 text-center">
              <p className="font-display text-lg">Sua missão ainda está vazia</p>
              <p className="mt-1 text-sm text-muted-foreground">Comece escolhendo uma viagem.</p>
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            {missing.map((x) => <Button key={x.to} asChild variant="outline" size="sm"><Link to={x.to}>+ {x.label}</Link></Button>)}
          </div>
        </section>
        <aside className="instrument corner-ticks self-start p-6">
          <p className="eyebrow">Resumo da missão</p>
          <dl className="mt-4 space-y-2 font-mono text-xs">
            {["Viagem", "Hospedagem", "Experiência", "Território"].map((k) => {
              const items = m.lines.filter((l) => l.kind === k);
              return <div key={k} className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="tabular-nums">{items.length ? formatMC(items.reduce((s, l) => s + l.priceMC, 0)) : "—"}</dd></div>;
            })}
          </dl>
          <div className="mt-5 border-t border-border pt-4">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">Total simulado</p>
            <p className="font-display text-3xl tabular-nums text-mineral" aria-live="polite">{formatMC(m.total)}</p>
          </div>
          <Button className="mt-5 w-full" disabled={!m.lines.length} onClick={() => setDone(m.confirm())}>Confirmar reserva demonstrativa</Button>
          <div className="mt-4"><DemoNotice>Nenhuma compra ou contratação é feita.</DemoNotice></div>
        </aside>
      </div>

      <Dialog open={!!done} onOpenChange={(v) => !v && setDone(null)}>
        <DialogContent className="rounded-sm">
          {done && (
            <>
              <DialogHeader>
                <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-mineral"><CheckCircle2 className="h-4 w-4" /> Simulação concluída</p>
                <DialogTitle className="font-display text-2xl">Protocolo {done.protocol}</DialogTitle>
                <DialogDescription>Registro fictício — não é uma contratação, compra ou reserva de serviço real.</DialogDescription>
              </DialogHeader>
              <ul className="space-y-1 font-mono text-xs">
                {done.lines.map((l) => <li key={l.kind + l.id} className="flex justify-between"><span>{l.kind}: {l.label}</span><span>{formatMC(l.priceMC)}</span></li>)}
              </ul>
              <p className="flex justify-between border-t border-border pt-3 font-display text-lg"><span>Total</span><span>{formatMC(done.total)}</span></p>
              <Button asChild variant="outline"><Link to="/conta">Ver na Central de Missões</Link></Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
