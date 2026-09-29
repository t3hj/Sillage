// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Two build targets:
 * - Default: the existing Cloudflare SSR target used by Lovable previews.
 * - GitHub Pages: when running in CI (the Pages workflow sets CI=true), build a
 *   fully static site under the /Sillage/ base path.
 */
const githubPages = !!process.env.CI;

export default defineConfig({
  vite: githubPages
    ? {
        base: "/Sillage/",
      }
    : undefined,
  nitro: githubPages
    ? {
        preset: "static",
      }
    : undefined,
  tanstackStart: githubPages
    ? {
        prerender: {
          enabled: true,
          autoStaticPathsDiscovery: true,
          crawlLinks: true,
        },
      }
    : {
        server: { entry: "server" },
      },
});
