// Imports the Scento open dataset (CC BY 4.0) into catalogue/imported + catalogue/notes.
//
//   node scripts/import-scento.mjs              # downloads the latest snapshot from GitHub
//   node scripts/import-scento.mjs --src ./dir  # or read a local clone of Scento-com/perfume-dataset
//
// Entries that duplicate a hand-written entry in catalogue/data (same id, or same
// brand + name) are skipped — the hand-written one wins. Output is deterministic,
// so re-running on an unchanged snapshot produces no diff.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCatalogueFiles, DATA_DIR } from "./catalogue-lib.mjs";
import { mapConcentration, mapMaterial, mapPerfume, normalise, parseCsv } from "./scento-map.mjs";

const RAW = "https://raw.githubusercontent.com/Scento-com/perfume-dataset/main";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "catalogue");
const srcFlag = process.argv.indexOf("--src");
const src = srcFlag > -1 ? process.argv[srcFlag + 1] : null;

async function read(file) {
  if (src) return readFileSync(join(src, file), "utf8");
  const res = await fetch(`${RAW}/${file}`);
  if (!res.ok) throw new Error(`Could not download ${file}: HTTP ${res.status}`);
  return res.text();
}

const perfumeRows = (await read("perfumes.jsonl"))
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
const materialRows = parseCsv(await read("materials.csv"));
const readme = await read("README.md");
const snapshotDate = /snapshot \(([^)]+)\)/.exec(readme)?.[1] ?? "unknown";

const hand = loadCatalogueFiles(DATA_DIR).map((i) => i.entry);
const handIds = new Set(hand.map((f) => f.id));
// Same perfume under a different name; matching by name alone would be too loose.
const KNOWN_DUPLICATES = new Set(["hugo-boss-boss-bottled"]);
// Same perfume = same brand (allowing "Maison Margiela" ~ "Maison Margiela Fragrances")
// and same name, and the same concentration whenever both sides state one.
const sameBrand = (a, b) =>
  a === b || (Math.min(a.length, b.length) > 3 && (a.includes(b) || b.includes(a)));
const isHandWritten = (r) => {
  if (handIds.has(r.id) || KNOWN_DUPLICATES.has(r.id)) return true;
  const brand = normalise(r.house);
  const name = normalise(r.name);
  const conc = mapConcentration(r.concentration);
  return hand.some(
    (h) =>
      normalise(h.name) === name &&
      sameBrand(normalise(h.brand), brand) &&
      (!conc || !h.concentration || conc === h.concentration),
  );
};

const skipped = [];
const fragrances = [];
for (const row of perfumeRows) {
  if (isHandWritten(row)) skipped.push(row.id);
  else fragrances.push(mapPerfume(row));
}
fragrances.sort((a, b) => a.id.localeCompare(b.id));
const notes = materialRows.map(mapMaterial).sort((a, b) => a.name.localeCompare(b.name));

const lines = (xs) => "[\n" + xs.map((x) => JSON.stringify(x)).join(",\n") + "\n]\n";
mkdirSync(join(root, "imported"), { recursive: true });
mkdirSync(join(root, "notes"), { recursive: true });
writeFileSync(join(root, "imported", "scento.json"), lines(fragrances));
writeFileSync(join(root, "notes", "scento-notes.json"), lines(notes));
writeFileSync(
  join(root, "imported", "_scento-snapshot.json"),
  JSON.stringify(
    {
      source: "Scento Perfume Database",
      url: "https://www.scento.com/perfume-database",
      license: "CC BY 4.0",
      snapshotDate,
      imported: fragrances.length,
      skippedAsHandWritten: skipped,
      notes: notes.length,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Scento snapshot ${snapshotDate}: ${fragrances.length} imported, ${skipped.length} skipped (hand-written), ${notes.length} notes`,
);
