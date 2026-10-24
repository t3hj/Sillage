import type { Fragrance } from "@/data/types";

const noteSet = (f: Fragrance) =>
  new Set([...f.topNotes, ...f.middleNotes, ...f.baseNotes].map((n) => n.toLowerCase()));

/** 0..1 similarity from shared notes (Jaccard), with small bonuses for family and vibes. */
export function similarity(a: Fragrance, b: Fragrance): number {
  const na = noteSet(a);
  const nb = noteSet(b);
  if (na.size === 0 || nb.size === 0) return 0;
  let shared = 0;
  for (const n of na) if (nb.has(n)) shared++;
  if (shared === 0) return 0;
  const jaccard = shared / (na.size + nb.size - shared);
  const family = a.family && a.family === b.family ? 0.1 : 0;
  const sharedVibes = a.vibes.filter((v) => b.vibes.includes(v)).length;
  const vibes = Math.min(sharedVibes, 3) * 0.03;
  return Math.min(1, jaccard + family + vibes);
}

/**
 * Fragrances that smell alike: hand-curated `similar` links first, then the
 * closest by note overlap. Needs at least a couple of shared notes to count.
 */
export function findSimilar(target: Fragrance, pool: Fragrance[], limit = 6): Fragrance[] {
  const byId = new Map(pool.map((f) => [f.id, f]));
  const curated = (target.similar ?? [])
    .map((id) => byId.get(id))
    .filter((f): f is Fragrance => Boolean(f) && f!.id !== target.id);
  const taken = new Set([target.id, ...curated.map((f) => f.id)]);
  const computed = pool
    .filter((f) => !taken.has(f.id))
    .map((f) => ({ f, score: similarity(target, f) }))
    .filter((x) => x.score >= 0.2)
    .sort((a, b) => b.score - a.score || (a.f.popularity ?? 1e9) - (b.f.popularity ?? 1e9))
    .map((x) => x.f);
  return [...curated, ...computed].slice(0, limit);
}
