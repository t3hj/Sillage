import type { Fragrance } from "@/data/types";

/** Shape of the published public/catalogue/catalogue.json. */
export interface RemoteCatalogue {
  version: string;
  fragrances: Fragrance[];
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

/** Minimal runtime guard — remote data is untrusted, so bad entries are dropped. */
export function isUsableFragrance(f: unknown): f is Fragrance {
  if (!f || typeof f !== "object") return false;
  const o = f as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    o["id"].length > 0 &&
    typeof o["name"] === "string" &&
    typeof o["brand"] === "string" &&
    isStringArray(o["topNotes"]) &&
    isStringArray(o["middleNotes"]) &&
    isStringArray(o["baseNotes"]) &&
    isStringArray(o["seasons"]) &&
    isStringArray(o["occasions"]) &&
    isStringArray(o["weather"]) &&
    isStringArray(o["timeOfDay"]) &&
    isStringArray(o["vibes"])
  );
}

export function parseRemoteCatalogue(raw: unknown): RemoteCatalogue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o["version"] !== "string" || !Array.isArray(o["fragrances"])) return null;
  const fragrances = o["fragrances"].filter(isUsableFragrance);
  return fragrances.length > 0 ? { version: o["version"], fragrances } : null;
}

/** Remote entries replace bundled ones with the same id and add new ones. */
export function mergeCatalogues(base: Fragrance[], remote: Fragrance[]): Fragrance[] {
  const byId = new Map(base.map((f) => [f.id, f]));
  for (const f of remote) byId.set(f.id, f);
  return [...byId.values()];
}

/* ---------- IndexedDB cache (too large for localStorage once the catalogue grows) ---------- */

const DB = "sillage-catalogue";
const STORE = "kv";
const KEY = "remote";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readCachedCatalogue(): Promise<RemoteCatalogue | null> {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(parseRemoteCatalogue(req.result));
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function writeCachedCatalogue(value: RemoteCatalogue): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* cache is best-effort */
  }
}
