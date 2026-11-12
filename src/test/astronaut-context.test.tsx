import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
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

it("recognizes the entire card without a click and allows returning to a previous point", () => {
  document.body.innerHTML = `
    <article data-ai-section="viagens" data-ai-element="orbita-vermelha"><img alt="Orbit" /></article>
    <article data-ai-section="viagens" data-ai-element="horizonte-valles"><span>Canyon</span></article>
    <div data-astronaut-speech><button>Pause</button></div>`;
  const { result } = renderHook(() => useAstronautContext(true));
  const orbit = document.querySelector("img")!;
  fireEvent(orbit, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "viagens", element_id: "orbita-vermelha" });
  fireEvent(document.querySelector("span")!, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "viagens", element_id: "horizonte-valles" });
  fireEvent(document.querySelector("button")!, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "viagens", element_id: "horizonte-valles" });
  fireEvent(orbit, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "viagens", element_id: "orbita-vermelha" });
  fireEvent(document.body, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "inicio" });
});

it("does not follow hover while the astronaut is aboard", () => {
  const card = document.createElement("article");
  card.dataset["aiSection"] = "viagens";
  document.body.append(card);
  const { result } = renderHook(useAstronautContext);
  fireEvent(card, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "inicio" });
});

it("keeps the open details context when the pointer moves outside the dialog", () => {
  document.body.innerHTML = `<div role="dialog" data-ai-section="viagens" data-ai-element="horizonte-valles"></div>`;
  const { result } = renderHook(() => useAstronautContext(true));
  fireEvent(document.body, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "viagens", element_id: "horizonte-valles" });
  document.querySelector('[role="dialog"]')!.remove();
  fireEvent(document.body, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "inicio" });
});

it("recognizes a navigation destination without navigating", () => {
  document.body.innerHTML = '<nav><a href="/hospedagens"><span>Hospedagens</span></a></nav>';
  const { result } = renderHook(() => useAstronautContext(true));
  fireEvent(document.querySelector("span")!, new MouseEvent("pointermove", { bubbles: true }));
  expect(result.current).toEqual({ section: "hospedagens" });
});

it("updates the point beneath a stationary pointer after scrolling and showcase changes", async () => {
  document.body.innerHTML =
    '<figure data-ai-section="territorios" data-ai-element="valles-07"></figure><article data-ai-section="viagens" data-ai-element="horizonte-valles"></article>';
  const figure = document.querySelector("figure")!;
  const hitTest = vi.fn().mockReturnValue(figure);
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: hitTest });
  const { result } = renderHook(() => useAstronautContext(true));
  fireEvent(figure, new MouseEvent("pointermove", { bubbles: true, clientX: 300, clientY: 200 }));
  expect(result.current.element_id).toBe("valles-07");
  await act(async () => {
    figure.dataset["aiElement"] = "jezero-j021";
  });
  expect(result.current).toEqual({ section: "territorios", element_id: "jezero-j021" });
  hitTest.mockReturnValue(document.querySelector("article"));
  fireEvent.scroll(document);
  expect(hitTest).toHaveBeenCalledWith(300, 200);
  expect(result.current).toEqual({ section: "viagens", element_id: "horizonte-valles" });
  Reflect.deleteProperty(document, "elementFromPoint");
});
