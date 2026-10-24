import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCatalogue } from "@/hooks/useCatalogue";
import type { Fragrance } from "@/data/types";
import { useSillage } from "@/hooks/useSillage";
import { searchFragrances } from "@/lib/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Compare — Sillage" },
      {
        name: "description",
        content: "Compare up to three fragrances side by side and decide what to wear.",
      },
      { property: "og:title", content: "Compare — Sillage" },
      {
        property: "og:description",
        content: "Compare up to three fragrances side by side and decide what to wear.",
      },
    ],
  }),
  component: ComparePage,
});

const MAX = 3;

function ComparePage() {
  const { fragrances: catalogue } = useCatalogue();
  const { data } = useSillage();
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  // Collection first, then the rest of the catalogue.
  const pool = useMemo(
    () => [
      ...data.collection.map((c) => c.fragrance),
      ...data.wishlist.map((w) => w.fragrance),
      ...catalogue,
    ],
    [data.collection, data.wishlist, catalogue],
  );
  const seen = new Set<string>();
  const unique = pool.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));

  const results = useMemo(() => searchFragrances(unique, query).slice(0, 8), [unique, query]);

  const resolved: Fragrance[] = picked
    .map((id) => unique.find((f) => f.id === id))
    .filter(Boolean) as Fragrance[];

  const rows: [string, (f: Fragrance) => string][] = [
    ["Brand", (f) => f.brand],
    ["Family", (f) => [f.family, f.subfamily].filter(Boolean).join(" · ") || "—"],
    ["Concentration", (f) => f.concentration ?? "—"],
    ["Top notes", (f) => f.topNotes.join(", ") || "—"],
    ["Heart notes", (f) => f.middleNotes.join(", ") || "—"],
    ["Base notes", (f) => f.baseNotes.join(", ") || "—"],
    ["Seasons", (f) => f.seasons.join(", ") || "—"],
    ["Weather", (f) => f.weather.join(", ") || "—"],
    ["Occasions", (f) => f.occasions.join(", ") || "—"],
    ["Time of day", (f) => f.timeOfDay.join(", ") || "—"],
    ["Longevity", (f) => f.longevity],
    ["Sillage", (f) => f.sillage],
    ["Intensity", (f) => f.intensity],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Compare
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick up to {MAX} fragrances to weigh up side by side.
        </p>
      </div>

      {picked.length < MAX ? (
        <div className="space-y-2">
          <Input
            placeholder="Search to add a fragrance…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search fragrances to compare"
          />
          {query.trim() ? (
            <ul className="space-y-1.5">
              {results.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      setPicked((p) => [...p, f.id]);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground"> · {f.brand}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground">No matches.</li>
              )}
            </ul>
          ) : null}
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setPicked([])}>
          Clear all
        </Button>
      )}

      {resolved.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-32 p-2 text-left align-bottom text-xs uppercase tracking-widest text-muted-foreground">
                  Attribute
                </th>
                {resolved.map((f) => (
                  <th key={f.id} className="p-2 text-left align-bottom">
                    <div className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                      {f.name}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs font-normal text-muted-foreground">
                      {f.brand}
                      <button
                        type="button"
                        aria-label={`Remove ${f.name} from comparison`}
                        className="text-xs underline hover:text-foreground"
                        onClick={() => setPicked((p) => p.filter((id) => id !== f.id))}
                      >
                        remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, get], i) => (
                <tr key={label} className={cn(i % 2 === 0 && "bg-secondary/40")}>
                  <td className="p-2 align-top text-xs uppercase tracking-wide text-muted-foreground">
                    {label}
                  </td>
                  {resolved.map((f) => (
                    <td key={f.id} className="p-2 align-top">
                      {get(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            Nothing selected yet. Search above to add fragrances.
          </p>
        </div>
      )}
    </div>
  );
}
