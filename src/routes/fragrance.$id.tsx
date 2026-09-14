import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FragranceForm } from "@/components/FragranceForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATALOGUE_BY_ID } from "@/data/fragrances";
import type { Fragrance, PersonalRating } from "@/data/types";
import { useSillage } from "@/hooks/useSillage";
import {
  addToCollection,
  addToWishlist,
  logWear,
  rateFragrance,
  removeFromCollection,
  updateFragrance,
} from "@/lib/storage";

export const Route = createFileRoute("/fragrance/$id")({
  head: () => ({
    meta: [
      { title: "Fragrance Details — Sillage" },
      {
        name: "description",
        content:
          "Notes, wearability, your personal ratings and wear history for a single fragrance.",
      },
      { property: "og:title", content: "Fragrance Details — Sillage" },
      {
        property: "og:description",
        content:
          "Notes, wearability, your personal ratings and wear history for a single fragrance.",
      },
    ],
  }),
  component: FragrancePage,
});

const RATING_KEYS: { key: keyof PersonalRating; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "smell", label: "Smell" },
  { key: "longevity", label: "Longevity" },
  { key: "sillage", label: "Sillage" },
  { key: "versatility", label: "Versatility" },
  { key: "compliments", label: "Compliments" },
];

function Notes({ title, notes }: { title: string; notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm">{notes.join(", ")}</p>
    </div>
  );
}

function FragrancePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data, update, hydrated } = useSillage();
  const [editing, setEditing] = useState(false);

  const owned = data.collection.find((c) => c.fragrance.id === id);
  const wished = data.wishlist.find((w) => w.fragrance.id === id);
  const fragrance: Fragrance | undefined =
    owned?.fragrance ?? wished?.fragrance ?? CATALOGUE_BY_ID.get(id);

  const [notes, setNotes] = useState(owned?.notes ?? "");

  const history = useMemo(
    () =>
      data.wears
        .filter((w) => w.fragranceId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.wears, id],
  );

  if (!fragrance) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">
          {hydrated ? "That fragrance isn’t here." : "Loading…"}
        </p>
        <Button asChild className="mt-4">
          <Link to="/discover">Back to discover</Link>
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h1 className="mb-4 text-xl font-semibold">Edit {fragrance.name}</h1>
        <FragranceForm
          initial={fragrance}
          onCancel={() => setEditing(false)}
          onSubmit={(f) => {
            update((d) => updateFragrance(d, f));
            setEditing(false);
            toast.success("Saved");
          }}
        />
      </div>
    );
  }

  const rating = owned?.rating ?? {};

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {fragrance.brand}
        </p>
        <h1
          className="mt-1 text-4xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {fragrance.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {[fragrance.concentration, fragrance.family, fragrance.year, fragrance.gender]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {fragrance.description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed">{fragrance.description}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {owned ? (
          <>
            <Button
              onClick={() => {
                update((d) =>
                  logWear(d, {
                    fragranceId: fragrance.id,
                    fragranceName: fragrance.name,
                    brand: fragrance.brand,
                    date: new Date().toISOString(),
                  }),
                );
                toast.success("Wear logged");
              }}
            >
              Wearing today
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                update((d) => removeFromCollection(d, fragrance.id));
                toast("Removed from your collection");
                void navigate({ to: "/collection" });
              }}
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => {
                update((d) => addToCollection(d, fragrance));
                toast.success("Added to your collection");
              }}
            >
              I own this
            </Button>
            {wished ? null : (
              <Button
                variant="outline"
                onClick={() => {
                  update((d) => addToWishlist(d, fragrance));
                  toast("Saved to wishlist");
                }}
              >
                Add to wishlist
              </Button>
            )}
          </>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <Notes title="Top notes" notes={fragrance.topNotes} />
        <Notes title="Heart notes" notes={fragrance.middleNotes} />
        <Notes title="Base notes" notes={fragrance.baseNotes} />
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">When to wear it</h2>
          {(
            [
              ["Seasons", fragrance.seasons],
              ["Weather", fragrance.weather],
              ["Occasions", fragrance.occasions],
              ["Time of day", fragrance.timeOfDay],
              ["Vibes", fragrance.vibes],
            ] as const
          ).map(([label, values]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {values.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  values.map((v) => (
                    <Badge key={v} variant="secondary" className="rounded-full font-normal">
                      {v}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Performance</h2>
          {(
            [
              ["Longevity", fragrance.longevity],
              ["Sillage", fragrance.sillage],
              ["Intensity", fragrance.intensity],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span>{value}</span>
            </div>
          ))}
          {fragrance.perfumer ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Perfumer</span>
              <span>{fragrance.perfumer}</span>
            </div>
          ) : null}
        </div>
      </section>

      {owned ? (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Your ratings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {RATING_KEYS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <Label htmlFor={`r-${key}`}>{label}</Label>
                  <span className="text-muted-foreground">{rating[key] ?? "—"}</span>
                </div>
                <input
                  id={`r-${key}`}
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={rating[key] ?? 0}
                  onChange={(e) =>
                    update((d) =>
                      rateFragrance(d, fragrance.id, { [key]: Number(e.target.value) }),
                    )
                  }
                  className="w-full accent-primary"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="personal-notes">Your notes</Label>
            <Textarea
              id="personal-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => update((d) => rateFragrance(d, fragrance.id, {}, notes))}
            />
          </div>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">You’ve worn this {history.length} times</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {history.slice(0, 10).map((w) => (
              <li key={w.id}>
                {new Date(w.date).toLocaleDateString()}
                {w.activity ? ` · ${w.activity}` : ""}
                {typeof w.temperature === "number"
                  ? ` · ${Math.round(w.temperature)}°C`
                  : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
