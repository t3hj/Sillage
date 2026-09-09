import type { Fragrance } from "@/data/types";

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Levenshtein distance, capped for speed. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1]! + 1, prev[j]! + 1, prev[j - 1]! + cost);
    }
    prev = cur;
  }
  return prev[n]!;
}

function tokenScore(token: string, haystack: string[]): number {
  let best = 0;
  for (const word of haystack) {
    if (word === token) best = Math.max(best, 1);
    else if (word.startsWith(token)) best = Math.max(best, 0.9);
    else if (word.includes(token) && token.length > 2) best = Math.max(best, 0.7);
    else if (token.length > 3) {
      const d = distance(token, word);
      if (d <= Math.max(1, Math.floor(token.length / 4)))
        best = Math.max(best, 0.65 - d * 0.05);
    }
  }
  return best;
}

/** Typo-tolerant search across name, brand, notes, family and vibes. */
export function searchFragrances<T extends { fragrance: Fragrance } | Fragrance>(
  items: T[],
  query: string,
): T[] {
  const q = normalise(query);
  if (!q) return items;
  const tokens = q.split(" ");

  const scored = items.map((entry) => {
    const f = ("fragrance" in entry ? entry.fragrance : entry) as Fragrance;
    const nameWords = normalise(`${f.name} ${f.brand}`).split(" ");
    const otherWords = normalise(
      [
        f.family ?? "",
        f.subfamily ?? "",
        f.concentration ?? "",
        ...f.topNotes,
        ...f.middleNotes,
        ...f.baseNotes,
        ...f.vibes,
      ].join(" "),
    ).split(" ");

    let score = 0;
    for (const t of tokens) {
      const nameHit = tokenScore(t, nameWords);
      const otherHit = tokenScore(t, otherWords) * 0.5;
      score += Math.max(nameHit, otherHit);
    }
    return { entry, score: score / tokens.length };
  });

  return scored
    .filter((s) => s.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.entry);
}
