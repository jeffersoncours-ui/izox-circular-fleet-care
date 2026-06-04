import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  crumbs?: string[];
  title: React.ReactNode;
  sub?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ crumbs, title, sub, right, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-end justify-between px-7 py-5 border-b border-border bg-background gap-4 flex-wrap",
        className
      )}
    >
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <div className="flex items-center gap-1.5 mb-1.5">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/25">
                    /
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider",
                    i === crumbs.length - 1 ? "text-foreground/55" : "text-foreground/35"
                  )}
                >
                  {c}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-foreground leading-tight">
          {title}
        </h1>
        {sub && <p className="text-[13px] text-muted-foreground mt-1">{sub}</p>}
      </div>
      {right && (
        <div className="flex items-center gap-2.5 shrink-0">{right}</div>
      )}
    </div>
  );
}

// Stat KPI tile — large Outfit number + label + sub
interface StatTileProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
  suffix?: string;
  className?: string;
}

export function StatTile({ label, value, sub, accent, icon, suffix, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg px-5 py-4 flex flex-col gap-2.5 shadow-card min-w-0",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        {icon && (
          <span className="text-muted-foreground/60">{icon}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 font-bold leading-none" style={{ fontFamily: "var(--font-display)" }}>
        <span
          className="text-[34px] tracking-[-0.5px]"
          style={{ color: accent ?? "var(--color-foreground)" }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-base text-muted-foreground font-semibold">{suffix}</span>
        )}
      </div>
      {sub && (
        <p className="text-[12px] text-muted-foreground leading-snug">{sub}</p>
      )}
    </div>
  );
}
