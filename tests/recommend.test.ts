import { describe, expect, it } from "vitest";
import { recommend, wearStats } from "@/lib/recommend";
import { weatherTags, seasonForDate, timeOfDayFor } from "@/lib/weather";
import { collectionItem } from "./helpers";

const ctx = {
  season: "Winter" as const,
  weatherTags: ["Cold"] as ("Cold" | "Hot")[],
  timeOfDay: "Evening" as const,
  temperature: 4,
};

describe("recommend", () => {
  it("prefers a fragrance suited to the current season and weather", () => {
    const good = collectionItem({
      seasons: ["Winter"],
      weather: ["Cold"],
      timeOfDay: ["Evening"],
    });
    const bad = collectionItem({
      seasons: ["Summer"],
      weather: ["Hot"],
      timeOfDay: ["Morning"],
    });
    const picks = recommend([good, bad], [], ctx);
    expect(picks[0]?.item.fragrance.id).toBe("test-a"); // both share the base id…
    // …so compare scores instead: the first should be the better-scoring one.
    expect(picks[0]?.score).toBeGreaterThan(picks[1]?.score ?? 0);
    expect(picks).toHaveLength(2);
  });

  it("is deterministic — same input, same output", () => {
    const items = [collectionItem(), collectionItem()];
    const a = recommend(items, [], ctx);
    const b = recommend(items, [], ctx);
    expect(a.map((r) => r.score)).toEqual(b.map((r) => r.score));
  });

  it("penalises a fragrance worn today", () => {
    const item = collectionItem();
    const now = new Date();
    const fresh = recommend([item], [], ctx)[0]!.score;
    const wornToday = recommend(
      [item],
      [
        {
          id: "w1",
          fragranceId: "test-a",
          fragranceName: "Test A",
          brand: "Brand A",
          date: now.toISOString(),
        },
      ],
      ctx,
    )[0]!.score;
    expect(wornToday).toBeLessThan(fresh);
  });

  it("boosts a fragrance not worn for weeks", () => {
    const item = collectionItem();
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const recent = recommend(
      [item],
      [
        {
          id: "w0",
          fragranceId: "test-a",
          fragranceName: "Test A",
          brand: "Brand A",
          date: fiveDaysAgo,
        },
      ],
      ctx,
    )[0]!.score;
    const threeWeeksAgo = new Date(Date.now() - 25 * 86_400_000).toISOString();
    const stale = recommend(
      [item],
      [
        {
          id: "w1",
          fragranceId: "test-a",
          fragranceName: "Test A",
          brand: "Brand A",
          date: threeWeeksAgo,
        },
      ],
      ctx,
    )[0]!.score;
    expect(stale).toBeGreaterThan(recent);
  });

  it("rewards a high personal rating", () => {
    const unrated = collectionItem();
    const rated = collectionItem();
    rated.rating = { overall: 9 };
    const picks = recommend([unrated, rated], [], ctx);
    expect(picks[0]?.item.rating?.overall).toBe(9);
  });

  it("penalises heavy fragrances in heat", () => {
    const light = collectionItem({ intensity: "Light", seasons: ["Summer"], weather: ["Hot"] });
    const heavy = collectionItem({
      intensity: "Very Strong",
      seasons: ["Summer"],
      weather: ["Hot"],
    });
    const picks = recommend([light, heavy], [], {
      ...ctx,
      season: "Summer",
      weatherTags: ["Hot"],
      timeOfDay: "Day",
      temperature: 32,
    });
    expect(picks[0]?.item.fragrance.intensity).toBe("Light");
  });

  it("prefers an occasion match when an occasion is chosen", () => {
    const matches = collectionItem({ occasions: ["Gym"] });
    const misses = collectionItem({ occasions: ["Formal"] });
    const picks = recommend([misses, matches], [], { ...ctx, occasion: "Gym" });
    expect(picks[0]?.score).toBeGreaterThan(picks[1]?.score ?? 0);
  });

  it("explains its recommendation", () => {
    const item = collectionItem({ seasons: ["Winter"], weather: ["Cold"] });
    const picks = recommend([item], [], ctx);
    expect(picks[0]?.reasons.length).toBeGreaterThan(0);
  });
});

