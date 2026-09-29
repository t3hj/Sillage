import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FragranceCard } from "@/components/FragranceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FAMILIES,
  OCCASIONS,
  PERFORMANCES,
  SEASONS,
  WEATHERS,
  type Occasion,
  type Performance,
  type Season,
  type Weather,
} from "@/data/categories";
import { useSillage } from "@/hooks/useSillage";
import { logWear, removeFromCollection } from "@/lib/storage";
import { searchFragrances } from "@/lib/search";
import { wearStats } from "@/lib/recommend";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Your Collection — Sillage" },
      {
        name: "description",
        content: "Every fragrance you own, with ratings, notes and one-tap wear logging.",
      },
      { property: "og:title", content: "Your Collection — Sillage" },
      {
        property: "og:description",
        content: "Every fragrance you own, with ratings, notes and one-tap wear logging.",
      },
    ],
  }),
  component: CollectionPage,
});

const SORTS = [
  "Name",
  "Brand",
  "Rating",
  "Most worn",
  "Least worn",
  "Recently added",
  "Recently worn",
  "Never worn",
] as const;
type Sort = (typeof SORTS)[number];

function CollectionPage() {
  const { data, update, hydrated } = useSillage();
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState<Season | null>(null);
  const [family, setFamily] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<Sort>("Name");

  const wearCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of data.wears) counts.set(w.fragranceId, (counts.get(w.fragranceId) ?? 0) + 1);
    return counts;
  }, [data.wears]);

  const lastWorn = useMemo(() => {
    const last = new Map<string, string>();
    for (const w of data.wears) {
      const prev = last.get(w.fragranceId);
      if (!prev || w.date > prev) last.set(w.fragranceId, w.date);
    }
    return last;
  }, [data.wears]);

  const filtered = useMemo(() => {
    let list = data.collection;
    if (season) list = list.filter((c) => c.fragrance.seasons.includes(season));
    if (family) list = list.filter((c) => c.fragrance.family === family);
    if (occasion) list = list.filter((c) => c.fragrance.occasions.includes(occasion));
    if (weather) list = list.filter((c) => c.fragrance.weather.includes(weather));
    if (performance) list = list.filter((c) => c.fragrance.performance === performance);
    if (minRating > 0) list = list.filter((c) => (c.rating?.overall ?? 0) >= minRating);
    return searchFragrances(list, query);
  }, [data.collection, query, season, family, occasion, weather, performance, minRating]);

  const items = useMemo(() => {
    // Always sort a copy — never mutate React state arrays in place.
    const sorted = [...filtered];
    switch (sort) {
      case "Name":
        return sorted.sort((a, b) => a.fragrance.name.localeCompare(b.fragrance.name));
      case "Brand":
        return sorted.sort(
          (a, b) =>
            a.fragrance.brand.localeCompare(b.fragrance.brand) ||
            a.fragrance.name.localeCompare(b.fragrance.name),
        );
      case "Rating":
        return sorted.sort((a, b) => (b.rating?.overall ?? 0) - (a.rating?.overall ?? 0));
      case "Most worn":
        return sorted.sort(
          (a, b) => (wearCounts.get(b.fragrance.id) ?? 0) - (wearCounts.get(a.fragrance.id) ?? 0),
        );
      case "Least worn":
        return sorted.sort(
          (a, b) => (wearCounts.get(a.fragrance.id) ?? 0) - (wearCounts.get(b.fragrance.id) ?? 0),
        );
      case "Recently added":
        return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      case "Recently worn":
        return sorted.sort((a, b) =>
          (lastWorn.get(b.fragrance.id) ?? "").localeCompare(lastWorn.get(a.fragrance.id) ?? ""),
        );
      case "Never worn":
        return sorted
          .filter((c) => (wearCounts.get(c.fragrance.id) ?? 0) === 0)
          .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    }
  }, [filtered, sort, wearCounts, lastWorn]);

  const stats = useMemo(() => wearStats(data.collection, data.wears), [data.collection, data.wears]);

  const highestRated = useMemo(
    () =>
      [...data.collection]
        .filter((c) => c.rating?.overall)
        .sort((a, b) => (b.rating?.overall ?? 0) - (a.rating?.overall ?? 0))[0],
    [data.collection],
  );

  const favouriteFamily = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of data.collection) {
      const fam = c.fragrance.family;
      if (fam) counts.set(fam, (counts.get(fam) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1]! - a[1]!)[0]?.[0];
  }, [data.collection]);

  const chip = (active: boolean) =>
    cn("cursor-pointer rounded-full font-normal", active ? "bg-primary text-primary-foreground" : "");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Your collection
          </h1>
          <p className="text-sm text-muted-foreground">
            {hydrated ? `${data.collection.length} fragrances` : "Loading…"}
          </p>
        </div>
        <Button asChild>
          <Link to="/discover">Add a fragrance</Link>
        </Button>
      </div>

      {hydrated && data.collection.length > 0 ? (
        <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {(
            [
              ["Total wears", String(stats.total)],
              ["Never worn", String(stats.neglected.length)],
              [
                "Most worn",
                stats.mostWorn[0]?.wears
                  ? `${stats.mostWorn[0].item.fragrance.name} (${stats.mostWorn[0].wears})`
                  : "—",
              ],
              [
                "Highest rated",
                highestRated
                  ? `${highestRated.fragrance.name} (${highestRated.rating?.overall}/10)`
                  : "—",
              ],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-1 truncate font-medium">{value}</p>
            </div>
          ))}
          {favouriteFamily ? (
            <div className="col-span-2 rounded-xl border border-border bg-card p-3 sm:col-span-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Favourite fragrance family
              </p>
              <p className="mt-1 font-medium">{favouriteFamily}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="space-y-3">
        <Input
          placeholder="Search your collection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Sort by">
          {SORTS.map((s) => (
            <Badge
              key={s}
              variant={sort === s ? "default" : "outline"}
              className="cursor-pointer rounded-full font-normal"
              onClick={() => setSort(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by season">
          {SEASONS.map((s) => (
            <Badge
              key={s}
              variant={season === s ? "default" : "outline"}
              className={chip(season === s)}
              onClick={() => setSeason(season === s ? null : s)}
            >
              {s}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by family">
          {FAMILIES.map((f) => (
            <Badge
              key={f}
              variant={family === f ? "default" : "outline"}
              className={chip(family === f)}
              onClick={() => setFamily(family === f ? null : f)}
            >
              {f}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by occasion">
          {OCCASIONS.map((o) => (
            <Badge
              key={o}
              variant={occasion === o ? "default" : "outline"}
              className={chip(occasion === o)}
              onClick={() => setOccasion(occasion === o ? null : o)}
            >
              {o}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by weather">
          {WEATHERS.map((w) => (
            <Badge
              key={w}
              variant={weather === w ? "default" : "outline"}
              className={chip(weather === w)}
              onClick={() => setWeather(weather === w ? null : w)}
            >
              {w}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Filter by performance">
          {PERFORMANCES.map((p) => (
            <Badge
              key={p}
              variant={performance === p ? "default" : "outline"}
              className={chip(performance === p)}
              onClick={() => setPerformance(performance === p ? null : p)}
            >
              {p}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Min rating:</span>
          {[0, 5, 7, 9].map((r) => (
            <Badge
              key={r}
              variant={minRating === r ? "default" : "outline"}
              className="cursor-pointer rounded-full font-normal"
              onClick={() => setMinRating(r)}
            >
              {r === 0 ? "Any" : `${r}+`}
            </Badge>
          ))}
        </div>
      </div>

      {hydrated && data.collection.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            Nothing here yet. Browse the catalogue to add your first bottle.
          </p>
          <Button asChild className="mt-4">
            <Link to="/discover">Browse fragrances</Link>
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No fragrances match those filters.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSeason(null);
              setFamily(null);
              setOccasion(null);
              setWeather(null);
              setPerformance(null);
              setMinRating(0);
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <FragranceCard
              key={item.fragrance.id}
              fragrance={item.fragrance}
              subtitle={
                <span className="text-muted-foreground">
                  {item.rating?.overall ? `Your rating: ${item.rating.overall}/10` : null}
                  {wearCounts.get(item.fragrance.id)
                    ? ` · Worn ${wearCounts.get(item.fragrance.id)}×`
                    : " · Never worn"}
                </span>
              }
              footer={
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      update((d) =>
                        logWear(d, {
                          fragranceId: item.fragrance.id,
                          fragranceName: item.fragrance.name,
                          brand: item.fragrance.brand,
                          date: new Date().toISOString(),
                        }),
                      );
                      toast.success(`Logged ${item.fragrance.name}`);
                    }}
                  >
                    Wearing today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      update((d) => removeFromCollection(d, item.fragrance.id));
                      toast(`Removed ${item.fragrance.name}`);
                    }}
                  >
                    Remove
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
