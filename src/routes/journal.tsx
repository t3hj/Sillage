import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSillage } from "@/hooks/useSillage";
import { removeWear } from "@/lib/storage";
import { wearStats } from "@/lib/recommend";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Wear Journal — Sillage" },
      {
        name: "description",
        content:
          "Every fragrance you have worn, with the weather and occasion, plus which bottles need attention.",
      },
      { property: "og:title", content: "Wear Journal — Sillage" },
      {
        property: "og:description",
        content:
          "Every fragrance you have worn, with the weather and occasion, plus which bottles need attention.",
      },
    ],
  }),
  component: JournalPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function JournalPage() {
  const { data, update, hydrated } = useSillage();

  const stats = useMemo(
    () => wearStats(data.collection, data.wears),
    [data.collection, data.wears],
  );

  const sorted = useMemo(
    () => [...data.wears].sort((a, b) => b.date.localeCompare(a.date)),
    [data.wears],
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Journal
        </h1>
        <p className="text-sm text-muted-foreground">
          {hydrated ? `${stats.total} wears logged` : "Loading…"}
        </p>
      </div>

      {hydrated && data.wears.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            Nothing logged yet. Tap “Wearing this” on a suggestion to start your history.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">See today’s picks</Link>
          </Button>
        </div>
      ) : null}

      {stats.total > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Most worn
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {stats.mostWorn
                .filter((r) => r.wears > 0)
                .map((r) => (
                  <li key={r.item.fragrance.id} className="flex justify-between gap-3">
                    <span>{r.item.fragrance.name}</span>
                    <span className="text-muted-foreground">{r.wears}</span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Never worn
            </h2>
            {stats.neglected.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                You have given every bottle a turn.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm">
                {stats.neglected.slice(0, 6).map((item) => (
                  <li key={item.fragrance.id}>{item.fragrance.name}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <ul className="space-y-2">
        {sorted.map((w) => (
          <li
            key={w.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {w.fragranceName}{" "}
                <span className="font-normal text-muted-foreground">· {w.brand}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {[
                  fmt(w.date),
                  w.activity,
                  typeof w.temperature === "number"
                    ? `${Math.round(w.temperature)}°C`
                    : undefined,
                  w.condition,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                update((d) => removeWear(d, w.id));
                toast("Entry removed");
              }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
