import React from "react";
import { 
  useGetDashboardSummary, 
  useGetCashflow, 
  useGetDelinquencyRanking,
  useGetRecentActivity,
  useGetAlerts
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  AlertTriangle, 
  Calendar,
  Package,
  Activity,
  HeartPulse
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: cashflow, isLoading: loadingCashflow } = useGetCashflow({ months: 6 });
  const { data: delinquency, isLoading: loadingDelinquency } = useGetDelinquencyRanking();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity();
  const { data: alerts, isLoading: loadingAlerts } = useGetAlerts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu condomínio.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.totalUnits || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.totalResidents || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.balance || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-destructive">
                {summary?.delinquencyRate ? `${summary.delinquencyRate.toFixed(1)}%` : '0%'}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.delinquentCount || 0} unidades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saúde Geral</CardTitle>
            <HeartPulse className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold text-primary">
                {summary?.healthScore ? `${summary.healthScore.toFixed(0)}/100` : '-'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Cashflow Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Fluxo de Caixa (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="pl-0">
            {loadingCashflow ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full ml-6 rounded-lg" />
              </div>
            ) : (
              <div className="h-[300px]">
                {cashflow && cashflow.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashflow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `R$ ${value / 1000}k`}
                      />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <RechartsTooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: 'black' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="hsl(var(--chart-3))" 
                        fillOpacity={1} 
                        fill="url(#colorIncome)" 
                        name="Receitas"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stroke="hsl(var(--destructive))" 
                        fillOpacity={1} 
                        fill="url(#colorExpense)" 
                        name="Despesas"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados suficientes
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts & Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Alertas e Atenção</CardTitle>
            <CardDescription>Itens que precisam da sua atenção imediata.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : alerts && alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex gap-4 items-start p-3 rounded-lg border bg-card">
                    <div className={`p-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' :
                      alert.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-primary/10 text-primary'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{alert.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                Nenhum alerta no momento. Tudo em ordem!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}