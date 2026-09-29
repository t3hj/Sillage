// Dedicated Vite config for GitHub Pages static builds.
//
// The shared config (vite.config.ts) targets a standard TanStack Start SSR
// build; this one builds the same app in static prerender mode, which produces
// a fully static site in .output/public.
//
// Usage: npm run build:pages
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/Sillage/",
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: true,
      },
    }),
    viteReact(),
  ],
});
