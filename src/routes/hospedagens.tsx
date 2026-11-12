import { pageHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Minus, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DemoNotice, PageHeader } from "@/components/frontier/PageHeader";
import { STAYS, stayTotal, type Stay } from "@/data/catalog";
import { formatMC } from "@/data/territories";
import { useMission } from "@/hooks/use-mission";
import dome from "@/assets/stay-dome.jpg";

export const Route = createFileRoute("/hospedagens")({
  head: () => pageHead("/hospedagens", "Hospedagens marcianas — Ares Frontier", "Habitats fictícios em Marte: Aurora Dome, Olympus Station e Elysium Habitat."),
  component: Stays,
});

function StayRow({ s, onDetails }: { s: Stay; onDetails: () => void }) {
  const { mission, setStay } = useMission();
  const on = mission.stayId === s.id;
  const [nights, setNights] = useState(on ? mission.nights : 3);
  const clamp = (n: number) => Math.min(60, Math.max(1, n));
  return (
    <article data-ai-section="hospedagens" data-ai-element={s.id} className="grid gap-6 border-b border-border py-10 lg:grid-cols-[1.2fr_1fr_280px]">
      <img src={s.image} alt={s.name} loading="lazy" width={1280} height={800} className="aspect-[16/9] w-full object-cover" />
      <div>
        <p className="eyebrow !text-mineral">{s.kind}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold">{s.name}</h2>
        <p className="mt-3 text-muted-foreground">{s.description}</p>
        <p className="mt-3 flex items-center gap-2 font-mono text-xs"><Users className="h-3.5 w-3.5" /> Até {s.capacity} hóspedes</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">{s.amenities.map((a) => <li key={a} className="border border-border px-2 py-1 font-mono text-[10px]">{a}</li>)}</ul>
        <Button variant="ghost" size="sm" data-ai-section="hospedagens" data-ai-element={s.id} className="mt-4 px-0" onClick={onDetails}>Ver detalhes →</Button>
      </div>
      <div className="instrument corner-ticks self-start p-5">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">Por noite</p>
        <p className="font-display text-2xl tabular-nums">{formatMC(s.nightMC)}</p>
        <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">Noites</p>
        <div className="mt-1 flex items-center gap-2">
          <Button size="icon" variant="outline" aria-label="Menos noites" onClick={() => setNights((n) => clamp(n - 1))}><Minus /></Button>
          <span className="w-10 text-center font-mono tabular-nums" aria-live="polite">{nights}</span>
          <Button size="icon" variant="outline" aria-label="Mais noites" onClick={() => setNights((n) => clamp(n + 1))}><Plus /></Button>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase text-muted-foreground">Total simulado</p>
        <p className="font-display text-xl tabular-nums text-mineral">{formatMC(stayTotal(s.nightMC, nights))}</p>
        <Button className="mt-4 w-full" variant={on ? "secondary" : "default"} onClick={() => setStay(s.id, nights)}>
          {on ? <><Check /> Atualizar na missão</> : "Adicionar à missão"}
        </Button>
        {on && <button className="mt-2 w-full font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground" onClick={() => setStay(null)}>Remover</button>}
      </div>
    </article>
  );
}

function Stays() {
  const [open, setOpen] = useState<Stay | null>(null);
  return (
    <main>
      <PageHeader eyebrow="Módulo 04 · Hospedagens" title="Habitats sob o céu cor de ferrugem" image={dome}>
        Escolha a duração simulada e veja o total calculado na hora.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-5 pb-12 md:px-8">
        {STAYS.map((s) => <StayRow key={s.id} s={s} onDetails={() => setOpen(s)} />)}
        <div className="mt-10"><DemoNotice /></div>
      </div>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent data-ai-section="hospedagens" data-ai-element={open?.id} className="rounded-sm">
          {open && (
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">{open.name}</DialogTitle>
              <DialogDescription>{open.description}</DialogDescription>
              <ul className="list-inside list-disc pt-2 text-sm text-muted-foreground">{open.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
              <p className="pt-2 font-mono text-xs">{open.kind} · até {open.capacity} hóspedes · {formatMC(open.nightMC)}/noite</p>
            </DialogHeader>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
