import type { CollectionItem, SillageData, WeatherCache, WearEntry } from "@/data/types";
import { logWear } from "@/lib/storage";

export interface WearContext {
  item: CollectionItem;
  activity?: string;
  weather?:
    | WeatherCache
    | {
        temperature: number;
        apparentTemperature?: number;
        humidity: number;
        code: number;
        description: string;
      };
  note?: string;
  /** Injectable for testability; defaults to now. */
  now?: Date;
}

/**
 * Single source of truth for wear records. Every surface (Today, Collection,
 * details, Journal) builds entries through this so records stay compatible.
 */
export function buildWearEntry({
  item,
  activity,
  weather,
  note,
  now = new Date(),
}: WearContext): Omit<WearEntry, "id"> {
  const f = item.fragrance;
  return {
    fragranceId: f.id,
    fragranceName: f.name,
    brand: f.brand,
    date: now.toISOString(),
    ...(activity ? { activity } : {}),
    ...(weather
      ? {
          temperature: weather.temperature,
          humidity: weather.humidity,
          condition: weather.description,
        }
      : {}),
    ...(note ? { note } : {}),
  };
}

export function logWearFor(data: SillageData, ctx: WearContext): SillageData {
  return logWear(data, buildWearEntry(ctx));
}
