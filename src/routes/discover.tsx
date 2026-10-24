import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FragranceCard } from "@/components/FragranceCard";
import { FragranceForm } from "@/components/FragranceForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCatalogue } from "@/hooks/useCatalogue";
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

/** Hand-written entries carry no popularity rank; they are curated well-known fragrances, so slot them near the top. */
const HAND_WRITTEN_RANK = 100;
const rank = (f: { popularity?: number; source?: string }) =>
  f.popularity ?? (f.source ? 10_000 : HAND_WRITTEN_RANK);

function DiscoverPage() {
  const { fragrances: catalogue } = useCatalogue();
  const { data, update } = useSillage();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [gender, setGender] = useState<"Masculine" | "Feminine" | "Unisex" | null>(null);
  const [sort, setSort] = useState<"Popular" | "Name" | "Brand" | "Newest" | "Oldest">("Popular");
  const [manual, setManual] = useState(false);
  const [limit, setLimit] = useState(48);

  const owned = useMemo(
    () => new Set(data.collection.map((c) => c.fragrance.id)),
    [data.collection],
  );

  const brands = useMemo(
    () => [...new Set(catalogue.map((f) => f.brand))].sort((a, b) => a.localeCompare(b)),
    [catalogue],
  );

  const noteFacet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of catalogue)
      for (const n of [...f.topNotes, ...f.middleNotes, ...f.baseNotes])
        counts.set(n, (counts.get(n) ?? 0) + 1);
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1]! - a[1]!)
      .slice(0, 40)
      .map(([n]) => n);
  }, [catalogue]);

  // Search mode shows scored matches across the entire catalogue; browse mode
  // applies facet filters and sorts, with pagination instead of a hard cap.
  const searching = query.trim().length > 0;
  const results = useMemo(() => {
    if (searching) return searchFragrances(catalogue, query);
    let list = catalogue;
    if (family) list = list.filter((f) => f.family === family);
    if (brand) list = list.filter((f) => f.brand === brand);
    if (note)
      list = list.filter((f) =>
        [...f.topNotes, ...f.middleNotes, ...f.baseNotes].some((n) =>
          n.toLowerCase().includes(note.toLowerCase()),
        ),
      );
    if (gender) list = list.filter((f) => f.gender === gender);
    const sorted = [...list].sort((a, b) => {
      switch (sort) {
        case "Popular":
          return (
            rank(a) - rank(b) || a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name)
          );
        case "Name":
          return a.name.localeCompare(b.name);
        case "Newest":
          return (b.year ?? 0) - (a.year ?? 0);
        case "Oldest":
          return (a.year ?? 9999) - (b.year ?? 9999);
        default:
          return a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [catalogue, searching, query, family, brand, note, gender, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Discover
          </h1>
          <p className="text-sm text-muted-foreground">
            {catalogue.length} fragrances in the catalogue
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
              placeholder="Search all fragrances by name, brand, note or vibe…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(48);
              }}
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
            <select
              aria-label="Filter by brand"
              value={brand ?? ""}
              onChange={(e) => setBrand(e.target.value || null)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5" aria-label="Filter by note">
              {noteFacet.map((n) => (
                <Badge
                  key={n}
                  variant={note === n ? "default" : "outline"}
                  className="cursor-pointer rounded-full font-normal"
                  onClick={() => setNote(note === n ? null : n)}
                >
                  {n}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(["Masculine", "Feminine", "Unisex"] as const).map((g) => (
                <Badge
                  key={g}
                  variant={gender === g ? "default" : "outline"}
                  className="cursor-pointer rounded-full font-normal"
                  onClick={() => setGender(gender === g ? null : g)}
                >
                  {g}
                </Badge>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">Sort:</span>
              {(["Popular", "Brand", "Name", "Newest", "Oldest"] as const).map((s) => (
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
            {(family || brand || note || gender) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFamily(null);
                  setBrand(null);
                  setNote(null);
                  setGender(null);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} fragrance{results.length === 1 ? "" : "s"}
          </p>

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
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.slice(0, limit).map((f) => (
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
              {results.length > limit ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setLimit((l) => l + 48)}
                >
                  Show more ({results.length - limit} remaining)
                </Button>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
