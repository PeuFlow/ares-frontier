import { describe, expect, it } from "vitest";
import { filterTrips, missionLines, missionTotal, stayTotal, TRIPS } from "./catalog";

describe("mission planner", () => {
  it("stay price = nightly price × nights", () => {
    expect(stayTotal(9500, 3)).toBe(28500);
  });
  it("total sums trip, stay, experiences and territory", () => {
    const lines = missionLines(
      { tripId: "orbita-vermelha", stayId: "aurora-dome", nights: 2, experienceIds: ["rover", "astro"], territoryId: "x" },
      () => ({ label: "Lote", priceMC: 100000 }),
    );
    expect(missionTotal(lines)).toBe(180000 + 19000 + 12000 + 6500 + 100000);
  });
  it("filters trips by price band and name", () => {
    expect(filterTrips(TRIPS, "", "all", "all", "high").map((t) => t.id)).toEqual(["fronteira-cientifica"]);
    expect(filterTrips(TRIPS, "valles", "all", "all", "all")).toHaveLength(1);
  });
});
