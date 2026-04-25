import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import type { CashflowPoint } from "@workspace/api-client-react";
import { computeForecast } from "../insights";
import { formatCompactCurrency, formatCurrency } from "../format";

interface Props {
  data: CashflowPoint[] | undefined;
  loading: boolean;
}

export function ForecastChart({ data, loading }: Props) {
  const series = useMemo(() => computeForecast(data ?? [], 3), [data]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Previsão de Saldo</CardTitle>
            <CardDescription>Projeção linear para os próximos 3 meses</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider shrink-0">
            Estimativa
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <Skeleton className="h-[260px] w-full" />
        ) : series.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            Sem dados suficientes para projeção
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="month"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const item = series.find((s) => s.month === payload.value);
                    return (
                      <text
                        x={x}
                        y={y + 12}
                        textAnchor="middle"
                        fontSize={11}
                        className={item?.isForecast ? "fill-muted-foreground italic" : "fill-foreground"}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                  width={60}
                />
                <RechartsTooltip
                  formatter={(v: number, _name, item) => {
                    const isForecast = (item?.payload as { isForecast?: boolean })?.isForecast;
                    return [`${formatCurrency(v)}${isForecast ? " (previsto)" : ""}`, "Saldo"];
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={(props) => {
                    const { cx, cy, payload, key } = props as {
                      cx: number;
                      cy: number;
                      payload: { isForecast: boolean };
                      key: string;
                    };
                    return (
                      <circle
                        key={key}
                        cx={cx}
                        cy={cy}
                        r={3.5}
                        fill={payload.isForecast ? "transparent" : "hsl(var(--primary))"}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        strokeDasharray={payload.isForecast ? "2 2" : undefined}
                      />
                    );
                  }}
                  strokeDasharray={undefined}
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
