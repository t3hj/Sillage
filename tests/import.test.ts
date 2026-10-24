import { describe, expect, it } from "vitest";
import {
  estimateOccasions,
  estimateStrength,
  estimateWeather,
  mapMaterial,
  mapPerfume,
  parseCsv,
} from "../scripts/scento-map.mjs";
import {
  loadAllCatalogueFiles,
  loadCatalogueFiles,
  IMPORTED_DIR,
} from "../scripts/catalogue-lib.mjs";
import { noteInfo } from "@/data/notes";
import { findSimilar, similarity } from "@/lib/similar";
import { searchFragrances } from "@/lib/search";
import type { Fragrance } from "@/data/types";
import { baseFragrance } from "./helpers";

const row = {
  id: "house-thing",
  name: "Thing",
  house: "House",
  year: "2019",
  perfumers: ["A B", "C D"],
  concentration: "eau-de-parfum",
  family: "Sunlit Citrus",
  secondary_family: "Green Leaf",
  character: ["citrusy", "fresh", "herbal", "woody", "spicy", "sweet"],
  seasons: ["spring", "summer"],
  times_of_day: ["day", "night"],
  top_notes: ["Bergamot"],
  heart_notes: ["Lavender"],
  base_notes: ["Cedar"],
  notes: ["Bergamot", "Lavender", "Cedar"],
  description: "Bright and green.",
  popularity_rank: "12",
  url: "https://www.scento.com/perfumes/thing",
};

describe("mapPerfume (Scento → Sillage)", () => {
  const f = mapPerfume(row);

  it("maps sourced fields", () => {
    expect(f).toMatchObject({
      id: "house-thing",
      brand: "House",
      year: 2019,
      concentration: "Eau de Parfum",
      family: "Citrus",
      subfamily: "Aromatic",
      seasons: ["Spring", "Summer"],
      timeOfDay: ["Morning", "Day", "Night"],
      topNotes: ["Bergamot"],
      middleNotes: ["Lavender"],
      baseNotes: ["Cedar"],
      perfumer: "A B, C D",
      popularity: 12,
      source: "Scento",
      sourceUrl: "https://www.scento.com/perfumes/thing",
    });
  });

  it("caps vibes at four and never invents gender", () => {
    expect(f.vibes.length).toBeLessThanOrEqual(4);
    expect(f).not.toHaveProperty("gender");
  });

  it("labels what it estimated", () => {
    expect(f.estimated).toEqual(["occasions", "weather", "longevity", "sillage", "intensity"]);
  });

  it("keeps flat-only notes instead of dropping them", () => {
    const flat = mapPerfume({ ...row, top_notes: [], heart_notes: [], base_notes: [] });
    expect(flat.middleNotes).toEqual(["Bergamot", "Lavender", "Cedar"]);
  });

  it("omits fields the source does not have", () => {
    const sparse = mapPerfume({
      ...row,
      year: "",
      perfumers: [],
      concentration: "",
      popularity_rank: "",
    });
    expect(sparse).not.toHaveProperty("year");
    expect(sparse).not.toHaveProperty("perfumer");
    expect(sparse).not.toHaveProperty("concentration");
    expect(sparse).not.toHaveProperty("popularity");
  });

  it("accepts semicolon-separated CSV-style lists as well as arrays", () => {
    const csv = mapPerfume({ ...row, seasons: "spring; summer", top_notes: "Bergamot; Pepper" });
    expect(csv.seasons).toEqual(["Spring", "Summer"]);
    expect(csv.topNotes).toEqual(["Bergamot", "Pepper"]);
  });
});

