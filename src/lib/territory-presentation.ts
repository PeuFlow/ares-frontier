import { TERRITORIES } from "@/data/territories";

// Short geographic descriptions supplied for the opening presentation.
// Names, IDs, sectors and approximate placement remain owned by the catalog.
const descriptions: Record<string, string> = {
  "valles-07": "Gigantesco sistema de cânions marcianos.",
  "elysium-a104": "Extensa planície localizada em Marte.",
  "utopia-d208": "Região de interesse geológico e com depósitos de gelo.",
  "arcadia-n016": "Região de interesse para exploração de gelo subterrâneo.",
  "jezero-j021": "Antiga região de delta fluvial.",
  "olympus-o052": "Um dos maiores vulcões conhecidos do Sistema Solar.",
};

export const PRESENTED_TERRITORIES = TERRITORIES.map((territory) => ({
  territory,
  description: descriptions[territory.id] ?? territory.summary,
}));

export type PresentationPhase = "intro" | "turning" | "visible" | "leaving" | "gap";
export interface PresentationState {
  index: number;
  phase: PresentationPhase;
}
export const PRESENTATION_DURATION: Record<PresentationPhase, number> = {
  intro: 1400,
  turning: 1800,
  visible: 5500,
  leaving: 600,
  gap: 800,
};

export function nextPresentation(state: PresentationState, count: number): PresentationState {
  switch (state.phase) {
    case "intro":
      return { ...state, phase: "turning" };
    case "turning":
      return { ...state, phase: "visible" };
    case "visible":
      return { ...state, phase: "leaving" };
    case "leaving":
      return { ...state, phase: "gap" };
    case "gap":
      return { index: (state.index + 1) % Math.max(1, count), phase: "turning" };
  }
}

export const SURFACE_ROTATION_SPEED = 0.06; // radians/second, allowing more time to read each label
export const INITIAL_SURFACE_YAW = -1.7;

/** Projects catalog coordinates through the globe's current yaw and tilt. */
export function surfaceVisibility(latitude: number, longitude: number, yaw: number, tilt = 0.25) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180 + yaw;
  const x = Math.cos(lat) * Math.cos(lon);
  const z = -Math.cos(lat) * Math.sin(lon);
  const worldY = Math.cos(tilt) * Math.sin(lat) - Math.sin(tilt) * z;
  const worldZ = Math.sin(tilt) * Math.sin(lat) + Math.cos(tilt) * z;
  const facing = (worldY * 0.4 + worldZ * 6.8) / Math.hypot(0.4, 6.8);
  return { x, facing, eligible: facing > 0.65 && x > -0.72 && x < -0.32 };
}

export interface SurfacePresentationState extends PresentationState {
  age: number;
  turn: number;
  seen: number[];
}

export function advanceSurfacePresentation(
  previous: SurfacePresentationState,
  delta: number,
  yaw: number,
  tilt = 0.25,
): SurfacePresentationState {
  const turn = Math.floor((yaw - INITIAL_SURFACE_YAW + 0.000001) / (2 * Math.PI));
  const state = {
    ...previous,
    age: previous.age + delta * 1000,
    turn,
    seen: turn === previous.turn ? previous.seen : [],
  };
  if (state.phase === "intro")
    return state.age >= PRESENTATION_DURATION.intro ? { ...state, phase: "gap", age: 0 } : state;
  if (state.phase === "visible") {
    const territory = PRESENTED_TERRITORIES[state.index]!.territory;
    const visibility = surfaceVisibility(territory.lat, territory.lon, yaw, tilt);
    return state.age >= PRESENTATION_DURATION.visible ||
      visibility.facing < 0.55 ||
      visibility.x > -0.3
      ? { ...state, phase: "leaving", age: 0 }
      : state;
  }
  if (state.phase === "leaving")
    return state.age >= PRESENTATION_DURATION.leaving ? { ...state, phase: "gap", age: 0 } : state;
  if (state.age < PRESENTATION_DURATION.gap) return state;
  // Show a region only as the steady rotation brings it to the near hemisphere.
  // Once shown, wait for its next revolution rather than repeating it in place.
  const candidate = PRESENTED_TERRITORIES.map(({ territory }, index) => ({
    index,
    ...surfaceVisibility(territory.lat, territory.lon, yaw, tilt),
  }))
    .filter((item) => item.eligible && !state.seen.includes(item.index))
    .sort((a, b) => b.x - a.x)[0];
  return candidate
    ? {
        ...state,
        index: candidate.index,
        phase: "visible",
        age: 0,
        seen: [...state.seen, candidate.index],
      }
    : state;
}
