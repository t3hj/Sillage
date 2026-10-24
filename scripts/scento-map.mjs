// Maps rows from the Scento open dataset (CC BY 4.0, https://www.scento.com/perfume-database)
// onto Sillage's Fragrance shape. Pure functions only, so they are unit-tested.
//
// Scento supplies: name, house, concentration, family, character, seasons,
// times of day, note pyramid, a description it wrote itself, popularity rank.
// Sillage additionally wants occasions, weather and strength ratings. Scento
// has no such fields, so they are ESTIMATED from the data it does have, and the
// entry lists them in `estimated` so the app can label them honestly.
// Gender is not provided by Scento and is left empty rather than guessed.

const FAMILY_MAP = {
  "Wood & Root": "Woody",
  "White Bloom": "Floral",
  "Petal Garden": "Floral",
  "Green Leaf": "Aromatic",
  "Velvet Sweet": "Gourmand",
  "Spice Route": "Oriental",
  "Sunlit Citrus": "Citrus",
  "Orchard Fruit": "Fruity",
  "Amber & Resin": "Amber",
  "Powder Veil": "Floral",
  "Skin Musk": "Musk",
  "Smoke & Leather": "Leather",
  "Oud Court": "Oriental",
  "Salt & Mineral": "Aquatic",
};

const CONCENTRATION_MAP = {
  "eau-de-cologne": "Eau de Cologne",
  "eau-de-toilette": "Eau de Toilette",
  "eau-de-parfum": "Eau de Parfum",
  parfum: "Parfum",
  extrait: "Extrait de Parfum",
  elixir: "Elixir",
};

const VIBE_MAP = {
  fresh: "Fresh",
  green: "Fresh",
  herbal: "Fresh",
  salty: "Fresh",
  clean: "Clean",
  citrusy: "Citrus",
  sweet: "Sweet",
  creamy: "Sweet",
  fruity: "Playful",
  woody: "Woody",
  earthy: "Woody",
  spicy: "Spicy",
  smoky: "Dark",
  leathery: "Dark",
  resinous: "Dark",
  amber: "Sexy",
  warm: "Sexy",
  musky: "Sexy",
  powdery: "Elegant",
  floral: "Elegant",
  rich: "Elegant",
};

