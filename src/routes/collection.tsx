import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FragranceCard } from "@/components/FragranceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SEASONS, type Season } from "@/data/categories";
import { useSillage } from "@/hooks/useSillage";
import { logWear, removeFromCollection } from "@/lib/storage";
import { searchFragrances } from "@/lib/search";

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

function CollectionPage() {
  const { data, update, hydrated } = useSillage();
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState<Season | null>(null);

  const items = useMemo(() => {
    let list = data.collection;
    if (season) list = list.filter((c) => c.fragrance.seasons.includes(season));
    return searchFragrances(list, query);
  }, [data.collection, query, season]);

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

      <div className="space-y-3">
        <Input
          placeholder="Search your collection…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          {SEASONS.map((s) => (
            <Badge
              key={s}
              variant={season === s ? "default" : "outline"}
              className="cursor-pointer rounded-full font-normal"
              onClick={() => setSeason(season === s ? null : s)}
            >
              {s}
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <FragranceCard
              key={item.fragrance.id}
              fragrance={item.fragrance}
              subtitle={
                item.rating?.overall ? (
                  <span className="text-muted-foreground">
                    Your rating: {item.rating.overall}/10
                  </span>
                ) : null
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
