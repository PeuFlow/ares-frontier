import { describe, expect, it } from "vitest";
import { TERRITORIES, addToCompare, filterTerritories } from "./territories";

describe("territories", () => {
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
    expect(filterTerritories(TERRITORIES, "d-208", "all", "none")[0].id).toBe("utopia-d208");
  });
});