const TIME_MAP = { day: ["Morning", "Day"], evening: ["Evening"], night: ["Night"] };
const STRENGTHS = ["Light", "Moderate", "Strong", "Very Strong"];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = (xs) => [...new Set(xs)];
const list = (v) =>
  Array.isArray(v)
    ? v.map((x) => String(x).trim()).filter(Boolean)
    : String(v ?? "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
const step = (strength, by) =>
  STRENGTHS[Math.min(STRENGTHS.length - 1, Math.max(0, STRENGTHS.indexOf(strength) + by))];

export const normalise = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** Strength estimate from concentration, nudged by character. Always flagged as estimated. */
export function estimateStrength(concentration, character, family) {
  const base = {
    "Eau de Cologne": ["Light", "Light", "Light"],
    "Eau de Toilette": ["Moderate", "Moderate", "Moderate"],
    "Eau de Parfum": ["Strong", "Moderate", "Strong"],
    Parfum: ["Very Strong", "Strong", "Very Strong"],
    "Extrait de Parfum": ["Very Strong", "Strong", "Very Strong"],
    Elixir: ["Very Strong", "Strong", "Very Strong"],
  }[concentration] ?? ["Moderate", "Moderate", "Moderate"];
  let [longevity, sillage, intensity] = base;
  const heavy = character.some((c) => ["resinous", "smoky", "rich", "amber"].includes(c));
  if (heavy) sillage = step(sillage, 1);
  if (family === "Sunlit Citrus") longevity = step(longevity, -1);
  return { longevity, sillage, intensity };
}

export function estimateWeather(seasons, character) {
  const has = (...cs) => cs.some((c) => character.includes(c));
  const out = [];
  if (seasons.includes("Summer")) {
    out.push("Warm");
    if (has("fresh", "citrusy", "salty", "green") && !has("resinous", "rich", "smoky"))
      out.push("Hot");
  }
  if (seasons.includes("Spring")) out.push("Mild");
  if (seasons.includes("Autumn")) out.push("Cool");
  if (seasons.includes("Winter")) out.push("Cold");
  if (
    has("earthy", "green", "herbal") &&
    (seasons.includes("Autumn") || seasons.includes("Spring"))
  )
    out.push("Rainy");
  return out.length ? unique(out) : ["Mild"];
}

export function estimateOccasions(character, times, concentration) {
  const has = (...cs) => cs.some((c) => character.includes(c));
  const light = !["Parfum", "Extrait de Parfum", "Elixir"].includes(concentration);
  const day = times.includes("day");
  const evening = times.includes("evening");
  const night = times.includes("night");
  const out = [];
  if (day) out.push("Casual");
  if (day && light && has("fresh", "clean", "citrusy", "green", "herbal", "powdery"))
    out.push("Work");
  if (day && has("fresh", "clean", "citrusy", "green")) out.push("University");
  if (light && has("fresh", "citrusy", "clean", "salty") && concentration !== "Eau de Parfum")
    out.push("Gym");
  if (has("citrusy", "green", "herbal", "salty", "earthy")) out.push("Outdoor");
  if (has("floral", "sweet", "musky", "fruity", "creamy")) out.push("Date");
  if (evening) out.push("Evening");
  if (evening && has("sweet", "warm", "amber", "spicy", "musky", "resinous", "creamy", "rich"))
    out.push("Date Night");
  if (night || (evening && has("resinous", "smoky", "spicy", "amber", "leathery", "rich")))
    out.push("Night Out");
  if (!light || (evening && has("powdery", "rich", "resinous"))) out.push("Formal");
  if (has("creamy", "musky", "powdery", "sweet")) out.push("Home");
  return out.length ? unique(out) : ["Casual"];
}

export const mapConcentration = (slug) => CONCENTRATION_MAP[slug] ?? undefined;

/** Map one Scento perfume row (JSONL object) to a Sillage Fragrance. */
export function mapPerfume(row) {
  const character = list(row.character);
  const concentration = CONCENTRATION_MAP[row.concentration] ?? undefined;
  const seasons = unique(list(row.seasons).map(cap));
  const times = list(row.times_of_day);
  const top = list(row.top_notes);
  const heart = list(row.heart_notes);
  const base = list(row.base_notes);
  const flat = list(row.notes);
  const hasPyramid = top.length + heart.length + base.length > 0;
  const family = FAMILY_MAP[row.family];
  const secondary = FAMILY_MAP[row.secondary_family];
  const vibes = unique(character.map((c) => VIBE_MAP[c]).filter(Boolean)).slice(0, 4);
  const strength = estimateStrength(concentration, character, row.family);
  const perfumers = list(row.perfumers);
  const popularity = Number.parseInt(row.popularity_rank, 10);
  const year = Number.parseInt(row.year, 10);

  return {
    id: row.id,
    name: row.name,
    brand: row.house,
    ...(Number.isInteger(year) ? { year } : {}),
    ...(row.description ? { description: row.description } : {}),
    ...(concentration ? { concentration } : {}),
    ...(family ? { family } : {}),
    ...(secondary && secondary !== family ? { subfamily: secondary } : {}),
    topNotes: top,
    // Some rows list notes without a pyramid; they go under heart rather than being dropped.
    middleNotes: hasPyramid ? heart : flat,
    baseNotes: base,
    seasons,
    occasions: estimateOccasions(character, times, concentration),
    weather: estimateWeather(seasons, character),
    timeOfDay: unique(times.flatMap((t) => TIME_MAP[t] ?? [])),
    vibes,
    ...strength,
    ...(perfumers.length ? { perfumer: perfumers.join(", ") } : {}),
    source: "Scento",
    ...(row.url ? { sourceUrl: row.url } : {}),
    ...(Number.isInteger(popularity) ? { popularity } : {}),
    estimated: ["occasions", "weather", "longevity", "sillage", "intensity"],
  };
}

/** Map one Scento materials row to a note-info record. */
export function mapMaterial(row) {
  return {
    name: row.name,
    ...(row.aliases ? { aliases: list(row.aliases) } : {}),
    ...(row.material_family ? { family: row.material_family } : {}),
    ...(row.origin ? { origin: row.origin } : {}),
    ...(row.smell ? { smell: row.smell } : {}),
  };
}

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') ((field += '"'), i++);
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") (row.push(field), (field = ""));
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) (row.push(field), rows.push(row));
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}
