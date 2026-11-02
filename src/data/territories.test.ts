import { describe, expect, it } from "vitest";
import { TERRITORIES, addToCompare, filterTerritories } from "./territories";

describe("territories", () => {
  it("assigns six individual original artistic images to the six territories", () => {
    expect(TERRITORIES).toHaveLength(6);
    expect(new Set(TERRITORIES.map((t) => t.image)).size).toBe(6);
    for (const t of TERRITORIES) {
      expect(t.image).toMatch(/terrain-.*\.jpg/);
      expect(t.imageAlt).toContain(t.region);
      expect(t.imageSource).toContain("não é uma fotografia científica");
    }
  });
  it("compare allows at most two lots", () => {
    expect(addToCompare(["a", "b"], "c")).toBeNull();
  });
  it("compare never duplicates a lot", () => {
    expect(addToCompare(["a"], "a")).toEqual(["a"]);
  });
  it("filters by profile and sorts by lowest price", () => {
    const r = filterTerritories(TERRITORIES, "", "residencial", "price-asc");
    expect(r.map((t) => t.id)).toEqual(["arcadia-n016", "elysium-a104"]);
  });
  it("searches by lot identifier", () => {
    expect(filterTerritories(TERRITORIES, "d-208", "all", "none")[0]?.id).toBe("utopia-d208");
  });
  it("every lot justifies its price with resources and risks", () => {
    for (const t of TERRITORIES) {
      expect(t.resources.length).toBeGreaterThanOrEqual(1);
      expect(t.risks.length).toBeGreaterThanOrEqual(1);
      expect(t.resources.every((r) => r.impact > 0)).toBe(true);
      expect(t.risks.every((r) => r.impact < 0)).toBe(true);
    }
  });
});
