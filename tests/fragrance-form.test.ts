import { describe, expect, it } from "vitest";
import { buildFragrancePayload, list, slug, type FragranceDraft } from "@/lib/fragrance-form";
import { CATALOGUE } from "@/data/fragrances";
import type { Fragrance } from "@/data/types";

const sauvage = CATALOGUE.find((f) => f.id === "dior-sauvage-edt")!;
const diorH = CATALOGUE.find((f) => f.id === "dior-homme-intense")!;

const blankDraft = (over: Partial<FragranceDraft> = {}): FragranceDraft => ({
  name: "Test",
  brand: "Brand",
  year: "",
  concentration: "",
  family: "",
  description: "",
  top: "",
  middle: "",
  base: "",
  seasons: ["Spring"],
  weather: ["Mild"],
  occasions: ["Casual"],
  times: ["Day"],
  vibes: [],
  longevity: "Moderate",
  sillage: "Moderate",
  intensity: "Moderate",
  ...over,
});

describe("buildFragrancePayload — edit preservation", () => {
  it("preserves fields the form does not expose (subfamily, performance, similar, source)", () => {
    const out = buildFragrancePayload(
      diorH,
      blankDraft({ name: "DHI renamed", brand: diorH.brand }),
    );
    expect(out.subfamily).toBe(diorH.subfamily);
    expect(out.performance).toBe(diorH.performance);
    expect(out.similar).toEqual(diorH.similar);
    expect(out.source).toBe(diorH.source);
    expect(out.perfumer).toBe(diorH.perfumer);
    expect(out.id).toBe(diorH.id); // identity must not change on edit
    expect(out.name).toBe("DHI renamed");
  });

  it("round-trips a full catalogue fragrance unchanged through the form", () => {
    const draft: FragranceDraft = {
      name: sauvage.name,
      brand: sauvage.brand,
      year: String(sauvage.year ?? ""),
      concentration: sauvage.concentration ?? "",
      family: sauvage.family ?? "",
      description: sauvage.description ?? "",
      top: sauvage.topNotes.join(", "),
      middle: sauvage.middleNotes.join(", "),
      base: sauvage.baseNotes.join(", "),
      seasons: sauvage.seasons,
      weather: sauvage.weather,
      occasions: sauvage.occasions,
      times: sauvage.timeOfDay,
      vibes: sauvage.vibes,
      longevity: sauvage.longevity,
      sillage: sauvage.sillage,
      intensity: sauvage.intensity,
    };
    const out = buildFragrancePayload(sauvage, draft);
    // Everything preserved; edited catalogue entries are marked custom.
    expect(out).toEqual({ ...sauvage, custom: true });
  });

  it("new custom fragrances get a custom id and flag", () => {
    const out = buildFragrancePayload(undefined, blankDraft());
    expect(out.custom).toBe(true);
    expect(out.id.startsWith("custom-")).toBe(true);
  });

  it("a cleared optional field is dropped rather than written empty", () => {
    const out = buildFragrancePayload(diorH, blankDraft({ description: "  " }));
    expect(out.description).toBeUndefined();
  });
});

describe("helpers", () => {
  it("splits note strings", () => {
    expect(list("Bergamot, Lemon , ")).toEqual(["Bergamot", "Lemon"]);
  });

  it("slugs identifiers", () => {
    expect(slug("Terre d'Hermès!")).toBe("terre-d-hermes");
  });
});
