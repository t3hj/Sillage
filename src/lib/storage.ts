import { CATALOGUE_BY_ID } from "@/data/fragrances";
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
export const DATA_VERSION = 3;

export const emptyData = (): SillageData => ({
  version: DATA_VERSION,
  collection: [],
  wishlist: [],
  wears: [],
  settings: { units: "metric", onboarded: false },
});

/**
 * Versioned migrations: v1 → v2 adds the weather cache, per-item bottle info
 * slot and the onboarding flag. v2 → v3 adds the per-item `edited` flag so
 * catalogue updates can flow into owned bottles without overwriting the user's
 * own edits. Future schema changes append a step here and bump DATA_VERSION —
 * never mutate historical migration logic.
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

  if (data.version < 3) {
    // Before v3 there was no way to tell edited items from untouched ones, so
    // treat any snapshot that differs from the bundled catalogue as edited.
    // This errs on the safe side: worst case an item simply never auto-updates.
    const flag = <T extends { fragrance: Fragrance; edited?: boolean }>(item: T): T => {
      if (item.edited !== undefined) return item;
      const base = CATALOGUE_BY_ID.get(item.fragrance.id);
      const differs = !base || item.fragrance.custom || !sameFragrance(base, item.fragrance);
      return differs ? { ...item, edited: true } : item;
    };
    data = {
      ...data,
      collection: data.collection.map(flag),
      wishlist: data.wishlist.map(flag),
      version: 3,
    };
  }

  return data;
}

const sameFragrance = (a: Fragrance, b: Fragrance) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Refresh owned/wishlisted bottles from the latest catalogue. Items the user
 * edited, or custom ones they created, are never touched. Ratings, notes and
 * bottle info live outside `fragrance`, so they are always preserved. Returns
 * the same object when nothing changed so callers can skip saving.
 */
export function syncWithCatalogue(
  data: SillageData,
  byId: ReadonlyMap<string, Fragrance>,
): SillageData {
  let changed = false;
  const refresh = <T extends { fragrance: Fragrance; edited?: boolean }>(item: T): T => {
    if (item.edited || item.fragrance.custom) return item;
    const latest = byId.get(item.fragrance.id);
    if (!latest || sameFragrance(latest, item.fragrance)) return item;
    changed = true;
    return { ...item, fragrance: latest };
  };
  const collection = data.collection.map(refresh);
  const wishlist = data.wishlist.map(refresh);
  return changed ? { ...data, collection, wishlist } : data;
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

/** Batch add (used by onboarding and CSV/JSON import). Duplicates are skipped. */
export function addManyToCollection(data: SillageData, fragrances: Fragrance[]): SillageData {
  let next = data;
  for (const f of fragrances) next = addToCollection(next, f);
  return next;
}

export function updateFragrance(data: SillageData, fragrance: Fragrance): SillageData {
  return {
    ...data,
    collection: data.collection.map((c) =>
      c.fragrance.id === fragrance.id ? { ...c, fragrance, edited: true } : c,
    ),
    wishlist: data.wishlist.map((w) =>
      w.fragrance.id === fragrance.id ? { ...w, fragrance, edited: true } : w,
    ),
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
    collection: data.collection.map((c) => {
      if (c.fragrance.id !== id) return c;
      const { bottle: _old, ...rest } = c;
      return bottle ? { ...rest, bottle } : rest;
    }),
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
