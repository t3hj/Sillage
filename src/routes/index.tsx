import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FragranceCard } from "@/components/FragranceCard";
import { OCCASIONS, type Occasion } from "@/data/categories";
import { useSillage } from "@/hooks/useSillage";
import { logWear } from "@/lib/storage";
import { recommend } from "@/lib/recommend";
import {
  fetchWeather,
  seasonForDate,
  timeOfDayFor,
  weatherTags,
  type WeatherNow,
} from "@/lib/weather";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Sillage Fragrance Picks" },
      {
        name: "description",
        content:
          "See what to wear today, chosen from your own collection using the live weather and what you have planned.",
      },
      { property: "og:title", content: "Today — Sillage Fragrance Picks" },
      {
        property: "og:description",
        content:
          "See what to wear today, chosen from your own collection using the live weather and what you have planned.",
      },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const { data, update, hydrated } = useSillage();
  const [weather, setWeather] = useState<WeatherNow | null>(null);
  const [weatherError, setWeatherError] = useState("");
  const [occasion, setOccasion] = useState<Occasion | null>(null);

  const { latitude, longitude, locationName } = data.settings;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    let alive = true;
    setWeatherError("");
    fetchWeather(latitude, longitude)
      .then((w) => alive && setWeather(w))
      .catch(() => alive && setWeatherError("Weather is unavailable right now."));
    return () => {
      alive = false;
    };
  }, [latitude, longitude]);

  const now = new Date();
  const season = seasonForDate(now, (latitude ?? 0) < 0);
  const timeOfDay = timeOfDayFor(now);

  const picks = useMemo(() => {
    if (!hydrated) return [];
    return recommend(
      data.collection,
      data.wears,
      {
        season,
        timeOfDay,
        weatherTags: weather ? weatherTags(weather) : [],
        ...(occasion ? { occasion } : {}),
        ...(weather ? { temperature: weather.temperature } : {}),
      },
      4,
    );
  }, [data.collection, data.wears, hydrated, season, timeOfDay, weather, occasion]);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {season} · {timeOfDay}
        </p>
        <h1
          className="mt-1 text-4xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What to wear today
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {weather
            ? `${Math.round(weather.temperature)}°C · ${weather.description}${
                locationName ? ` in ${locationName}` : ""
              } · ${weather.humidity}% humidity`
            : weatherError ||
              (latitude === undefined
                ? "Set your location in Settings to factor in the live weather."
                : "Checking the weather…")}
        </p>
        {latitude === undefined ? (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link to="/settings">Set your location</Link>
          </Button>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium">What are you doing?</p>
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => (
            <Badge
              key={o}
              variant={occasion === o ? "default" : "outline"}
              className="cursor-pointer rounded-full font-normal"
              onClick={() => setOccasion(occasion === o ? null : o)}
            >
              {o}
            </Badge>
          ))}
        </div>
      </section>

      {hydrated && data.collection.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            Add a few bottles to your collection and suggestions will appear here.
          </p>
          <Button asChild className="mt-4">
            <Link to="/discover">Browse fragrances</Link>
          </Button>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {picks.map(({ item, reasons }, i) => (
            <FragranceCard
              key={item.fragrance.id}
              fragrance={item.fragrance}
              className={i === 0 ? "border-primary/60" : ""}
              subtitle={
                <ul className="space-y-0.5 text-muted-foreground">
                  {reasons.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              }
              footer={
                <Button
                  size="sm"
                  onClick={() => {
                    update((d) =>
                      logWear(d, {
                        fragranceId: item.fragrance.id,
                        fragranceName: item.fragrance.name,
                        brand: item.fragrance.brand,
                        date: new Date().toISOString(),
                        ...(occasion ? { activity: occasion } : {}),
                        ...(weather
                          ? {
                              temperature: weather.temperature,
                              condition: weather.description,
                              humidity: weather.humidity,
                            }
                          : {}),
                      }),
                    );
                    toast.success(`Logged ${item.fragrance.name}`);
                  }}
                >
                  Wearing this
                </Button>
              }
            />
          ))}
        </section>
      )}
    </div>
  );
}
