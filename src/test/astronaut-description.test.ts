import { expect, it } from "vitest";
import { TRIPS, STAYS, EXPERIENCES } from "@/data/catalog";
import { TERRITORIES } from "@/data/territories";
import { explainAstronautContext } from "@/lib/astronaut-context";

it("describes every visible catalog item using its own registered data", () => {
  for (const [section, items] of [
    ["viagens", TRIPS],
    ["hospedagens", STAYS],
    ["experiencias", EXPERIENCES],
  ] as const) {
    for (const item of items) {
      const description = explainAstronautContext({ section, element_id: item.id });
      expect(description).toContain(item.name);
      expect(description).toContain(item.description);
    }
  }
  for (const item of TERRITORIES) {
    expect(explainAstronautContext({ section: "territorios", element_id: item.id })).toBe(
      `${item.region}: ${item.summary}`,
    );
  }
});

it("does not invent information for an unknown point", () => {
  expect(explainAstronautContext({ section: "viagens", element_id: "unknown" })).toBe("");
});
