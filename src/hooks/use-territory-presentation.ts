import { useCallback, useEffect, useRef, useState } from "react";
import {
  nextPresentation,
  PRESENTATION_DURATION,
  type PresentationState,
} from "@/lib/territory-presentation";

export function useTerritoryPresentation(ready: boolean, count: number, fallback = false) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<PresentationState>({ index: 0, phase: "intro" });
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
            threshold: 0.2,
          });
    if (ref.current) observer?.observe(ref.current);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  useEffect(() => {
    if (!fallback || !ready || reduced || !inView || !pageVisible || !count) return;
    const timer = setTimeout(
      () => setState((current) => nextPresentation(current, count)),
      PRESENTATION_DURATION[state.phase],
    );
    return () => clearTimeout(timer);
  }, [ready, reduced, inView, pageVisible, count, state, fallback]);

  const onSurfaceChange = useCallback((index: number, phase: PresentationState["phase"]) => {
    setState((current) =>
      current.index === index && current.phase === phase ? current : { index, phase },
    );
  }, []);

  return {
    ref,
    index: state.index,
    phase: reduced ? ("visible" as const) : state.phase,
    reduced,
    paused: !ready || !inView || !pageVisible,
    onSurfaceChange,
  };
}
