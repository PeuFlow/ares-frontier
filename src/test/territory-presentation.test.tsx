import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Euler, Vector3 } from "three";
import { TERRITORIES } from "@/data/territories";
import {
  nextPresentation,
  PRESENTATION_DURATION,
  PRESENTED_TERRITORIES,
  advanceSurfacePresentation,
  surfaceVisibility,
  SURFACE_ROTATION_SPEED,
  INITIAL_SURFACE_YAW,
  type SurfacePresentationState,
  type PresentationState,
} from "@/lib/territory-presentation";
import { useTerritoryPresentation } from "@/hooks/use-territory-presentation";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("territory opening presentation", () => {
  it("reuses every catalog entry once, preserving names, IDs, sectors and coordinates", () => {
    expect(PRESENTED_TERRITORIES).toHaveLength(6);
    expect(new Set(PRESENTED_TERRITORIES.map(({ territory }) => territory.id)).size).toBe(6);
    expect(PRESENTED_TERRITORIES.map(({ territory }) => territory)).toEqual(TERRITORIES);
    for (const item of PRESENTED_TERRITORIES) {
      expect(item.territory).toBe(
        TERRITORIES.find((territory) => territory.id === item.territory.id),
      );
      expect(item.description.length).toBeLessThan(90);
    }
  });

  it("shows all six territories in order and returns smoothly to the first", () => {
    let state: PresentationState = { index: 0, phase: "intro" };
    const shown: string[] = [];
    for (let step = 0; step < 29; step++) {
      state = nextPresentation(state, 6);
      if (state.phase === "visible") shown.push(PRESENTED_TERRITORIES[state.index]!.territory.id);
    }
    expect(shown.slice(0, 6)).toEqual(TERRITORIES.map((territory) => territory.id));
    expect(shown[6]).toBe(TERRITORIES[0]!.id);
  });

  it("keeps the timed sequence only for the fallback without a globe", () => {
    const { result, rerender } = renderHook(
      ({ ready }) => useTerritoryPresentation(ready, 6, true),
      {
        initialProps: { ready: false },
      },
    );
    act(() => vi.advanceTimersByTime(20_000));
    expect(result.current.phase).toBe("intro");
    rerender({ ready: true });
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.intro));
    expect(result.current.phase).toBe("turning");
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.turning));
    expect(result.current.phase).toBe("visible");
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.visible));
    expect(result.current.phase).toBe("leaving");
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.leaving));
    expect(result.current.phase).toBe("gap");
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.gap));
    expect(result.current.index).toBe(1);
  });

  it("keeps a stable presentation when reduced motion is requested", () => {
    const original = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...original(query),
      matches: true,
    }));
    const { result } = renderHook(() => useTerritoryPresentation(true, 6, true));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.index).toBe(0);
    expect(result.current.phase).toBe("visible");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("pauses when the document is hidden", () => {
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("visible");
    const { result } = renderHook(() => useTerritoryPresentation(true, 6, true));
    act(() => {
      visibility.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.phase).toBe("intro");
    act(() => {
      visibility.mockReturnValue("visible");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    act(() => vi.advanceTimersByTime(PRESENTATION_DURATION.intro));
    expect(result.current.phase).toBe("turning");
  });

  it("waits for each territory to enter the visible hemisphere during a constant rotation", () => {
    let state: SurfacePresentationState = { index: 0, phase: "intro", age: 0, turn: 0, seen: [] };
    let yaw = INITIAL_SURFACE_YAW;
    const shown: number[] = [];
    const secondTurn: number[] = [];
    const twoTurns = 4 * Math.PI / SURFACE_ROTATION_SPEED + 2;
    for (let frame = 0; frame < 60 * twoTurns; frame++) {
      yaw += SURFACE_ROTATION_SPEED / 60;
      const next = advanceSurfacePresentation(state, 1 / 60, yaw);
      if (next.phase === "visible" && (state.phase !== "visible" || state.index !== next.index)) {
        const territory = TERRITORIES[next.index]!;
        const visibility = surfaceVisibility(territory.lat, territory.lon, yaw);
        expect(visibility.eligible).toBe(true);
        expect(visibility.facing).toBeGreaterThan(0.65);
        (next.turn === 0 ? shown : secondTurn).push(next.index);
      }
      state = next;
    }
    expect([...shown].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(new Set(secondTurn).size).toBe(6);
    expect(shown).not.toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("does not advance the 3D presentation with an independent timer", () => {
    const { result } = renderHook(() => useTerritoryPresentation(true, 6));
    act(() => result.current.onSurfaceChange(3, "visible"));
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.index).toBe(3);
    expect(result.current.phase).toBe("visible");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps visibility aligned with the sphere after manual horizontal and vertical rotation", () => {
    const camera = new Vector3(0, 0.4, 6.8).normalize();
    for (const tilt of [-0.8, 0.25, 0.8]) {
      for (const yaw of [-1.7, 0, 2]) {
        for (const territory of TERRITORIES) {
          const lat = (territory.lat * Math.PI) / 180;
          const lon = (territory.lon * Math.PI) / 180;
          const point = new Vector3(
            Math.cos(lat) * Math.cos(lon),
            Math.sin(lat),
            -Math.cos(lat) * Math.sin(lon),
          );
          point.applyEuler(new Euler(tilt, yaw, 0));
          const visibility = surfaceVisibility(territory.lat, territory.lon, yaw, tilt);
          expect(visibility.facing).toBeCloseTo(point.dot(camera));
          expect(visibility.x).toBeCloseTo(point.x);
        }
      }
    }
  });
});
