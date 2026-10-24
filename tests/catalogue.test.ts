import { describe, expect, it } from "vitest";
import { loadAllCatalogueFiles, validateCatalogue } from "../scripts/catalogue-lib.mjs";
import { mergeCatalogues, parseRemoteCatalogue } from "@/lib/catalogue";
import {
  emptyData,
  migrateData,
  syncWithCatalogue,
  updateFragrance,
  addToCollection,
  rateFragrance,
} from "@/lib/storage";
import type { Fragrance, SillageData } from "@/data/types";
import { baseFragrance, sauvage } from "./helpers";

const byId = (list: Fragrance[]) => new Map(list.map((f) => [f.id, f]));
const withCollection = (...fs: Fragrance[]): SillageData => fs.reduce(addToCollection, emptyData());

describe("catalogue source data", () => {
  it("every JSON entry in catalogue/data and catalogue/imported passes validation", () => {
    const errors = validateCatalogue(loadAllCatalogueFiles());
    expect(errors).toEqual([]);
  });

  it("the validator rejects bad entries", () => {
    const good = { ...baseFragrance(), id: "ok-one" };
    const errors = validateCatalogue([
      { file: "t.json", entry: good },
      { file: "t.json", entry: { ...good } }, // duplicate id
      { file: "t.json", entry: { ...good, id: "Bad ID" } },
      { file: "t.json", entry: { ...good, id: "bad-season", seasons: ["Monsoon"] } },
      { file: "t.json", entry: { ...good, id: "bad-year", year: 1200 } },
      { file: "t.json", entry: { ...good, id: "bad-similar", similar: ["nope"] } },
    ]);
    expect(errors.some((e) => e.includes("duplicate id"))).toBe(true);
    expect(errors.some((e) => e.includes("kebab-case"))).toBe(true);
    expect(errors.some((e) => e.includes("invalid seasons"))).toBe(true);
    expect(errors.some((e) => e.includes("implausible year"))).toBe(true);
    expect(errors.some((e) => e.includes('unknown id "nope"'))).toBe(true);
  });
});

describe("remote catalogue handling", () => {
  it("drops malformed entries and rejects unusable payloads", () => {
    const parsed = parseRemoteCatalogue({
      version: "abc",
      fragrances: [sauvage, { id: "broken" }, null, "x"],
    });
    expect(parsed?.fragrances.map((f) => f.id)).toEqual([sauvage.id]);
    expect(parseRemoteCatalogue({ version: "abc", fragrances: [] })).toBeNull();
    expect(parseRemoteCatalogue({ fragrances: [sauvage] })).toBeNull();
    expect(parseRemoteCatalogue(null)).toBeNull();
  });

  it("remote entries override bundled ones and add new ones", () => {
    const base = [sauvage];
    const updated = { ...sauvage, description: "Updated" };
    const added = { ...baseFragrance(), id: "brand-new" };
    const merged = mergeCatalogues(base, [updated, added]);
    expect(merged).toHaveLength(2);
    expect(merged.find((f) => f.id === sauvage.id)?.description).toBe("Updated");
  });
});

describe("syncWithCatalogue", () => {
  it("refreshes untouched bottles and keeps personal data", () => {
    const stale = { ...sauvage, description: "Old text" };
    let data = withCollection(stale);
    data = rateFragrance(data, stale.id, { overall: 9 }, "my notes");
    const next = syncWithCatalogue(data, byId([sauvage]));
    expect(next.collection[0]!.fragrance.description).toBe(sauvage.description);
    expect(next.collection[0]!.rating?.overall).toBe(9);
    expect(next.collection[0]!.notes).toBe("my notes");
  });

  it("never overwrites bottles the user edited", () => {
    let data = withCollection(sauvage);
    data = updateFragrance(data, { ...sauvage, description: "Mine" });
    const next = syncWithCatalogue(data, byId([{ ...sauvage, description: "Catalogue" }]));
    expect(next.collection[0]!.fragrance.description).toBe("Mine");
  });

  it("never touches custom fragrances", () => {
    const custom = { ...baseFragrance(), id: "custom-x", custom: true };
    const data = withCollection(custom);
    const next = syncWithCatalogue(data, byId([{ ...custom, name: "Hijacked" }]));
    expect(next.collection[0]!.fragrance.name).toBe("Test A");
  });

  it("returns the same object when nothing changed", () => {
    const data = withCollection(sauvage);
    expect(syncWithCatalogue(data, byId([sauvage]))).toBe(data);
  });

  it("updateFragrance marks the item as edited", () => {
    const data = updateFragrance(withCollection(sauvage), { ...sauvage, name: "X" });
    expect(data.collection[0]!.edited).toBe(true);
  });
});

describe("v2 → v3 migration", () => {
  const v2 = (fragrance: Fragrance) => ({
    version: 2,
    collection: [{ fragrance, addedAt: "2026-01-01T00:00:00.000Z" }],
    wishlist: [
      { fragrance: { ...sauvage, name: "Edited wish" }, addedAt: "2026-01-01T00:00:00.000Z" },
    ],
    wears: [],
    settings: {},
  });

  it("leaves untouched catalogue items unflagged and flags edited ones", () => {
    const migrated = migrateData(v2(sauvage));
    expect(migrated.version).toBe(3);
    expect(migrated.collection[0]!.edited).toBeUndefined();
    expect(migrated.wishlist[0]!.edited).toBe(true);
  });

  it("flags items that are not in the bundled catalogue", () => {
    const migrated = migrateData(v2({ ...baseFragrance(), id: "unknown-id" }));
    expect(migrated.collection[0]!.edited).toBe(true);
  });
});
