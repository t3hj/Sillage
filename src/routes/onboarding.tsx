import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCatalogue } from "@/hooks/useCatalogue";
import type { Fragrance } from "@/data/types";
import { useSillage } from "@/hooks/useSillage";
import { addManyToCollection, setOnboarded } from "@/lib/storage";
import { searchFragrances } from "@/lib/search";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Sillage" },
      { name: "description", content: "Set up your personal fragrance wardrobe." },
    ],
  }),
  component: OnboardingPage,
});

type Choice = null | "add" | "browse" | "empty";

function OnboardingPage() {
  const { fragrances: catalogue } = useCatalogue();
  const { update } = useSillage();
  const navigate = useNavigate();
  const [choice, setChoice] = useState<Choice>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const results = useMemo(
    () => searchFragrances(catalogue, query).slice(0, 24),
    [catalogue, query],
  );

  const complete = (withFragrances: Fragrance[]) => {
    update((d) => setOnboarded(addManyToCollection(d, withFragrances)));
    if (withFragrances.length) {
      toast.success(`Your collection is ready — ${withFragrances.length} fragrances added`);
    }
    void navigate({ to: "/collection" });
  };

  if (choice === null) {
    return (
      <div className="mx-auto max-w-md space-y-8 py-10 text-center">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Welcome to</p>
          <h1
            className="text-5xl font-semibold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sillage
          </h1>
          <p className="text-muted-foreground">Your personal fragrance wardrobe.</p>
        </div>
        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={() => setChoice("add")}>
            Add My Collection
          </Button>
          <Button
            asChild
            className="w-full"
            size="lg"
            variant="outline"
            onClick={() => {
              update((d) => setOnboarded(d));
            }}
          >
            <Link to="/discover">Browse Catalogue</Link>
          </Button>
          <Button className="w-full" size="lg" variant="ghost" onClick={() => complete([])}>
            Start Empty
          </Button>
        </div>
      </div>
    );
  }

  if (choice === "add") {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Which do you already own?
          </h2>
          <p className="text-sm text-muted-foreground">
            Search the catalogue and tap everything in your wardrobe.
          </p>
        </div>
        <Input
          placeholder="Search by name, brand or note…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                aria-pressed={selectedSet.has(f.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm",
                  selectedSet.has(f.id)
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-secondary",
                )}
                onClick={() =>
                  setSelected((s) =>
                    selectedSet.has(f.id) ? s.filter((x) => x !== f.id) : [...s, f.id],
                  )
                }
              >
                <span>
                  <span className="font-medium">{f.name}</span>
                  <span className="text-muted-foreground"> · {f.brand}</span>
                </span>
                {selectedSet.has(f.id) ? <span aria-hidden>✓</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {selected.length} fragrance{selected.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setChoice(null)}>
              Back
            </Button>
            <Button
              disabled={selected.length === 0}
              onClick={() => complete(catalogue.filter((f) => selectedSet.has(f.id)))}
            >
              Add {selected.length || ""} to My Collection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
