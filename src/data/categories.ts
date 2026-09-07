export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"] as const;
export type Season = (typeof SEASONS)[number];

export const WEATHERS = [
  "Hot",
  "Warm",
  "Mild",
  "Cool",
  "Cold",
  "Rainy",
  "Humid",
  "Dry",
] as const;
export type Weather = (typeof WEATHERS)[number];

export const OCCASIONS = [
  "University",
  "Work",
  "Gym",
  "Casual",
  "Date",
  "Date Night",
  "Night Out",
  "Formal",
  "Home",
  "Outdoor",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const TIMES = ["Morning", "Day", "Evening", "Night"] as const;
export type TimeOfDay = (typeof TIMES)[number];

export const VIBES = [
  "Fresh",
  "Clean",
  "Sweet",
  "Citrus",
  "Woody",
  "Spicy",
  "Dark",
  "Elegant",
  "Sexy",
  "Professional",
  "Relaxed",
  "Playful",
] as const;
export type Vibe = (typeof VIBES)[number];

export const PERFORMANCES = ["Office Safe", "Moderate", "Strong", "Beast Mode"] as const;
export type Performance = (typeof PERFORMANCES)[number];

export const ACTIVITIES = [
  "Casual",
  "University",
  "Work",
  "Gym",
  "Date",
  "Date Night",
  "Evening",
  "Formal",
  "Home",
  "Night Out",
  "Outdoor",
] as const;
export type Activity = (typeof ACTIVITIES)[number];

export const CONCENTRATIONS = [
  "Eau Fraiche",
  "Eau de Cologne",
  "Eau de Toilette",
  "Eau de Parfum",
  "Parfum",
  "Extrait de Parfum",
] as const;

export const FAMILIES = [
  "Fresh",
  "Citrus",
  "Aromatic",
  "Floral",
  "Woody",
  "Oriental",
  "Amber",
  "Gourmand",
  "Chypre",
  "Fougère",
  "Leather",
  "Aquatic",
] as const;

export const STRENGTHS = ["Light", "Moderate", "Strong", "Very Strong"] as const;
export type Strength = (typeof STRENGTHS)[number];
