import { describe, expect, it } from "vitest";
import { CATALOGUE } from "@/data/fragrances";
import { searchFragrances } from "@/lib/search";

describe("searchFragrances", () => {
  it("finds a fragrance by exact name", () => {
    const results = searchFragrances(CATALOGUE, "Sauvage");
    expect(results[0]?.id).toBe("dior-sauvage-edt");
  });

  it("finds by brand only", () => {
    const results = searchFragrances(CATALOGUE, "Guerlain");
    expect(results.some((f) => f.id === "guerlain-vetiver")).toBe(true);
  });

  it("finds by partial brand and name", () => {
    const results = searchFragrances(CATALOGUE, "dior sauv");
    expect(results[0]?.id).toBe("dior-sauvage-edt");
  });

  it("is case-insensitive", () => {
    const results = searchFragrances(CATALOGUE, "DIOR SAUVAGE");
    expect(results[0]?.id).toBe("dior-sauvage-edt");
  });

  it("tolerates typos", () => {
    const results = searchFragrances(CATALOGUE, "sauvag");
    expect(results.some((f) => f.id === "dior-sauvage-edt")).toBe(true);
  });

  it("returns everything for an empty query", () => {
    expect(searchFragrances(CATALOGUE, "").length).toBe(CATALOGUE.length);
  });

  it("ranks name hits above note hits", () => {
    const results = searchFragrances(CATALOGUE, "sauvage");
    expect(results[0]?.id).toBe("dior-sauvage-edt");
  });

  it("matches on notes too", () => {
    const results = searchFragrances(CATALOGUE, "ambroxan");
    expect(results.some((f) => f.id === "dior-sauvage-edt")).toBe(true);
  });
});
