import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info } from "lucide-react";
import type { CashflowPoint } from "@workspace/api-client-react";

interface Props {
  data: CashflowPoint[] | undefined;
  loading: boolean;
}

export function FinancialPressureChart({ data, loading }: Props) {
  const computed = (data ?? []).map((d) => {
    const total = d.income + d.expense;
    const pressure = total > 0 ? (Math.max(0, d.expense - d.income) / Math.max(d.expense, 1)) * 100 : 0;
    return { month: d.month, pressure: Number(pressure.toFixed(1)) };
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Pressão Financeira</CardTitle>
            <CardDescription>Tendência de déficit mensal</CardDescription>
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 mt-1" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[260px] text-xs">
                Percentual de déficit em relação à despesa do mês. Quanto maior, mais a despesa supera a receita —
                indicador proxy de pressão sobre o caixa e de risco de inadimplência.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : computed.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados no período selecionado
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={computed} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={40}
                  domain={[0, "auto"]}
                />
                <RechartsTooltip
                  formatter={(v: number) => [`${v}%`, "Pressão"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={20} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="pressure"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "hsl(var(--destructive))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
