import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FragranceCard } from "@/components/FragranceCard";
import { CATALOGUE } from "@/data/fragrances";
import {
  OCCASIONS,
  PERFORMANCES,
  SEASONS,
  TIMES,
  VIBES,
  WEATHERS,
  type Occasion,
  type Performance,
  type Season,
  type TimeOfDay,
  type Vibe,
  type Weather,
} from "@/data/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide — Sillage" },
      {
        name: "description",
        content:
          "Browse fragrances by season, weather, occasion, time of day, vibe and performance.",
      },
      { property: "og:title", content: "Guide — Sillage" },
      {
        property: "og:description",
        content:
          "Browse fragrances by season, weather, occasion, time of day, vibe and performance.",
      },
    ],
  }),
  component: GuidePage,
});

type Group = "Season" | "Weather" | "Occasion" | "Time" | "Vibe" | "Performance";

const GROUPS: Group[] = ["Season", "Weather", "Occasion", "Time", "Vibe", "Performance"];

function tagsFor(group: Group): string[] {
  switch (group) {
    case "Season":
      return SEASONS;
    case "Weather":
      return WEATHERS;
    case "Occasion":
      return OCCASIONS;
    case "Time":
      return TIMES;
    case "Vibe":
      return VIBES;
    case "Performance":
      return PERFORMANCES;
  }
}

function fragranceHas(group: Group, f: (typeof CATALOGUE)[number], tag: string) {
  switch (group) {
    case "Season":
      return f.seasons.includes(tag as Season);
    case "Weather":
      return f.weather.includes(tag as Weather);
    case "Occasion":
      return f.occasions.includes(tag as Occasion);
    case "Time":
      return f.timeOfDay.includes(tag as TimeOfDay);
    case "Vibe":
      return f.vibes.includes(tag as Vibe);
    case "Performance":
      return f.performance === tag;
  }
}

function GuidePage() {
  const [group, setGroup] = useState<Group>("Season");
  const [tag, setTag] = useState<string | null>("Spring");

  const options = tagsFor(group);
  const active = tag && options.includes(tag) ? tag : null;

  const results = useMemo(
    () =>
      active
        ? CATALOGUE.filter((f) => fragranceHas(group, f, active))
        : [],
    [group, active],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Guide
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse the catalogue by season, weather, occasion, time of day, vibe or performance.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Guide categories">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={group === g}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              group === g
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:bg-secondary",
            )}
            onClick={() => {
              setGroup(g);
              setTag(null);
            }}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={active === o}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              active === o
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
            onClick={() => setTag(active === o ? null : o)}
          >
            {o}
          </button>
        ))}
      </div>

      {active && (
        <p className="text-sm text-muted-foreground">
          {results.length} fragrance{results.length === 1 ? "" : "s"} tagged{" "}
          <span className="text-foreground">{active}</span>
        </p>
      )}

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            {active
              ? "Nothing in the catalogue matches that yet."
              : "Pick a category above to start browsing."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((f) => (
            <FragranceCard key={f.id} fragrance={f} />
          ))}
        </div>
      )}
    </div>
  );
}
