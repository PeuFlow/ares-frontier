import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useFrontier } from "./use-frontier";
import type { AIContext, AISection } from "@/lib/ai-api";

const routes: Record<string, AISection> = {
  "/": "inicio",
  "/territorios": "territorios",
  "/viagens": "viagens",
  "/hospedagens": "hospedagens",
  "/experiencias": "experiencias",
  "/missao": "missao",
  "/conta": "conta",
  "/admin": "admin",
};
const sections: Record<string, AISection> = {
  top: "inicio",
  explorar: "explorar",
  terrenos: "territorios",
  galeria: "territorios",
  "como-funciona": "como-funciona",
};

export function useAstronautContext(exploring = false): AIContext {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { detailsId, selectedId } = useFrontier();
  const [visible, setVisible] = useState<AISection | null>(null);
  const [element, setElement] = useState<AIContext | null>(null);
  useEffect(() => {
    setVisible(null);
    setElement(null);
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              const entry = entries.find((e) => e.isIntersecting);
              if (entry && sections[entry.target.id]) {
                setVisible(sections[entry.target.id]!);
                setElement(null);
              }
            },
            { rootMargin: "-15% 0px -55% 0px" },
          );
    document.querySelectorAll('section[id], [id="top"]').forEach((el) => observer?.observe(el));
    const select = (event: Event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-ai-section]")
          : null;
      const section = target?.dataset["aiSection"];
      if (section && Object.values(routes).includes(section as AISection)) {
        const id = target?.dataset["aiElement"];
        setElement(
          id
            ? { section: section as AISection, element_id: id }
            : { section: section as AISection },
        );
      }
    };
    document.addEventListener("click", select);
    return () => {
      observer?.disconnect();
      document.removeEventListener("click", select);
    };
  }, [path]);
  useEffect(() => {
    if (!exploring) return;
    let pointer: { x: number; y: number } | null = null;
    let lastTarget: Element | null = null;
    const identify = (source: Element) => {
      // Reading or operating the balloon must keep its current explanation.
      if (source.closest("[data-astronaut-speech]")) return;
      const target =
        document.querySelector<HTMLElement>('[role="dialog"][data-ai-section]') ??
        source.closest<HTMLElement>("[data-ai-section], a[href], section[id], [id='top']");
      const href = target?.getAttribute("href");
      const section =
        target?.dataset["aiSection"] ??
        sections[target?.id ?? ""] ??
        (href?.startsWith("#") ? sections[href.slice(1)] : routes[href ?? ""]);
      const next: AIContext | null = section
        ? {
            section: section as AISection,
            ...(target?.dataset["aiElement"] ? { element_id: target.dataset["aiElement"] } : {}),
          }
        : null;
      setElement((previous) =>
        previous?.section === next?.section && previous?.element_id === next?.element_id
          ? previous
          : next,
      );
    };
    const hover = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      pointer = { x: event.clientX, y: event.clientY };
      lastTarget = event.target;
      identify(event.target);
    };
    const refresh = () => {
      if (!pointer) return;
      const target =
        typeof document.elementFromPoint === "function"
          ? document.elementFromPoint(pointer.x, pointer.y)
          : lastTarget;
      if (target) identify(target);
    };
    // Scrolling and the rotating showcase can change the point beneath a stationary cursor.
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-ai-element", "data-ai-section"],
    });
    document.addEventListener("pointermove", hover);
    document.addEventListener("scroll", refresh, true);
    window.addEventListener("resize", refresh);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointermove", hover);
      document.removeEventListener("scroll", refresh, true);
      window.removeEventListener("resize", refresh);
    };
  }, [exploring, path]);
  if (detailsId) return { section: "territorios", element_id: detailsId };
  if (element)
    return element.section === "explorar" && !element.element_id
      ? { ...element, element_id: selectedId }
      : element;
  const section = visible ?? routes[path] ?? "inicio";
  if (section === "explorar") return { section, element_id: selectedId };
  return { section };
}
