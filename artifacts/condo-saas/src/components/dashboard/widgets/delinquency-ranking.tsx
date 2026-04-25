import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingDown, ChevronRight } from "lucide-react";
import type { DelinquencyEntry } from "@workspace/api-client-react";
import { formatCurrency } from "../format";

interface Props {
  data: DelinquencyEntry[] | undefined;
  loading: boolean;
}

export function DelinquencyRankingCard({ data, loading }: Props) {
  const top = (data ?? []).slice(0, 5);
  const max = Math.max(1, ...top.map((d) => d.overdueAmount));

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Top 5 Inadimplência
            </CardTitle>
            <CardDescription>Unidades com maiores débitos em aberto</CardDescription>
          </div>
          <Link href="/financeiro">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Ver todos
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma unidade inadimplente. 🎉
          </div>
        ) : (
          <ol className="space-y-2.5">
            {top.map((d, i) => {
              const pct = (d.overdueAmount / max) * 100;
              return (
                <li key={d.unitId} className="group">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-destructive/10 text-destructive text-xs font-bold tabular-nums shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {d.unitLabel}
                          {d.residentName && (
                            <span className="text-muted-foreground font-normal"> · {d.residentName}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.overdueCount} cobrança{d.overdueCount === 1 ? "" : "s"} em atraso
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-destructive tabular-nums shrink-0">
                      {formatCurrency(d.overdueAmount)}
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive/70 group-hover:bg-destructive transition-colors rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
