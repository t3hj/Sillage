import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CATALOGUE, loadImportedCatalogue } from "@/data/fragrances";
import type { Fragrance } from "@/data/types";
import {
  mergeCatalogues,
  parseRemoteCatalogue,
  readCachedCatalogue,
  writeCachedCatalogue,
} from "@/lib/catalogue";

interface Ctx {
  fragrances: Fragrance[];
  byId: ReadonlyMap<string, Fragrance>;
  /** Version of the downloaded catalogue in use, or null when running on the bundled one. */
  version: string | null;
  /** False until the cache read and update check have finished (success or failure). */
  settled: boolean;
}

const CatalogueContext = createContext<Ctx>({
  fragrances: CATALOGUE,
  byId: new Map(CATALOGUE.map((f) => [f.id, f])),
  version: null,
  settled: true,
});

/**
 * Starts from the bundled catalogue (identical on server and client, so
 * prerendering stays valid), then layers on the cached download and checks the
 * published meta.json for a newer version. Every network step fails silently:
 * offline or on a host without the files, the bundled catalogue just stays.
 */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [remote, setRemote] = useState<{ version: string; fragrances: Fragrance[] } | null>(null);
  const [imported, setImported] = useState<Fragrance[]>([]);
  const [remoteSettled, setRemoteSettled] = useState(false);
  const [importedLoaded, setImportedLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL;

    // Large bundled datasets load after first paint as separate chunks.
    loadImportedCatalogue()
      .then((list) => {
        if (!cancelled) setImported(list);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setImportedLoaded(true);
      });

    (async () => {
      const cached = await readCachedCatalogue();
      if (cached && !cancelled) setRemote(cached);
      try {
        const metaRes = await fetch(`${base}catalogue/meta.json`, { cache: "no-cache" });
        if (!metaRes.ok) return;
        const meta = (await metaRes.json()) as { version?: unknown };
        if (typeof meta.version !== "string" || meta.version === cached?.version) return;
        const res = await fetch(`${base}catalogue/catalogue.json`);
        if (!res.ok) return;
        const parsed = parseRemoteCatalogue(await res.json());
        if (!parsed) return;
        await writeCachedCatalogue(parsed);
        if (!cancelled) setRemote(parsed);
      } catch {
        /* offline — keep whatever we have */
      } finally {
        if (!cancelled) setRemoteSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<Ctx>(() => {
    // Precedence, lowest to highest: imported datasets, hand-written catalogue, downloaded update.
    const local = imported.length ? mergeCatalogues(imported, CATALOGUE) : CATALOGUE;
    const fragrances = remote ? mergeCatalogues(local, remote.fragrances) : local;
    return {
      fragrances,
      byId: new Map(fragrances.map((f) => [f.id, f])),
      version: remote?.version ?? null,
      settled: remoteSettled && importedLoaded,
    };
  }, [imported, remote, remoteSettled, importedLoaded]);

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalogue() {
  return useContext(CatalogueContext);
}
