import orbit from "@/assets/trip-orbit.jpg";
import canyon from "@/assets/trip-canyon.jpg";
import dome from "@/assets/stay-dome.jpg";
import station from "@/assets/stay-station.jpg";

export type TripCategory = "orbital" | "expedicao" | "estadia" | "cientifica";
export const TRIP_CATEGORY_LABEL: Record<TripCategory, string> = {
  orbital: "Orbital",
  expedicao: "Expedição",
  estadia: "Estadia",
  cientifica: "Científica",
};

export interface Trip {
  id: string;
  name: string;
  image: string;
  description: string;
  days: number;
  category: TripCategory;
  capacity: number;
  priceMC: number;
  includes: string[];
  /** 1-5 */
  adventure: number;
}

export const TRIPS: Trip[] = [
  { id: "orbita-vermelha", name: "Órbita Vermelha", image: orbit, category: "orbital", days: 6, capacity: 12, priceMC: 180000, adventure: 2,
    description: "Experiência orbital panorâmica com sete passagens sobre o hemisfério norte e vista do nascer do Sol marciano.",
    includes: ["Cabine panorâmica", "Briefing de voo", "Refeições a bordo"] },
  { id: "horizonte-valles", name: "Horizonte de Valles", image: canyon, category: "expedicao", days: 14, capacity: 6, priceMC: 420000, adventure: 5,
    description: "Expedição demonstrativa por rover através dos cânions de Valles Marineris, com acampamentos pressurizados.",
    includes: ["Rover dedicado", "Guia de superfície", "Traje EVA"] },
  { id: "refugio-elysium", name: "Refúgio de Elysium", image: dome, category: "estadia", days: 21, capacity: 20, priceMC: 360000, adventure: 1,
    description: "Pacote de permanência em habitat nas planícies de Elysium, com estufas e observatório próprio.",
    includes: ["Transfer orbital", "Habitat incluso", "Spa de gravidade baixa"] },
  { id: "fronteira-cientifica", name: "Fronteira Científica", image: station, category: "cientifica", days: 30, capacity: 8, priceMC: 540000, adventure: 4,
    description: "Missão focada em pesquisa: coleta de amostras, laboratório móvel e acompanhamento de cientistas.",
    includes: ["Laboratório móvel", "Kit de amostragem", "Certificado de pesquisa"] },
];

export interface Stay {
  id: string;
  name: string;
  image: string;
  kind: string;
  capacity: number;
  description: string;
  amenities: string[];
  nightMC: number;
}

export const STAYS: Stay[] = [
  { id: "aurora-dome", name: "Aurora Dome", image: dome, kind: "Habitat panorâmico", capacity: 4, nightMC: 9500,
    description: "Cúpula geodésica transparente com vista de 360° do céu marciano e jardim hidropônico.",
    amenities: ["Teto panorâmico", "Jardim hidropônico", "Suporte vital premium"] },
  { id: "olympus-station", name: "Olympus Station", image: station, kind: "Módulo de exploração", capacity: 6, nightMC: 7200,
    description: "Módulos conectados na encosta do Olympus Mons, base ideal para saídas de exploração.",
    amenities: ["Câmara de EVA", "Garagem de rover", "Antena de longo alcance"] },
  { id: "elysium-habitat", name: "Elysium Habitat", image: orbit, kind: "Longa permanência", capacity: 10, nightMC: 5400,
    description: "Acomodação de longa permanência com áreas comuns, academia e estações de trabalho.",
    amenities: ["Academia", "Cozinha compartilhada", "Estações de trabalho"] },
];

export interface Experience {
  id: string;
  name: string;
  description: string;
  hours: number;
  priceMC: number;
}

export const EXPERIENCES: Experience[] = [
  { id: "rover", name: "Passeio de rover", hours: 4, priceMC: 12000, description: "Percurso guiado por dunas e campos de rochas basálticas." },
  { id: "astro", name: "Observação astronômica", hours: 3, priceMC: 6500, description: "Phobos, Deimos e a Terra vistos de um observatório de cratera." },
  { id: "treino", name: "Treinamento de astronauta", hours: 8, priceMC: 18000, description: "Simulações de EVA, gravidade reduzida e procedimentos de emergência." },
  { id: "geo", name: "Expedição geológica", hours: 6, priceMC: 15000, description: "Coleta guiada de amostras em camadas sedimentares antigas." },
  { id: "lab", name: "Visita a instalação científica", hours: 2, priceMC: 5000, description: "Tour demonstrativo por laboratórios de pesquisa e estufas." },
];

export type DurationFilter = "all" | "short" | "medium" | "long";
export type PriceFilter = "all" | "low" | "mid" | "high";

export function filterTrips(list: Trip[], q: string, cat: TripCategory | "all", dur: DurationFilter, price: PriceFilter) {
  const s = q.trim().toLowerCase();
  return list.filter((t) =>
    (!s || t.name.toLowerCase().includes(s)) &&
    (cat === "all" || t.category === cat) &&
    (dur === "all" || (dur === "short" ? t.days <= 7 : dur === "medium" ? t.days > 7 && t.days <= 21 : t.days > 21)) &&
    (price === "all" || (price === "low" ? t.priceMC < 250000 : price === "mid" ? t.priceMC >= 250000 && t.priceMC <= 450000 : t.priceMC > 450000)),
  );
}

export interface MissionSelection {
  tripId: string | null;
  stayId: string | null;
  nights: number;
  experienceIds: string[];
  territoryId: string | null;
}

export const stayTotal = (nightMC: number, nights: number) => nightMC * Math.max(1, Math.floor(nights));

export interface MissionLine { kind: string; id: string; label: string; detail: string; priceMC: number }

export function missionLines(m: MissionSelection, territoryPrice?: (id: string) => { label: string; priceMC: number } | undefined): MissionLine[] {
  const lines: MissionLine[] = [];
  const trip = TRIPS.find((t) => t.id === m.tripId);
  if (trip) lines.push({ kind: "Viagem", id: trip.id, label: trip.name, detail: `${trip.days} dias`, priceMC: trip.priceMC });
  const stay = STAYS.find((s) => s.id === m.stayId);
  if (stay) lines.push({ kind: "Hospedagem", id: stay.id, label: stay.name, detail: `${m.nights} noites`, priceMC: stayTotal(stay.nightMC, m.nights) });
  for (const id of m.experienceIds) {
    const e = EXPERIENCES.find((x) => x.id === id);
    if (e) lines.push({ kind: "Experiência", id: e.id, label: e.name, detail: `${e.hours} h`, priceMC: e.priceMC });
  }
  if (m.territoryId && territoryPrice) {
    const t = territoryPrice(m.territoryId);
    if (t) lines.push({ kind: "Território", id: m.territoryId, label: t.label, detail: "Reserva virtual", priceMC: t.priceMC });
  }
  return lines;
}

export const missionTotal = (lines: MissionLine[]) => lines.reduce((s, l) => s + l.priceMC, 0);
