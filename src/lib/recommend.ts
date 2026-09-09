import type { Occasion, Season, TimeOfDay, Weather } from "@/data/categories";
import type { CollectionItem, WearEntry } from "@/data/types";

export interface RecommendContext {
  season: Season;
  weatherTags: Weather[];
  timeOfDay: TimeOfDay;
  occasion?: Occasion;
  temperature?: number;
}

export interface Recommendation {
  item: CollectionItem;
  score: number;
  reasons: string[];
}

const DAY_MS = 86_400_000;

/**
 * Deterministic, fully local scoring. No AI, no network, same input -> same output.
 *
 * Weights: weather 30, season 20, occasion 20, time of day 10,
 * personal rating up to 12, intensity fit up to 8, rotation freshness up to 15
 * (a fragrance worn today is heavily penalised, one untouched for weeks is boosted).
 */
export function recommend(
  collection: CollectionItem[],
  wears: WearEntry[],
  ctx: RecommendContext,
  limit = 5,
): Recommendation[] {
  const now = Date.now();
  const lastWorn = new Map<string, number>();
  for (const w of wears) {
    const t = new Date(w.date).getTime();
    const prev = lastWorn.get(w.fragranceId);
    if (prev === undefined || t > prev) lastWorn.set(w.fragranceId, t);
  }

  const scored = collection.map((item) => {
    const f = item.fragrance;
    const reasons: string[] = [];
    let score = 0;

    const matchedWeather = ctx.weatherTags.filter((t) => f.weather.includes(t));
    if (matchedWeather.length) {
      score += Math.min(30, 15 * matchedWeather.length);
      reasons.push(`Suits ${matchedWeather.join(" and ").toLowerCase()} weather`);
    } else {
      score -= 10;
    }

    if (f.seasons.includes(ctx.season)) {
      score += 20;
      reasons.push(`Great in ${ctx.season.toLowerCase()}`);
    } else {
      score -= 8;
    }

    if (ctx.occasion) {
      if (f.occasions.includes(ctx.occasion)) {
        score += 20;
        reasons.push(`Works for ${ctx.occasion.toLowerCase()}`);
      } else {
        score -= 12;
      }
    }

    if (f.timeOfDay.includes(ctx.timeOfDay)) {
      score += 10;
      reasons.push(`Right for the ${ctx.timeOfDay.toLowerCase()}`);
    }

    const overall = item.rating?.overall;
    if (typeof overall === "number") {
      score += (overall / 10) * 12;
      if (overall >= 8) reasons.push("One of your highest rated");
    }

    // Heat softens heavy scents; cold rewards them.
    const heavy = f.intensity === "Strong" || f.intensity === "Very Strong";
    const temp = ctx.temperature;
    if (typeof temp === "number") {
      if (temp >= 26 && heavy) {
        score -= 8;
        reasons.push("Heavy for the heat");
      } else if (temp <= 10 && heavy) {
        score += 8;
        reasons.push("Projects well in the cold");
      } else if (temp >= 26 && !heavy) {
        score += 6;
      }
    }

    const last = lastWorn.get(f.id);
    if (last === undefined) {
      score += 15;
      reasons.push("Not worn yet");
    } else {
      const days = (now - last) / DAY_MS;
      if (days < 1) {
        score -= 25;
        reasons.push("Worn today");
      } else if (days < 3) score -= 10;
      else if (days > 21) {
        score += 12;
        reasons.push(`Untouched for ${Math.round(days)} days`);
      } else if (days > 7) score += 6;
    }

    return { item, score: Math.round(score), reasons: reasons.slice(0, 3) };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.item.fragrance.name.localeCompare(b.item.fragrance.name))
    .slice(0, limit);
}

/** Simple, explainable rotation stats. */
export function wearStats(collection: CollectionItem[], wears: WearEntry[]) {
  const counts = new Map<string, number>();
  for (const w of wears) counts.set(w.fragranceId, (counts.get(w.fragranceId) ?? 0) + 1);
  const rows = collection.map((c) => ({
    item: c,
    wears: counts.get(c.fragrance.id) ?? 0,
  }));
  return {
    total: wears.length,
    neglected: rows.filter((r) => r.wears === 0).map((r) => r.item),
    mostWorn: [...rows].sort((a, b) => b.wears - a.wears).slice(0, 5),
  };
}
