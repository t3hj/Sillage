import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FragranceCard } from "@/components/FragranceCard";
import { FragranceForm } from "@/components/FragranceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATALOGUE } from "@/data/fragrances";
import { FAMILIES } from "@/data/categories";
import { useSillage } from "@/hooks/useSillage";
import { addToCollection, addToWishlist } from "@/lib/storage";
import { searchFragrances } from "@/lib/search";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover Fragrances — Sillage" },
      {
        name: "description",
        content:
          "Search a built-in fragrance catalogue or add your own bottles by hand, all stored on your device.",
      },
      { property: "og:title", content: "Discover Fragrances — Sillage" },
      {
        property: "og:description",
        content:
          "Search a built-in fragrance catalogue or add your own bottles by hand, all stored on your device.",
      },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { data, update } = useSillage();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  const owned = useMemo(
    () => new Set(data.collection.map((c) => c.fragrance.id)),
    [data.collection],
  );

  const results = useMemo(() => {
    let list = CATALOGUE;
    if (family) list = list.filter((f) => f.family === family);
    return searchFragrances(list, query).slice(0, 60);
  }, [query, family]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Discover
          </h1>
          <p className="text-sm text-muted-foreground">
            {CATALOGUE.length} fragrances in the built-in catalogue
          </p>
        </div>
        <Button variant={manual ? "outline" : "default"} onClick={() => setManual(!manual)}>
          {manual ? "Back to catalogue" : "Add manually"}
        </Button>
      </div>

      {manual ? (
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">Add your own fragrance</h2>
          <FragranceForm
            submitLabel="Add to collection"
            onCancel={() => setManual(false)}
            onSubmit={(f) => {
              update((d) => addToCollection(d, f));
              toast.success(`${f.name} added to your collection`);
              setManual(false);
            }}
          />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <Input
              placeholder="Search by name, brand, note or vibe…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {FAMILIES.map((f) => (
                <Badge
                  key={f}
                  variant={family === f ? "default" : "outline"}
                  className="cursor-pointer rounded-full font-normal"
                  onClick={() => setFamily(family === f ? null : f)}
                >
                  {f}
                </Badge>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-muted-foreground">
                No match in the catalogue. You can add it by hand instead.
              </p>
              <Button className="mt-4" onClick={() => setManual(true)}>
                Add manually
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((f) => (
                <FragranceCard
                  key={f.id}
                  fragrance={f}
                  footer={
                    owned.has(f.id) ? (
                      <span className="text-sm text-muted-foreground">In your collection</span>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            update((d) => addToCollection(d, f));
                            toast.success(`${f.name} added`);
                          }}
                        >
                          I own this
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            update((d) => addToWishlist(d, f));
                            toast(`${f.name} saved to wishlist`);
                          }}
                        >
                          Wishlist
                        </Button>
                      </>
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
