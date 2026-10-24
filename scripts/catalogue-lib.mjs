// Shared catalogue logic: loading the JSON source files and validating them.
// Used by scripts/build-catalogue.mjs (CI/build) and tests/catalogue.test.ts.
// Runs under plain Node: categories.ts is erasable TypeScript, so it can be
// imported directly (Node >= 22.6 type stripping, or Vite/Vitest).
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONCENTRATIONS,
  FAMILIES,
  OCCASIONS,
  PERFORMANCES,
  SEASONS,
  STRENGTHS,
  TIMES,
  VIBES,
  WEATHERS,
} from "../src/data/categories.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(here, "..", "catalogue", "data");
export const IMPORTED_DIR = join(here, "..", "catalogue", "imported");

const GENDERS = ["Masculine", "Feminine", "Unisex"];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Read every JSON file in a catalogue directory (sorted; files starting with "_" are metadata). */
export function loadCatalogueFiles(dir = DATA_DIR) {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort();
  const entries = [];
  for (const file of files) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${file}: top level must be an array`);
    for (const e of parsed) entries.push({ file, entry: e });
  }
  return entries;
}

/** Hand-written entries plus every generated import, in one list. */
export function loadAllCatalogueFiles() {
  return [...loadCatalogueFiles(DATA_DIR), ...loadCatalogueFiles(IMPORTED_DIR)];
}

const isStringList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
const subsetOf = (values, allowed) =>
  Array.isArray(values) && values.every((v) => allowed.includes(v));

/** Returns a list of human-readable problems; empty means the catalogue is valid. */
export function validateCatalogue(items, { maxYear = new Date().getFullYear() + 1 } = {}) {
  const errors = [];
  const ids = new Set();
  for (const { file, entry: f } of items) {
    const where = `${file}:${f?.id ?? "<no id>"}`;
    const bad = (msg) => errors.push(`${where} — ${msg}`);
    if (typeof f?.id !== "string" || !ID_RE.test(f.id)) bad("id must be lowercase kebab-case");
    else if (ids.has(f.id)) bad("duplicate id");
    else ids.add(f.id);
    if (!f?.name || typeof f.name !== "string") bad("missing name");
    if (!f?.brand || typeof f.brand !== "string") bad("missing brand");
    if (f?.year !== undefined && !(Number.isInteger(f.year) && f.year >= 1700 && f.year <= maxYear))
      bad(`implausible year ${f.year}`);
    for (const k of ["topNotes", "middleNotes", "baseNotes"])
      if (!Array.isArray(f?.[k]) || !f[k].every((n) => typeof n === "string" && n.trim()))
        bad(`${k} must be an array of non-empty strings`);
    if (!subsetOf(f?.seasons, SEASONS)) bad("invalid seasons");
    if (!subsetOf(f?.weather, WEATHERS)) bad("invalid weather");
    if (!subsetOf(f?.occasions, OCCASIONS)) bad("invalid occasions");
    if (!subsetOf(f?.timeOfDay, TIMES)) bad("invalid timeOfDay");
    if (!subsetOf(f?.vibes, VIBES)) bad("invalid vibes");
    for (const k of ["longevity", "sillage", "intensity"])
      if (!STRENGTHS.includes(f?.[k])) bad(`invalid ${k}`);
    if (f?.performance !== undefined && !PERFORMANCES.includes(f.performance))
      bad("invalid performance");
    if (f?.popularity !== undefined && !(Number.isInteger(f.popularity) && f.popularity > 0))
      bad("popularity must be a positive integer");
    if (f?.estimated !== undefined && !isStringList(f.estimated))
      bad("estimated must be a string list");
    if (f?.source !== undefined && typeof f.source !== "string") bad("source must be a string");
    if (f?.sourceUrl !== undefined && !/^https:\/\//.test(f.sourceUrl))
      bad("sourceUrl must be https");
    if (f?.gender !== undefined && !GENDERS.includes(f.gender)) bad("invalid gender");
    if (f?.family !== undefined && !FAMILIES.includes(f.family)) bad(`unknown family ${f.family}`);
    if (f?.concentration !== undefined && !CONCENTRATIONS.includes(f.concentration))
      bad(`unknown concentration ${f.concentration}`);
  }
  for (const { file, entry: f } of items)
    for (const s of f?.similar ?? [])
      if (!ids.has(s)) errors.push(`${file}:${f.id} — similar → unknown id "${s}"`);
  return errors;
}
