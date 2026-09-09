import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Compass, Heart, Home, Settings as Cog, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Today", icon: Home },
  { to: "/collection", label: "Collection", icon: Sparkles },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/journal", label: "Journal", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Cog },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span
              className="text-2xl font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sillage
            </span>
          </Link>
          <nav className="ml-auto hidden gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-16">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl justify-between px-2 py-1.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