describe("estimates", () => {
  it("scale strength with concentration", () => {
    expect(estimateStrength("Eau de Cologne", [], "").longevity).toBe("Light");
    expect(estimateStrength("Extrait de Parfum", [], "").longevity).toBe("Very Strong");
    expect(estimateStrength(undefined, [], "").longevity).toBe("Moderate");
  });

  it("heavy character raises sillage, citrus lowers longevity", () => {
    expect(estimateStrength("Eau de Toilette", ["resinous"], "").sillage).toBe("Strong");
    expect(estimateStrength("Eau de Toilette", [], "Sunlit Citrus").longevity).toBe("Light");
  });

  it("weather follows seasons and always returns something", () => {
    expect(estimateWeather(["Winter"], [])).toEqual(["Cold"]);
    expect(estimateWeather(["Summer"], ["fresh"])).toEqual(["Warm", "Hot"]);
    expect(estimateWeather([], [])).toEqual(["Mild"]);
  });

  it("occasions always include at least one value", () => {
    expect(estimateOccasions([], [], undefined)).toEqual(["Casual"]);
    expect(estimateOccasions(["fresh", "citrusy"], ["day"], "Eau de Toilette")).toEqual(
      expect.arrayContaining(["Casual", "Work", "Gym"]),
    );
  });
});

describe("parsers", () => {
  it("parseCsv handles quotes, commas, escaped quotes and CRLF", () => {
    const rows = parseCsv(
      'name,smell\r\n"Rose, Bulgarian","Sweet ""honeyed"" petals"\r\nMusk,Soft\r\n',
    );
    expect(rows).toEqual([
      { name: "Rose, Bulgarian", smell: 'Sweet "honeyed" petals' },
      { name: "Musk", smell: "Soft" },
    ]);
  });

  it("mapMaterial keeps only what exists", () => {
    expect(
      mapMaterial({
        name: "Absinthe",
        aliases: "absinth",
        smell: "Green.",
        material_family: "",
        origin: "",
      }),
    ).toEqual({
      name: "Absinthe",
      aliases: ["absinth"],
      smell: "Green.",
    });
  });
});

describe("imported data", () => {
  const imported = loadCatalogueFiles(IMPORTED_DIR).map((i) => i.entry as Fragrance);

  it("is large, sourced and attributed", () => {
    expect(imported.length).toBeGreaterThan(1000);
    expect(
      imported.every((f) => f.source === "Scento" && f.sourceUrl?.startsWith("https://")),
    ).toBe(true);
  });

  it("has no id shared with the hand-written catalogue", () => {
    const ids = loadAllCatalogueFiles().map((i: { entry: Fragrance }) => i.entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("note descriptions resolve by name and alias", () => {
    expect(noteInfo("Absinthe")?.smell).toBeTruthy();
    expect(noteInfo("absinth")?.name).toBe("Absinthe");
    expect(noteInfo("not-a-real-note")).toBeUndefined();
  });

  it("search stays fast over the full catalogue", () => {
    const start = performance.now();
    searchFragrances(imported, "vanila ouud");
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("findSimilar", () => {
  const make = (id: string, notes: string[], extra: Partial<Fragrance> = {}): Fragrance => ({
    ...baseFragrance(),
    id,
    topNotes: notes,
    ...extra,
  });

  it("ranks by shared notes and excludes itself", () => {
    const target = make("t", ["rose", "oud", "amber"]);
    const near = make("near", ["rose", "oud", "musk"]);
    const far = make("far", ["lemon", "mint"]);
    expect(findSimilar(target, [target, far, near]).map((f) => f.id)).toEqual(["near"]);
  });

  it("puts curated links first and tolerates dangling ids", () => {
    const target = make("t", ["rose", "oud"], { similar: ["gone", "pick"] });
    const pick = make("pick", ["lemon"]);
    const near = make("near", ["rose", "oud"]);
    expect(findSimilar(target, [target, near, pick]).map((f) => f.id)).toEqual(["pick", "near"]);
  });

  it("returns nothing for a fragrance without notes", () => {
    const target = make("t", []);
    expect(similarity(target, make("x", ["rose"]))).toBe(0);
    expect(findSimilar(target, [make("x", ["rose"])])).toEqual([]);
  });
});
