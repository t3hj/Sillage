import type {
  CollectionItem,
  Fragrance,
  PersonalRating,
  Settings,
  SillageData,
  WeatherCache,
  WearEntry,
  WishlistItem,
} from "@/data/types";

const KEY = "sillage.data.v1";
export const DATA_VERSION = 2;

export const emptyData = (): SillageData => ({
  version: DATA_VERSION,
  collection: [],
  wishlist: [],
  wears: [],
  settings: { units: "metric", onboarded: false },
});

/**
 * Versioned migrations: v1 → v2 adds the weather cache, per-item bottle info
 * slot and the onboarding flag. Future schema changes append a step here and
 * bump DATA_VERSION — never mutate historical migration logic.
 */
export function migrateData(raw: unknown): SillageData {
  const parsed = (raw ?? {}) as Partial<SillageData>;
  let data: SillageData = {
    ...emptyData(),
    ...parsed,
    collection: Array.isArray(parsed.collection) ? parsed.collection : [],
    wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
    wears: Array.isArray(parsed.wears) ? parsed.wears : [],
    settings: { units: "metric", ...(parsed.settings ?? {}) },
    version: 1,
  };

  if (data.version < 2) {
    data = {
      ...data,
      settings: { ...data.settings, onboarded: data.settings.onboarded ?? false },
      // Bottle info and the weather cache are additive — nothing to backfill.
    };
    data.version = 2;
  }

  return data;
}

const isBrowser = () => typeof window !== "undefined";

export function loadData(): SillageData {
  if (!isBrowser()) return emptyData();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyData();
    return migrateData(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

export function saveData(data: SillageData) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode — data stays in memory for this session */
  }
}

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------- pure updaters ---------- */

export function addToCollection(data: SillageData, fragrance: Fragrance): SillageData {
  if (data.collection.some((c) => c.fragrance.id === fragrance.id)) return data;
  const item: CollectionItem = { fragrance, addedAt: new Date().toISOString() };
  return {
    ...data,
    collection: [item, ...data.collection],
    wishlist: data.wishlist.filter((w) => w.fragrance.id !== fragrance.id),
  };
}

export function removeFromCollection(data: SillageData, id: string): SillageData {
  return { ...data, collection: data.collection.filter((c) => c.fragrance.id !== id) };
}

export function updateFragrance(data: SillageData, fragrance: Fragrance): SillageData {
  return {
    ...data,
    collection: data.collection.map((c) =>
      c.fragrance.id === fragrance.id ? { ...c, fragrance } : c,
    ),
    wishlist: data.wishlist.map((w) => (w.fragrance.id === fragrance.id ? { ...w, fragrance } : w)),
  };
}

export function rateFragrance(
  data: SillageData,
  id: string,
  rating: PersonalRating,
  notes?: string,
): SillageData {
  return {
    ...data,
    collection: data.collection.map((c) =>
      c.fragrance.id === id
        ? {
            ...c,
            rating: { ...c.rating, ...rating },
            ...(notes === undefined ? {} : { notes }),
          }
        : c,
    ),
  };
}

export function addToWishlist(data: SillageData, fragrance: Fragrance): SillageData {
  if (data.wishlist.some((w) => w.fragrance.id === fragrance.id)) return data;
  const item: WishlistItem = { fragrance, addedAt: new Date().toISOString() };
  return { ...data, wishlist: [item, ...data.wishlist] };
}

export function removeFromWishlist(data: SillageData, id: string): SillageData {
  return { ...data, wishlist: data.wishlist.filter((w) => w.fragrance.id !== id) };
}

export function logWear(data: SillageData, entry: Omit<WearEntry, "id">): SillageData {
  return { ...data, wears: [{ ...entry, id: uid() }, ...data.wears] };
}

export function removeWear(data: SillageData, id: string): SillageData {
  return { ...data, wears: data.wears.filter((w) => w.id !== id) };
}

export function updateSettings(data: SillageData, settings: Settings): SillageData {
  return { ...data, settings: { ...data.settings, ...settings } };
}

export function setOnboarded(data: SillageData): SillageData {
  return { ...data, settings: { ...data.settings, onboarded: true } };
}

export function updateBottle(
  data: SillageData,
  id: string,
  bottle: CollectionItem["bottle"],
): SillageData {
  return {
    ...data,
    collection: data.collection.map((c) =>
      c.fragrance.id === id ? { ...c, bottle } : c,
    ),
  };
}

export function setWeatherCache(data: SillageData, cache: WeatherCache): SillageData {
  return { ...data, weather: cache };
}

/* ---------- import / export ---------- */

export function exportJson(data: SillageData): string {
  return JSON.stringify(data, null, 2);
}

export function parseImport(raw: string): SillageData {
  const parsed = JSON.parse(raw) as Partial<SillageData>;
  if (!parsed || typeof parsed !== "object") throw new Error("Not a Sillage backup file.");
  if (!Array.isArray(parsed.collection)) throw new Error("Backup is missing a collection.");
  return migrateData(parsed);
}
