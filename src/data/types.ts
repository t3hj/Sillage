import type {
  Occasion,
  Performance,
  Season,
  Strength,
  TimeOfDay,
  Vibe,
  Weather,
} from "./categories";

export interface Fragrance {
  id: string;
  name: string;
  brand: string;
  year?: number;
  description?: string;
  concentration?: string;
  family?: string;
  subfamily?: string;
  topNotes: string[];
  middleNotes: string[];
  baseNotes: string[];
  seasons: Season[];
  occasions: Occasion[];
  weather: Weather[];
  timeOfDay: TimeOfDay[];
  vibes: Vibe[];
  longevity: Strength;
  sillage: Strength;
  intensity: Strength;
  performance?: Performance;
  gender?: "Masculine" | "Feminine" | "Unisex";
  perfumer?: string;
  similar?: string[];
  image?: string;
  source?: string;
  custom?: boolean;
}

export interface PersonalRating {
  overall?: number;
  smell?: number;
  longevity?: number;
  sillage?: number;
  versatility?: number;
  compliments?: number;
}

/** A fragrance that lives in the user's collection (catalogue entry + personal data). */
/** User's physical bottle metadata (per collection item, not per fragrance). */
export interface BottleInfo {
  sizeMl?: number;
  kind?: "Full bottle" | "Decant" | "Sample";
  purchaseDate?: string;
  price?: number;
  retailer?: string;
  opened?: boolean;
  /** Key of the photo stored in IndexedDB (never the image bytes themselves). */
  photoId?: string;
}

/** Last successful weather response, kept locally for offline recommendations. */
export interface WeatherCache {
  latitude: number;
  longitude: number;
  locationName?: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  code: number;
  isDay: boolean;
  description: string;
  /** ISO timestamp of the fetch. */
  updatedAt: string;
}

export interface CollectionItem {
  fragrance: Fragrance;
  addedAt: string;
  rating?: PersonalRating;
  notes?: string;
  bottle?: BottleInfo;
}

export interface WishlistItem {
  fragrance: Fragrance;
  addedAt: string;
}

export interface WearEntry {
  id: string;
  fragranceId: string;
  fragranceName: string;
  brand: string;
  date: string;
  activity?: string;
  temperature?: number;
  condition?: string;
  humidity?: number;
  notes?: string;
}

export interface Settings {
  locationName?: string;
  latitude?: number;
  longitude?: number;
  units?: "metric";
  /** False until the first-run onboarding wizard completes. */
  onboarded?: boolean;
}

export interface SillageData {
  version: number;
  collection: CollectionItem[];
  wishlist: WishlistItem[];
  wears: WearEntry[];
  settings: Settings;
  weather?: WeatherCache;
}
