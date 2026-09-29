import { useState } from "react";
import {
  CONCENTRATIONS,
  FAMILIES,
  OCCASIONS,
  SEASONS,
  STRENGTHS,
  TIMES,
  VIBES,
  WEATHERS,
  type Occasion,
  type Season,
  type Strength,
  type TimeOfDay,
  type Vibe,
  type Weather,
} from "@/data/categories";
import type { Fragrance } from "@/data/types";
import { buildFragrancePayload, type FragranceDraft } from "@/lib/fragrance-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Single<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              value === o
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-secondary",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FragranceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save",
}: {
  initial?: Fragrance;
  onSubmit: (f: Fragrance) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [concentration, setConcentration] = useState(initial?.concentration ?? "");
  const [family, setFamily] = useState(initial?.family ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [top, setTop] = useState((initial?.topNotes ?? []).join(", "));
  const [middle, setMiddle] = useState((initial?.middleNotes ?? []).join(", "));
  const [base, setBase] = useState((initial?.baseNotes ?? []).join(", "));
  const [seasons, setSeasons] = useState<Season[]>(initial?.seasons ?? []);
  const [weather, setWeather] = useState<Weather[]>(initial?.weather ?? []);
  const [occasions, setOccasions] = useState<Occasion[]>(initial?.occasions ?? []);
  const [times, setTimes] = useState<TimeOfDay[]>(initial?.timeOfDay ?? []);
  const [vibes, setVibes] = useState<Vibe[]>(initial?.vibes ?? []);
  const [longevity, setLongevity] = useState<Strength>(initial?.longevity ?? "Moderate");
  const [sillage, setSillage] = useState<Strength>(initial?.sillage ?? "Moderate");
  const [intensity, setIntensity] = useState<Strength>(initial?.intensity ?? "Moderate");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) {
      setError("A name and a brand are required.");
      return;
    }
    const draft: FragranceDraft = {
      name,
      brand,
      year,
      concentration,
      family,
      description,
      top,
      middle,
      base,
      seasons,
      weather,
      occasions,
      times,
      vibes,
      longevity,
      sillage,
      intensity,
    };
    onSubmit(buildFragrancePayload(initial, draft));
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand">Brand *</Label>
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Concentration</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONCENTRATIONS.map((c) => (
              <Badge
                key={c}
                onClick={() => setConcentration(concentration === c ? "" : c)}
                variant={concentration === c ? "default" : "outline"}
                className="cursor-pointer rounded-full font-normal"
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Family</Label>
        <div className="flex flex-wrap gap-1.5">
          {FAMILIES.map((f) => (
            <Badge
              key={f}
              onClick={() => setFamily(family === f ? "" : f)}
              variant={family === f ? "default" : "outline"}
              className="cursor-pointer rounded-full font-normal"
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="top">Top notes</Label>
          <Input
            id="top"
            placeholder="Bergamot, Lemon"
            value={top}
            onChange={(e) => setTop(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="middle">Heart notes</Label>
          <Input id="middle" value={middle} onChange={(e) => setMiddle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="base">Base notes</Label>
          <Input id="base" value={base} onChange={(e) => setBase(e.target.value)} />
        </div>
      </div>

      <Chips label="Seasons" options={SEASONS} value={seasons} onChange={setSeasons} />
      <Chips label="Weather" options={WEATHERS} value={weather} onChange={setWeather} />
      <Chips label="Occasions" options={OCCASIONS} value={occasions} onChange={setOccasions} />
      <Chips label="Time of day" options={TIMES} value={times} onChange={setTimes} />
      <Chips label="Vibes" options={VIBES} value={vibes} onChange={setVibes} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Single label="Longevity" options={STRENGTHS} value={longevity} onChange={setLongevity} />
        <Single label="Sillage" options={STRENGTHS} value={sillage} onChange={setSillage} />
        <Single label="Intensity" options={STRENGTHS} value={intensity} onChange={setIntensity} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="desc">Notes about this fragrance</Label>
        <Textarea
          id="desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
