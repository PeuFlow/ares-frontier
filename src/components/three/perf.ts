// Heuristic device tier, read client-side only (MarsGlobe is lazy-loaded after hydration).
export function isLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return cores <= 4 || mem <= 4 || (coarse && window.innerWidth < 900);
}
