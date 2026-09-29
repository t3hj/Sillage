import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // On GitHub Pages the app is served from /Sillage/; vite's base is injected
    // at build time and ends with "/", which the router does not want.
    ...(import.meta.env.BASE_URL && import.meta.env.BASE_URL !== "/"
      ? { basepath: import.meta.env.BASE_URL.replace(/\/$/, "") }
      : {}),
  });

  return router;
};
