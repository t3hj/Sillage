// Prepares the static build output for GitHub Pages.
// - Adds .nojekyll so Pages serves underscore-prefixed asset dirs as-is.
// - Copies index.html to 404.html so client-side routes not prerendered
//   (e.g. unknown paths) still resolve to the SPA shell.
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "dist/client";
if (!existsSync(join(out, "index.html"))) {
  console.error("No prerendered build found in dist/client — run the pages build first.");
  process.exit(1);
}
writeFileSync(join(out, ".nojekyll"), "");
copyFileSync(join(out, "index.html"), join(out, "404.html"));
console.log("GitHub Pages output prepared in dist/client");
