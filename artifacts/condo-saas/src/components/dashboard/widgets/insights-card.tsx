import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import type { Insight, InsightSeverity } from "../insights";
import { cn } from "@/lib/utils";

interface Props {
  insights: Insight[];
  loading: boolean;
}

const SEVERITY_STYLE: Record<InsightSeverity, { icon: typeof Info; bg: string; text: string; border: string }> = {
  critical: { icon: AlertTriangle, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
  warning: { icon: AlertCircle, bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  info: { icon: Info, bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", border: "border-sky-500/30" },
  positive: { icon: CheckCircle2, bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
};

export function InsightsCard({ insights, loading }: Props) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Insights do Sistema
        </CardTitle>
        <CardDescription>Análises automáticas dos seus dados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : (
          insights.slice(0, 5).map((ins) => {
            const st = SEVERITY_STYLE[ins.severity];
            const Icon = st.icon;
            return (
              <div
                key={ins.id}
                className={cn("flex gap-2.5 p-2.5 rounded-lg border", st.border, st.bg)}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", st.text)} />
                <div className="min-w-0">
                  <div className={cn("text-sm font-semibold", st.text)}>{ins.title}</div>
                  <div className="text-xs text-foreground/80 leading-snug mt-0.5">{ins.description}</div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
