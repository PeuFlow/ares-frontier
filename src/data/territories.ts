export type MissionProfile = "cientifico" | "residencial" | "industrial";

export interface Territory {
  id: string;
  region: string;
  lot: string;
  areaKm2: number;
  priceMC: number;
  profile: MissionProfile;
  /** Illustrative 0-100 */
  relief: number;
  /** Illustrative 0-100 */
  solar: number;
  /** Illustrative 0-100 */
  stability: number;
  summary: string;
  /** Fictional globe placement (degrees), not scientific coordinates */
  lat: number;
  lon: number;
  seed: number;
}

export const PROFILE_LABEL: Record<MissionProfile, string> = {
  cientifico: "Científico",
  residencial: "Residencial",
  industrial: "Industrial",
};

export const TERRITORIES: Territory[] = [
  {
    id: "valles-07",
    region: "Valles Marineris",
    lot: "Setor 07",
    areaKm2: 420,
    priceMC: 1_280_000,
    profile: "cientifico",
    relief: 92,
    solar: 64,
    stability: 48,
    summary: "Cânions profundos e paredes estratificadas, ideais para expedições geológicas de longa duração.",
    lat: -10,
    lon: -40,
    seed: 7,
  },
  {
    id: "elysium-a104",
    region: "Elysium Planitia",
    lot: "Lote A-104",
    areaKm2: 260,
    priceMC: 640_000,
    profile: "residencial",
    relief: 22,
    solar: 86,
    stability: 81,
    summary: "Planície ampla e estável, com boa exposição solar para módulos habitacionais modulares.",
    lat: 5,
    lon: 140,
    seed: 104,
  },
  {
    id: "utopia-d208",
    region: "Utopia Planitia",
    lot: "Lote D-208",
    areaKm2: 510,
    priceMC: 720_000,
    profile: "industrial",
    relief: 18,
    solar: 58,
    stability: 88,
    summary: "Grande extensão plana, pensada para estruturas de processamento e logística de superfície.",
    lat: 45,
    lon: 110,
    seed: 208,
  },
  {
    id: "arcadia-n016",
    region: "Arcadia Planitia",
    lot: "Lote N-016",
    areaKm2: 180,
    priceMC: 410_000,
    profile: "residencial",
    relief: 30,
    solar: 52,
    stability: 76,
    summary: "Território de transição ao norte, com relevo suave e espaço para assentamentos compactos.",
    lat: 48,
    lon: -160,
    seed: 16,
  },
  {
    id: "jezero-j021",
    region: "Jezero Basin",
    lot: "Setor científico J-021",
    areaKm2: 95,
    priceMC: 980_000,
    profile: "cientifico",
    relief: 55,
    solar: 71,
    stability: 69,
    summary: "Antigo delta sedimentar, reservado a laboratórios de campo e estações de amostragem.",
    lat: 18,
    lon: 77,
    seed: 21,
  },
  {
    id: "olympus-o052",
    region: "Olympus Mons",
    lot: "Perímetro O-052",
    areaKm2: 340,
    priceMC: 1_560_000,
    profile: "industrial",
    relief: 97,
    solar: 93,
    stability: 57,
    summary: "Encostas do grande vulcão escudo, com altitude extrema e insolação privilegiada.",
    lat: 18,
    lon: -134,
    seed: 52,
  },
];

export const formatMC = (v: number) => `${new Intl.NumberFormat("pt-BR").format(v)} MC`;
export const formatArea = (v: number) => `${new Intl.NumberFormat("pt-BR").format(v)} km²`;

export type SortKey = "none" | "price-asc" | "price-desc" | "area-desc";

export function filterTerritories(
  list: Territory[],
  query: string,
  profile: MissionProfile | "all",
  sort: SortKey,
): Territory[] {
  const q = query.trim().toLowerCase();
  const out = list.filter(
    (t) =>
      (profile === "all" || t.profile === profile) &&
      (!q || t.region.toLowerCase().includes(q) || t.lot.toLowerCase().includes(q)),
  );
  if (sort === "price-asc") out.sort((a, b) => a.priceMC - b.priceMC);
  if (sort === "price-desc") out.sort((a, b) => b.priceMC - a.priceMC);
  if (sort === "area-desc") out.sort((a, b) => b.areaKm2 - a.areaKm2);
  return out;
}

export const MAX_COMPARE = 2;

/** Returns next compare list, or null when limit is reached. */
export function addToCompare(list: string[], id: string): string[] | null {
  if (list.includes(id)) return list;
  if (list.length >= MAX_COMPARE) return null;
  return [...list, id];
}
