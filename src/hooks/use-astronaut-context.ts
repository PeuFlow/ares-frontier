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
  "como-funciona": "como-funciona",
};

export function useAstronautContext(): AIContext {
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
  if (detailsId) return { section: "territorios", element_id: detailsId };
  if (element) return element;
  const section = visible ?? routes[path] ?? "inicio";
  if (section === "explorar") return { section, element_id: selectedId };
  return { section };
}
