import { Link } from "@tanstack/react-router";
import type { Fragrance } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function FragranceCard({
  fragrance,
  footer,
  subtitle,
  className,
}: {
  fragrance: Fragrance;
  footer?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link to="/fragrance/$id" params={{ id: fragrance.id }} className="block">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{fragrance.brand}</p>
        <h3
          className="mt-1 text-lg font-semibold leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {fragrance.name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {[fragrance.concentration, fragrance.family, fragrance.year].filter(Boolean).join(" · ")}
        </p>
        {subtitle ? <div className="mt-2 text-sm">{subtitle}</div> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {fragrance.vibes.slice(0, 3).map((v) => (
            <Badge key={v} variant="secondary" className="rounded-full font-normal">
              {v}
            </Badge>
          ))}
          {fragrance.seasons.slice(0, 2).map((s) => (
            <Badge key={s} variant="outline" className="rounded-full font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </Link>
      {footer ? <div className="mt-3 flex flex-wrap gap-2">{footer}</div> : null}
    </div>
  );
}
