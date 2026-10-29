import { describe, expect, it } from "vitest";
import { shouldShowEntry } from "@/lib/entry-screen";

describe("Initial entry choice", () => {
  it("shows login before exploring without a session", () => {
    expect(shouldShowEntry(false, "/")).toBe(true);
    expect(shouldShowEntry(false, "/viagens")).toBe(true);
  });

  it("allows a signed-in explorer or visitor into the site", () => {
    for (const user of [{ guest: false }, { guest: true }]) {
      expect(shouldShowEntry(Boolean(user), "/")).toBe(false);
      expect(shouldShowEntry(Boolean(user), "/viagens")).toBe(false);
    }
  });

  it("keeps entry, signup and recovery pages accessible", () => {
    for (const path of ["/login", "/cadastro", "/esqueci-senha"]) {
      expect(shouldShowEntry(false, path)).toBe(false);
    }
  });
});