import type { Fragrance } from "@/data/types";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const list = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

export interface FragranceDraft {
  name: string;
  brand: string;
  year: string;
  concentration: string;
  family: string;
  description: string;
  top: string;
  middle: string;
  base: string;
  seasons: Fragrance["seasons"];
  weather: Fragrance["weather"];
  occasions: Fragrance["occasions"];
  times: Fragrance["timeOfDay"];
  vibes: Fragrance["vibes"];
  longevity: Fragrance["longevity"];
  sillage: Fragrance["sillage"];
  intensity: Fragrance["intensity"];
}

/**
 * Single, canonical mapping from the edit form to a stored Fragrance.
 * Every field present on `initial` is preserved unless the draft explicitly
 * carries a value — editing must never silently drop data.
 */
export function buildFragrancePayload(
  initial: Fragrance | undefined,
  draft: FragranceDraft,
): Fragrance {
  const yearNum = Number(draft.year);
  const name = draft.name.trim();
  const brand = draft.brand.trim();
  const description = draft.description.trim();

  return {
    id: initial?.id ?? `custom-${slug(`${brand}-${name}`)}-${Date.now().toString(36)}`,
    name,
    brand,
    topNotes: list(draft.top),
    middleNotes: list(draft.middle),
    baseNotes: list(draft.base),
    seasons: draft.seasons,
    weather: draft.weather,
    occasions: draft.occasions,
    timeOfDay: draft.times,
    vibes: draft.vibes,
    longevity: draft.longevity,
    sillage: draft.sillage,
    intensity: draft.intensity,
    custom: initial?.custom ?? true,
    ...(initial?.gender ? { gender: initial.gender } : {}),
    ...(initial?.perfumer ? { perfumer: initial.perfumer } : {}),
    ...(initial?.subfamily ? { subfamily: initial.subfamily } : {}),
    ...(initial?.performance ? { performance: initial.performance } : {}),
    ...(initial?.similar?.length ? { similar: initial.similar } : {}),
    ...(initial?.image ? { image: initial.image } : {}),
    ...(initial?.source ? { source: initial.source } : {}),
    ...(draft.year && !Number.isNaN(yearNum) ? { year: yearNum } : {}),
    ...(draft.concentration ? { concentration: draft.concentration } : {}),
    ...(draft.family ? { family: draft.family } : {}),
    ...(description ? { description } : {}),
  };
}
