import { DATA_SOURCES } from "@/data/sources";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSillage } from "@/hooks/useSillage";
import { emptyData, exportJson, parseImport, updateSettings } from "@/lib/storage";
import { searchPlaces, type GeoResult } from "@/lib/weather";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Backup — Sillage" },
      {
        name: "description",
        content:
          "Set your location for weather-aware picks and back up or restore your fragrance data.",
      },
      { property: "og:title", content: "Settings & Backup — Sillage" },
      {
        property: "og:description",
        content:
          "Set your location for weather-aware picks and back up or restore your fragrance data.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, update, replace } = useSillage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      setResults(await searchPlaces(query));
    } catch {
      toast.error("Could not search for that place.");
    } finally {
      setSearching(false);
    }
  };

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sillage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (file: File) => {
    try {
      replace(parseImport(await file.text()));
      toast.success("Backup restored");
    } catch {
      toast.error("That file could not be read as a Sillage backup.");
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Everything is stored on this device only. Nothing is uploaded anywhere.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Location</h2>
        <p className="text-sm text-muted-foreground">
          Current: {data.settings.locationName ?? "not set"}
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Search for a town or city…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
          />
          <Button onClick={() => void runSearch()} disabled={searching}>
            Search
          </Button>
        </div>
        {results.length > 0 ? (
          <ul className="space-y-1.5">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-secondary"
                  onClick={() => {
                    update((d) =>
                      updateSettings(d, {
                        locationName: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
                        latitude: r.latitude,
                        longitude: r.longitude,
                      }),
                    );
                    setResults([]);
                    setQuery("");
                    toast.success(`Location set to ${r.name}`);
                  }}
                >
                  {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!navigator.geolocation) {
              toast.error("This device cannot share its location.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                update((d) =>
                  updateSettings(d, {
                    locationName: "My location",
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  }),
                );
                toast.success("Location set");
              },
              () => toast.error("Location permission was declined."),
            );
          }}
        >
          Use my current location
        </Button>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Backup</h2>
        <p className="text-sm text-muted-foreground">
          {data.collection.length} in collection · {data.wishlist.length} wishlisted ·{" "}
          {data.wears.length} wears
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={download}>Export a backup</Button>
          <div>
            <Label htmlFor="import" className="sr-only">
              Import a backup
            </Label>
            <Input
              id="import"
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importFile(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Data sources</h2>
        <p className="text-sm text-muted-foreground">
          Most of the fragrance catalogue and the note descriptions come from the{" "}
          <a
            className="underline"
            href={DATA_SOURCES["Scento"]!.url}
            target="_blank"
            rel="noreferrer"
          >
            {DATA_SOURCES["Scento"]!.name}
          </a>{" "}
          by Scento, used under{" "}
          <a
            className="underline"
            href={DATA_SOURCES["Scento"]!.licenseUrl}
            target="_blank"
            rel="noreferrer"
          >
            {DATA_SOURCES["Scento"]!.license}
          </a>
          . Occasions, weather and strength ratings on imported entries are estimates made by
          Sillage.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-destructive/40 bg-card p-5">
        <h2 className="text-lg font-semibold">Clear everything</h2>
        <p className="text-sm text-muted-foreground">
          This deletes your collection, wishlist and journal from this device. Export a backup
          first.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            if (window.confirm("Delete all Sillage data on this device?")) {
              replace(emptyData());
              toast("All data cleared");
            }
          }}
        >
          Delete all data
        </Button>
      </section>
    </div>
  );
}
