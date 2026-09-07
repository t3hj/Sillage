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
export interface CollectionItem {
  fragrance: Fragrance;
  addedAt: string;
  rating?: PersonalRating;
  notes?: string;
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
}

export interface SillageData {
  version: number;
  collection: CollectionItem[];
  wishlist: WishlistItem[];
  wears: WearEntry[];
  settings: Settings;
}
