import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Check, Plus, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Chip, DemoNotice, PageHeader } from "@/components/frontier/PageHeader";
import { TRIPS, TRIP_CATEGORY_LABEL, filterTrips, type DurationFilter, type PriceFilter, type Trip, type TripCategory } from "@/data/catalog";
import { formatMC } from "@/data/territories";
import { useMission } from "@/hooks/use-mission";
import canyon from "@/assets/trip-canyon.jpg";

export const Route = createFileRoute("/viagens")({
  head: () => ({
    meta: [
      { title: "Viagens a Marte — Ares Frontier" },
      { name: "description", content: "Expedições fictícias para Marte: órbita, cânions, habitats e missões científicas." },
      { property: "og:title", content: "Expedições para o desconhecido — Ares Frontier" },
      { property: "og:description", content: "Pacotes demonstrativos de viagem a Marte com filtros por categoria, duração e preço." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Trips,
});

function Level({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Aventura ${n} de 5`}>
      {Array.from({ length: 5 }, (_, i) => <span key={i} className={`h-2 w-3 ${i < n ? "bg-primary" : "bg-border"}`} />)}
    </span>
  );
}

function Trips() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<TripCategory | "all">("all");
  const [dur, setDur] = useState<DurationFilter>("all");
  const [price, setPrice] = useState<PriceFilter>("all");
  const [open, setOpen] = useState<Trip | null>(null);
  const { mission, setTrip } = useMission();
  const list = useMemo(() => filterTrips(TRIPS, q, cat, dur, price), [q, cat, dur, price]);

  const AddBtn = ({ t }: { t: Trip }) => {
    const on = mission.tripId === t.id;
    return (
      <Button variant={on ? "secondary" : "outline"} size="sm" onClick={() => setTrip(on ? null : t.id)}>
        {on ? <><Check /> Na minha missão</> : <><Plus /> Adicionar à minha missão</>}
      </Button>
    );
  };

  return (
    <main>
      <PageHeader eyebrow="Módulo 03 · Viagens" title="EXPEDIÇÕES PARA O DESCONHECIDO" image={canyon}>
        Escolha a viagem que abre a sua missão. Uma viagem por missão.
      </PageHeader>
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="flex flex-col gap-3 border-y border-border py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar expedição pelo nome" className="h-10 rounded-sm bg-card pl-9 font-mono text-xs" aria-label="Buscar expedição" />
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Categoria">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>Todas</Chip>
            {(Object.keys(TRIP_CATEGORY_LABEL) as TripCategory[]).map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{TRIP_CATEGORY_LABEL[c]}</Chip>)}
            <span className="mx-2 w-px bg-border" />
            {([["all", "Qualquer duração"], ["short", "Até 7 dias"], ["medium", "8–21 dias"], ["long", "+21 dias"]] as const).map(([k, l]) => <Chip key={k} active={dur === k} onClick={() => setDur(k)}>{l}</Chip>)}
            <span className="mx-2 w-px bg-border" />
            {([["all", "Qualquer preço"], ["low", "< 250 mil"], ["mid", "250–450 mil"], ["high", "> 450 mil"]] as const).map(([k, l]) => <Chip key={k} active={price === k} onClick={() => setPrice(k)}>{l}</Chip>)}
          </div>
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted-foreground" aria-live="polite">{list.length} expedições</p>

        <div className="mt-6 space-y-6">
          {list.map((t, i) => (
            <article key={t.id} className={`grid overflow-hidden border border-border bg-card md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <img src={t.image} alt={t.name} loading="lazy" width={1280} height={800} className="h-64 w-full object-cover md:h-full" />
              <div className="flex flex-col p-6 md:p-8">
                <p className="eyebrow !text-mineral">{TRIP_CATEGORY_LABEL[t.category]}</p>
                <h2 className="mt-2 font-display text-3xl font-semibold">{t.name}</h2>
                <p className="mt-3 text-muted-foreground">{t.description}</p>
                <dl className="mt-5 grid grid-cols-3 gap-4 font-mono text-xs">
                  <div><dt className="text-muted-foreground">Duração</dt><dd className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.days} dias</dd></div>
                  <div><dt className="text-muted-foreground">Capacidade</dt><dd className="flex items-center gap-1"><Users className="h-3 w-3" />{t.capacity}</dd></div>
                  <div><dt className="text-muted-foreground">Aventura</dt><dd className="mt-1"><Level n={t.adventure} /></dd></div>
                </dl>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {t.includes.map((x) => <li key={x} className="border border-border px-2 py-1 font-mono text-[10px]">{x}</li>)}
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
                  <span className="mr-auto font-display text-2xl tabular-nums">{formatMC(t.priceMC)}</span>
                  <Button size="sm" onClick={() => setOpen(t)}>Ver expedição</Button>
                  <AddBtn t={t} />
                </div>
              </div>
            </article>
          ))}
          {!list.length && <p className="border border-dashed border-border py-16 text-center text-muted-foreground">Nenhuma expedição com esses filtros.</p>}
        </div>
        <div className="mt-10"><DemoNotice /></div>
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-lg rounded-sm">
          {open && (
            <>
              <img src={open.image} alt="" className="-mx-6 -mt-6 h-48 w-[calc(100%+3rem)] max-w-none object-cover" />
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{open.name}</DialogTitle>
                <DialogDescription>{open.description}</DialogDescription>
              </DialogHeader>
              <ul className="list-inside list-disc text-sm text-muted-foreground">{open.includes.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="font-mono text-xs">{open.days} dias · até {open.capacity} exploradores · {formatMC(open.priceMC)}</p>
              <AddBtn t={open} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
