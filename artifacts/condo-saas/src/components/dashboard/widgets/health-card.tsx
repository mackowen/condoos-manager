import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HeartPulse, Activity, AlertTriangle } from "lucide-react";
import type { DashboardSummary } from "@workspace/api-client-react";
import { formatPercent } from "../format";
import { cn } from "@/lib/utils";

interface Props {
  summary: DashboardSummary | undefined;
  loading: boolean;
}

function statusFor(score: number): {
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  bgColor: string;
  description: string;
} {
  if (score >= 75)
    return {
      label: "Saudável",
      emoji: "🟢",
      color: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      description: "Indicadores dentro do esperado. Continue acompanhando.",
    };
  if (score >= 50)
    return {
      label: "Atenção",
      emoji: "🟡",
      color: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-500",
      bgColor: "bg-amber-500/10",
      description: "Há sinais de pressão. Reveja indicadores destacados.",
    };
  return {
    label: "Crítico",
    emoji: "🔴",
    color: "bg-destructive",
    textColor: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "Indicadores críticos. Ação imediata recomendada.",
  };
}

export function HealthCard({ summary, loading }: Props) {
  const score = summary?.healthScore ?? 0;
  const st = statusFor(score);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          Saúde do Condomínio
        </CardTitle>
        <CardDescription>Indicador composto de saúde financeira e operacional</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className={cn("text-4xl font-bold tabular-nums", st.textColor)}>{score.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground">/ 100</div>
              <div className={cn("ml-auto text-sm font-semibold", st.textColor)}>
                {st.emoji} {st.label}
              </div>
            </div>
            <Progress value={score} className="h-2" indicatorClassName={st.color} />
            <p className="text-xs text-muted-foreground leading-relaxed">{st.description}</p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className={cn("rounded-lg p-2.5", st.bgColor)}>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  Inadimplência
                </div>
                <div className={cn("text-lg font-bold mt-1 tabular-nums", st.textColor)}>
                  {formatPercent(summary?.delinquencyRate ?? 0)}
                </div>
              </div>
              <div className="rounded-lg p-2.5 bg-muted">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  Ocorrências
                </div>
                <div className="text-lg font-bold mt-1 tabular-nums">{summary?.openIssues ?? 0}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
