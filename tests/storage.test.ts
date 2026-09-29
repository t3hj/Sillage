import { describe, expect, it } from "vitest";
import {
  addToCollection,
  addToWishlist,
  emptyData,
  exportJson,
  logWear,
  parseImport,
  rateFragrance,
  removeFromCollection,
  removeWear,
  updateFragrance,
} from "@/lib/storage";
import type { Fragrance } from "@/data/types";

const fragrance = (id: string): Fragrance => ({
  id,
  name: `Fragrance ${id}`,
  brand: "Brand",
  topNotes: [],
  middleNotes: [],
  baseNotes: [],
  seasons: ["Spring"],
  occasions: ["Casual"],
  weather: ["Mild"],
  timeOfDay: ["Day"],
  vibes: [],
  longevity: "Moderate",
  sillage: "Moderate",
  intensity: "Moderate",
});

describe("duplicate detection", () => {
  it("refuses to add the same fragrance twice", () => {
    const data = emptyData();
    const withA = addToCollection(data, fragrance("a"));
    const withAgain = addToCollection(withA, fragrance("a"));
    expect(withAgain.collection).toHaveLength(1);
  });

  it("removes an item from the wishlist when added to the collection", () => {
    let data = emptyData();
    data = addToWishlist(data, fragrance("a"));
    data = addToCollection(data, fragrance("a"));
    expect(data.wishlist).toHaveLength(0);
    expect(data.collection).toHaveLength(1);
  });

  it("refuses duplicate wishlist entries", () => {
    let data = emptyData();
    data = addToWishlist(data, fragrance("a"));
    data = addToWishlist(data, fragrance("a"));
    expect(data.wishlist).toHaveLength(1);
  });
});

describe("import validation", () => {
  it("round-trips a valid export", () => {
    let data = emptyData();
    data = addToCollection(data, fragrance("a"));
    const restored = parseImport(exportJson(data));
    expect(restored.collection[0]?.fragrance.id).toBe("a");
  });

  it("rejects non-object JSON", () => {
    expect(() => parseImport("42")).toThrow();
    expect(() => parseImport("null")).toThrow();
    expect(() => parseImport("not json")).toThrow();
  });

  it("rejects objects without a collection", () => {
    expect(() => parseImport(JSON.stringify({ wishlist: [] }))).toThrow(/collection/);
  });

  it("backfills missing wishlist/wears/settings", () => {
    const restored = parseImport(JSON.stringify({ collection: [] }));
    expect(restored.wishlist).toEqual([]);
    expect(restored.wears).toEqual([]);
    expect(restored.settings.units).toBe("metric");
  });
});

describe("pure updaters", () => {
  it("removes from the collection", () => {
    let data = emptyData();
    data = addToCollection(data, fragrance("a"));
    data = removeFromCollection(data, "a");
    expect(data.collection).toHaveLength(0);
  });

  it("edits fragrance metadata in place", () => {
    let data = emptyData();
    const f = fragrance("a");
    data = addToCollection(data, f);
    data = updateFragrance(data, { ...f, name: "Renamed" });
    expect(data.collection[0]?.fragrance.name).toBe("Renamed");
  });

  it("logs and removes wears", () => {
    let data = emptyData();
    data = logWear(data, {
      fragranceId: "a",
      fragranceName: "Fragrance a",
      brand: "Brand",
      date: new Date().toISOString(),
    });
    expect(data.wears).toHaveLength(1);
    data = removeWear(data, data.wears[0]!.id);
    expect(data.wears).toHaveLength(0);
  });

  it("merges ratings without clobbering other keys", () => {
    let data = emptyData();
    data = addToCollection(data, fragrance("a"));
    data = rateFragrance(data, "a", { overall: 8, smell: 7 });
    data = rateFragrance(data, "a", { sillage: 6 });
    expect(data.collection[0]?.rating).toMatchObject({ overall: 8, smell: 7, sillage: 6 });
  });
});
