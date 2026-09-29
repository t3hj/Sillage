import type { Weather } from "@/data/categories";

export interface WeatherNow {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  code: number;
  isDay: boolean;
  description: string;
  locationName?: string;
}

export interface GeoResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

const CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

export const describeCode = (code: number) => CODES[code] ?? "Unsettled";

/** Open-Meteo — free, keyless, no account required. */
export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherNow> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day` +
    `&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not reach the weather service.");
  const json = (await res.json()) as {
    current: Record<string, number>;
  };
  const c = json.current;
  return {
    temperature: c["temperature_2m"] ?? 0,
    humidity: c["relative_humidity_2m"] ?? 0,
    precipitation: c["precipitation"] ?? 0,
    windSpeed: c["wind_speed_10m"] ?? 0,
    code: c["weather_code"] ?? 0,
    isDay: (c["is_day"] ?? 1) === 1,
    description: describeCode(c["weather_code"] ?? 0),
  };
}

export async function searchPlaces(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`,
  );
  if (!res.ok) throw new Error("Could not search for that place.");
  const json = (await res.json()) as { results?: GeoResult[] };
  return json.results ?? [];
}

/** Map live conditions onto the app's weather tags. */
export function weatherTags(w: WeatherNow): Weather[] {
  const tags: Weather[] = [];
  const t = w.temperature;
  if (t >= 28) tags.push("Hot");
  else if (t >= 22) tags.push("Warm");
  else if (t >= 15) tags.push("Mild");
  else if (t >= 8) tags.push("Cool");
  else tags.push("Cold");

  const raining =
    w.precipitation > 0.1 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(w.code);
  if (raining) tags.push("Rainy");
  if (w.humidity >= 70) tags.push("Humid");
  if (w.humidity <= 45) tags.push("Dry");
  return tags;
}

export function seasonForDate(date: Date, southern = false) {
  const m = date.getMonth();
  const northern = m <= 1 || m === 11 ? "Winter" : m <= 4 ? "Spring" : m <= 7 ? "Summer" : "Autumn";
  if (!southern) return northern as "Winter" | "Spring" | "Summer" | "Autumn";
  const flip = { Winter: "Summer", Spring: "Autumn", Summer: "Winter", Autumn: "Spring" } as const;
  return flip[northern as keyof typeof flip];
}

export function timeOfDayFor(date: Date) {
  const h = date.getHours();
  if (h < 11) return "Morning" as const;
  if (h < 17) return "Day" as const;
  if (h < 21) return "Evening" as const;
  return "Night" as const;
}
