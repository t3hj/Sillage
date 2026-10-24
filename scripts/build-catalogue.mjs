// Builds the publishable catalogue: public/catalogue/{catalogue,meta}.json
//
//   catalogue.json — the full merged catalogue the app downloads at runtime
//   meta.json      — tiny version file the app polls to see if an update exists
//
// The same JSON sources are also bundled into the app, so it works offline and
// on first launch. Publishing these two files (GitHub Pages) is what lets new
// releases reach installed apps without shipping a new app version.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllCatalogueFiles, validateCatalogue } from "./catalogue-lib.mjs";

const items = loadAllCatalogueFiles();
const errors = validateCatalogue(items);
if (errors.length) {
  console.error(
    `Catalogue has ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join("\n"),
  );
  process.exit(1);
}

const fragrances = items.map((i) => i.entry).sort((a, b) => a.id.localeCompare(b.id));
const version = createHash("sha1").update(JSON.stringify(fragrances)).digest("hex").slice(0, 12);
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "catalogue");
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, "catalogue.json"),
  JSON.stringify({ version, count: fragrances.length, fragrances }),
);
writeFileSync(join(out, "meta.json"), JSON.stringify({ version, count: fragrances.length }));
console.log(`Catalogue ${version}: ${fragrances.length} fragrances → public/catalogue/`);
