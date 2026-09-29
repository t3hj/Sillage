import { CATALOGUE } from "@/data/fragrances";
import type { Fragrance } from "@/data/types";

export const baseFragrance = (): Fragrance => ({
  id: "test-a",
  name: "Test A",
  brand: "Brand A",
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

export const collectionItem = (overrides: Partial<Fragrance> = {}) => ({
  fragrance: { ...baseFragrance(), ...overrides },
  addedAt: new Date().toISOString(),
});

export const sauvage = CATALOGUE.find((f) => f.id === "dior-sauvage-edt")!;
