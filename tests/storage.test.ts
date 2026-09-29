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

/* ---------- v2 migration & new fields ---------- */

import {
  DATA_VERSION,
  emptyData as _emptyData,
  exportJson as _exportJson,
  migrateData,
  parseImport as _parseImport,
  setOnboarded,
  setWeatherCache,
  updateBottle,
} from "@/lib/storage";
import { buildWearEntry, logWearFor } from "@/lib/wear";
import { collectionItem } from "./helpers";

describe("storage migration v1 → v2", () => {
  it("upgrades a v1 payload and preserves all user data", () => {
    const v1 = {
      version: 1,
      collection: [
        { fragrance: { id: "a" }, addedAt: "2024-01-01T00:00:00Z", rating: { overall: 7 } },
      ],
      wishlist: [{ fragrance: { id: "b" }, addedAt: "2024-01-02T00:00:00Z" }],
      wears: [
        { id: "w1", fragranceId: "a", fragranceName: "A", brand: "B", date: "2024-01-03T00:00:00Z" },
      ],
      settings: { units: "metric", latitude: 51.5, longitude: -0.1 },
    };
    const migrated = migrateData(v1);
    expect(migrated.version).toBe(DATA_VERSION);
    expect(migrated.collection[0]?.rating?.overall).toBe(7);
    expect(migrated.wishlist[0]?.fragrance.id).toBe("b");
    expect(migrated.wears).toHaveLength(1);
    expect(migrated.settings.onboarded).toBe(false);
    expect(migrated.settings.latitude).toBe(51.5);
  });

  it("is idempotent — migrating v2 data again changes nothing", () => {
    const v2 = emptyData();
    const twice = migrateData(JSON.parse(exportJson(v2)));
    expect(twice).toEqual(v2);
  });

  it("tolerates garbage fields without throwing", () => {
    const migrated = migrateData({ collection: "nope", wears: 42, settings: null });
    expect(migrated.collection).toEqual([]);
    expect(migrated.wears).toEqual([]);
    expect(migrated.settings.units).toBe("metric");
  });

  it("rejects backups without a collection", () => {
    expect(() => parseImport(JSON.stringify({ wishlist: [] }))).toThrow(/collection/);
  });

  it("migrates imported v1 backups to v2", () => {
    const imported = parseImport(JSON.stringify({ collection: [], settings: { latitude: 1 } }));
    expect(imported.version).toBe(DATA_VERSION);
    expect(imported.settings.onboarded).toBe(false);
  });
});

describe("v2 fields", () => {
  it("stores bottle info per collection item", () => {
    let data = emptyData();
    data = { ...data, collection: [collectionItem()] };
    data = updateBottle(data, "test-a", { sizeMl: 100, kind: "Full bottle", opened: true, price: 95 });
    expect(data.collection[0]?.bottle?.sizeMl).toBe(100);
    expect(data.collection[0]?.bottle?.opened).toBe(true);
  });

  it("flags onboarding complete", () => {
    let data = emptyData();
    expect(data.settings.onboarded).toBe(false);
    data = setOnboarded(data);
    expect(data.settings.onboarded).toBe(true);
  });

  it("caches the last weather response", () => {
    let data = emptyData();
    data = setWeatherCache(data, {
      latitude: 51.5,
      longitude: -0.1,
      temperature: 14,
      apparentTemperature: 12,
      humidity: 72,
      precipitation: 0,
      code: 3,
      isDay: true,
      description: "Overcast",
      updatedAt: new Date().toISOString(),
    });
    expect(data.weather?.apparentTemperature).toBe(12);
    expect(data.weather?.updatedAt).toBeTruthy();
  });
});

describe("centralised wear logging", () => {
  const weather = {
    latitude: 0,
    longitude: 0,
    temperature: 9,
    apparentTemperature: 7,
    humidity: 81,
    precipitation: 1.2,
    code: 63,
    isDay: false,
    description: "Rain",
    updatedAt: "2026-01-01T18:00:00Z",
  };

  it("builds a full record from one place", () => {
    const entry = buildWearEntry({
      item: collectionItem(),
      activity: "Work",
      weather,
      note: "first day back",
      now: new Date("2026-01-02T08:30:00Z"),
    });
    expect(entry).toMatchObject({
      fragranceId: "test-a",
      activity: "Work",
      temperature: 9,
      humidity: 81,
      condition: "Rain",
      note: "first day back",
      date: new Date("2026-01-02T08:30:00Z").toISOString(),
    });
  });

  it("omits optional fields when absent", () => {
    const entry = buildWearEntry({ item: collectionItem(), now: new Date() });
    expect(entry.activity).toBeUndefined();
    expect(entry.temperature).toBeUndefined();
    expect(entry.note).toBeUndefined();
  });

  it("logs through the shared helper", () => {
    const data = logWearFor(emptyData(), { item: collectionItem() });
    expect(data.wears).toHaveLength(1);
    expect(data.wears[0]?.fragranceId).toBe("test-a");
  });
});