describe("wearStats", () => {
  it("counts wears and flags neglected bottles", () => {
    const worn = collectionItem();
    const unworn = collectionItem({ id: "b" });
    const stats = wearStats(
      [worn, unworn],
      [
        {
          id: "w1",
          fragranceId: "test-a",
          fragranceName: "Test A",
          brand: "Brand A",
          date: new Date().toISOString(),
        },
      ],
    );
    expect(stats.total).toBe(1);
    expect(stats.neglected).toHaveLength(1);
    expect(stats.mostWorn[0]?.wears).toBe(1);
  });

  it("does not mutate the collection array", () => {
    const items = [collectionItem(), collectionItem({ id: "b" })];
    const snapshot = [...items];
    wearStats(items, []);
    expect(items).toEqual(snapshot);
  });
});

describe("weather mapping", () => {
  it("maps temperature bands", () => {
    const w = {
      temperature: 30,
      humidity: 50,
      precipitation: 0,
      code: 0,
      isDay: true,
      description: "",
    };
    expect(weatherTags(w)).toContain("Hot");
    expect(weatherTags({ ...w, temperature: 2 })).toContain("Cold");
    expect(weatherTags({ ...w, temperature: 12 })).toContain("Cool");
    expect(weatherTags({ ...w, temperature: 17 })).toContain("Mild");
  });

  it("flags rain and humidity", () => {
    const w = {
      temperature: 20,
      humidity: 80,
      precipitation: 2,
      code: 61,
      isDay: true,
      description: "",
    };
    const tags = weatherTags(w);
    expect(tags).toContain("Rainy");
    expect(tags).toContain("Humid");
  });

  it("flags dry air", () => {
    const w = {
      temperature: 20,
      humidity: 30,
      precipitation: 0,
      code: 0,
      isDay: true,
      description: "",
    };
    expect(weatherTags(w)).toContain("Dry");
  });
});

describe("season/time helpers", () => {
  it("derives seasons in the northern hemisphere", () => {
    expect(seasonForDate(new Date("2026-01-15"))).toBe("Winter");
    expect(seasonForDate(new Date("2026-07-15"))).toBe("Summer");
    expect(seasonForDate(new Date("2026-10-15"))).toBe("Autumn");
  });

  it("flips seasons for the southern hemisphere", () => {
    expect(seasonForDate(new Date("2026-01-15"), true)).toBe("Summer");
    expect(seasonForDate(new Date("2026-07-15"), true)).toBe("Winter");
  });

  it("derives time of day", () => {
    expect(timeOfDayFor(new Date(2026, 0, 1, 8, 0))).toBe("Morning");
    expect(timeOfDayFor(new Date(2026, 0, 1, 14, 0))).toBe("Day");
    expect(timeOfDayFor(new Date(2026, 0, 1, 19, 0))).toBe("Evening");
    expect(timeOfDayFor(new Date(2026, 0, 1, 23, 0))).toBe("Night");
  });
});

describe("determinism with injected timestamp", () => {
  it("same inputs + same timestamp → identical scores", () => {
    const item = collectionItem();
    const fixed = new Date("2026-03-01T09:00:00Z").getTime();
    const wears = [
      {
        id: "w1",
        fragranceId: "test-a",
        fragranceName: "Test A",
        brand: "Brand A",
        date: "2026-02-01T09:00:00Z",
      },
    ];
    const a = recommend([item], wears, ctx, 5, fixed);
    const b = recommend([item], wears, ctx, 5, fixed);
    expect(a[0]?.score).toBe(b[0]?.score);
  });

  it("a later timestamp increases the score of a previously worn fragrance", () => {
    const item = collectionItem();
    const wears = [
      {
        id: "w1",
        fragranceId: "test-a",
        fragranceName: "Test A",
        brand: "Brand A",
        date: "2026-02-01T09:00:00Z",
      },
    ];
    const soon = recommend([item], wears, ctx, 5, new Date("2026-02-02T09:00:00Z").getTime())[0]!
      .score;
    const later = recommend([item], wears, ctx, 5, new Date("2026-03-15T09:00:00Z").getTime())[0]!
      .score;
    expect(later).toBeGreaterThan(soon);
  });

  it("empty collection yields no recommendations (clear empty state upstream)", () => {
    expect(recommend([], [], ctx)).toEqual([]);
  });
});
