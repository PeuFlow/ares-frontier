import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import type { Recommendation } from "@/lib/ai-api";
import { catalogImageUrl } from "@/lib/catalog-images";

export const CATALOG_ROUTES = {
  terrain: "/territorios",
  trip: "/viagens",
  accommodation: "/hospedagens",
  experience: "/experiencias",
} as const;
const ACTIONS = {
  terrain: "Conhecer território",
  trip: "Ver viagem",
  accommodation: "Conhecer hospedagem",
  experience: "Ver experiência",
};
const FIELDS: Record<string, string> = {
  area_km2: "Área (km²)",
  areaKm2: "Área (km²)",
  sector: "Setor",
  lot: "Setor",
  destination: "Destino",
  location: "Localização",
  duration_days: "Duração (dias)",
  days: "Duração (dias)",
  duration_hours: "Duração (horas)",
  hours: "Duração (horas)",
  accommodation_type: "Acomodação",
  type: "Tipo",
  category: "Categoria",
  amenities: "Estrutura",
  features: "Características",
  includes: "Inclui",
  elevation_m: "Altitude (m)",
  panoramic_view: "Vista panorâmica",
  capacity: "Capacidade",
};
export function CatalogAttributes({ attributes }: { attributes: Record<string, unknown> }) {
  const fields = Object.entries(attributes).filter(
    ([key, value]) =>
      FIELDS[key] &&
      !(key === "areaKm2" && attributes["area_km2"] != null) &&
      !(key === "days" && attributes["duration_days"] != null) &&
      !(key === "hours" && attributes["duration_hours"] != null) &&
      value != null &&
      (typeof value !== "object" ||
        (Array.isArray(value) && value.every((v) => typeof v === "string"))),
  );
  return (
    <dl className="grid grid-cols-2 gap-3 text-xs">
      {fields.map(([key, value]) => (
        <div key={key} className="min-w-0">
          <dt className="text-muted-foreground">{FIELDS[key]}</dt>
          <dd className="mt-1 break-words text-foreground">
            {Array.isArray(value)
              ? value.join(" · ")
              : typeof value === "boolean"
                ? value
                  ? "Sim"
                  : "Não"
                : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function CatalogPrice({ item }: { item: Recommendation }) {
  return (
    <span className="font-display text-xl tabular-nums">
      {Number(item.price).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} {item.currency}
      {item.attributes["price_unit"] === "night" && (
        <span className="text-xs text-muted-foreground"> / noite</span>
      )}
    </span>
  );
}
export function RecommendationCard({
  item,
  onNavigate,
}: {
  item: Recommendation;
  onNavigate?: () => void;
}) {
  return (
    <article className="my-3 overflow-hidden whitespace-normal rounded-xl border border-primary/25 bg-card text-foreground shadow-lg">
      {item.image_url && (
        <img
          src={catalogImageUrl(item.image_url)}
          alt={item.name}
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
      <div className="space-y-4 p-4">
        <div>
          <p className="font-mono text-[10px] uppercase text-mineral">
            {item.code} ·{" "}
            {item.match === "high"
              ? "Correspondência alta"
              : item.match === "partial"
                ? "Correspondência parcial"
                : "Alternativa · critérios não atendidos"}
          </p>
          <h3 className="mt-1 font-display text-xl leading-tight">{item.name}</h3>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CatalogPrice item={item} />
          <span
            className={`rounded-full px-2 py-1 text-[10px] ${item.available ? "bg-mineral/10 text-mineral" : "bg-destructive/10 text-destructive"}`}
          >
            {item.available ? "Disponível" : "Indisponível"}
          </span>
        </div>
        <CatalogAttributes attributes={item.attributes} />
        <div className="rounded-lg border-l-2 border-primary bg-primary/5 p-3 text-xs leading-relaxed">
          <p className="mb-1 font-medium text-mineral">Por que esta opção?</p>
          <p>{item.reason}</p>
          {!!item.missing.length && (
            <p className="mt-2 text-muted-foreground">
              Não confirmado ou não atendido: {item.missing.join("; ")}
            </p>
          )}
        </div>
        <Link
          to={CATALOG_ROUTES[item.category]}
          search={{ catalog_item: item.id }}
          onClick={onNavigate}
          className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mineral"
        >
          {ACTIONS[item.category]}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
