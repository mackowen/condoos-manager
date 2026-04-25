import { type ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUpRight, ArrowDownRight, Minus, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  value: ReactNode;
  hint?: ReactNode;
  delta?: { trend: "up" | "down" | "flat"; label: string };
  positiveIsGood?: boolean;
  tooltip?: string;
  loading?: boolean;
  href?: string;
  tone?: "default" | "primary" | "danger" | "success" | "warning";
}

const TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-border",
  primary: "border-primary/30 bg-primary/5",
  danger: "border-destructive/30 bg-destructive/5",
  success: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
};

const ICON_TONE_CLASSES: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-muted-foreground bg-muted",
  primary: "text-primary bg-primary/10",
  danger: "text-destructive bg-destructive/10",
  success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
};

export function KpiCard({
  title,
  icon: Icon,
  value,
  hint,
  delta,
  positiveIsGood = true,
  tooltip,
  loading = false,
  href,
  tone = "default",
}: Props) {
  const deltaColor = delta
    ? delta.trend === "flat"
      ? "text-muted-foreground"
      : (delta.trend === "up") === positiveIsGood
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-destructive"
    : "";

  const DeltaIcon = delta
    ? delta.trend === "up"
      ? ArrowUpRight
      : delta.trend === "down"
        ? ArrowDownRight
        : Minus
    : null;

  const inner = (
    <Card
      className={cn(
        "transition-all hover:shadow-md hover:-translate-y-0.5",
        TONE_CLASSES[tone],
        href && "cursor-pointer",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("p-1.5 rounded-md shrink-0", ICON_TONE_CLASSES[tone])}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-xs font-medium text-muted-foreground truncate">{title}</div>
            {tooltip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="mt-2.5">
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          {loading ? (
            <Skeleton className="h-3.5 w-16" />
          ) : hint ? (
            <div className="text-xs text-muted-foreground truncate">{hint}</div>
          ) : (
            <span />
          )}
          {!loading && delta && DeltaIcon && (
            <div className={cn("flex items-center gap-0.5 text-xs font-medium tabular-nums", deltaColor)}>
              <DeltaIcon className="h-3 w-3" />
              {delta.label}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
