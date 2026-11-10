import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAstronautContext } from "@/hooks/use-astronaut-context";

const state = vi.hoisted(() => ({
  path: "/",
  detailsId: null as string | null,
  selectedId: "valles-07",
}));
vi.mock("@tanstack/react-router", () => ({ useRouterState: () => state.path }));
vi.mock("@/hooks/use-frontier", () => ({ useFrontier: () => state }));
let intersect: IntersectionObserverCallback;
beforeEach(() => {
  state.path = "/";
  state.detailsId = null;
  state.selectedId = "valles-07";
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersect = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

it("maps navigation to controlled route identifiers", () => {
  const { result, rerender } = renderHook(useAstronautContext);
  expect(result.current).toEqual({ section: "inicio" });
  state.path = "/hospedagens";
  rerender();
  expect(result.current).toEqual({ section: "hospedagens" });
  state.path = "/missao";
  rerender();
  expect(result.current).toEqual({ section: "missao" });
});

it("tracks visible exploration and selected territory without scraping page text", () => {
  const section = document.createElement("section");
  section.id = "explorar";
  document.body.append(section);
  const { result, rerender } = renderHook(useAstronautContext);
  act(() =>
    intersect(
      [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    ),
  );
  expect(result.current).toEqual({ section: "explorar", element_id: "valles-07" });
  state.selectedId = "jezero-j021";
  rerender();
  expect(result.current).toEqual({ section: "explorar", element_id: "jezero-j021" });
  state.detailsId = "arcadia-n016";
  rerender();
  expect(result.current).toEqual({ section: "territorios", element_id: "arcadia-n016" });
});

it("uses explicit element metadata and clears it on navigation", () => {
  const button = document.createElement("button");
  button.dataset["aiSection"] = "viagens";
  button.dataset["aiElement"] = "orbita-vermelha";
  document.body.append(button);
  const { result, rerender } = renderHook(useAstronautContext);
  act(() => button.click());
  expect(result.current).toEqual({ section: "viagens", element_id: "orbita-vermelha" });
  state.path = "/conta";
  rerender();
  expect(result.current).toEqual({ section: "conta" });
});
