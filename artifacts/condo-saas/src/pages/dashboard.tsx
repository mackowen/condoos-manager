import { useMemo, useState, lazy, Suspense } from "react";
import {
  useGetAlerts,
  useGetCashflow,
  useGetDashboardSummary,
  useGetDelinquencyRanking,
  useGetRecentActivity,
  useListContracts,
  useListResidents,
  getGetAlertsQueryKey,
  getGetCashflowQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetDelinquencyRankingQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";
import {
  AlertTriangle,
  Building,
  CalendarCheck,
  CreditCard,
  Package,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  Clock,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import {
  PERIOD_MONTHS,
  WIDGET_CATALOG,
  type DashboardPeriod,
  type WidgetId,
} from "@/components/dashboard/types";
import { PeriodFilter } from "@/components/dashboard/period-filter";
import { CustomizeMenu } from "@/components/dashboard/customize-menu";
import { SortableWidget } from "@/components/dashboard/sortable-widget";
import { KpiCard } from "@/components/dashboard/widgets/kpi-card";
import { formatCompactCurrency, formatCurrency, formatDelta, formatRelativeTime } from "@/components/dashboard/format";
import { deriveInsights } from "@/components/dashboard/insights";

const CashflowChart = lazy(() => import("@/components/dashboard/widgets/cashflow-chart").then((m) => ({ default: m.CashflowChart })));
const IncomeExpenseChart = lazy(() => import("@/components/dashboard/widgets/income-expense-chart").then((m) => ({ default: m.IncomeExpenseChart })));
const FinancialPressureChart = lazy(() => import("@/components/dashboard/widgets/financial-pressure-chart").then((m) => ({ default: m.FinancialPressureChart })));
const ForecastChart = lazy(() => import("@/components/dashboard/widgets/forecast-chart").then((m) => ({ default: m.ForecastChart })));
const HealthCard = lazy(() => import("@/components/dashboard/widgets/health-card").then((m) => ({ default: m.HealthCard })));
const DelinquencyRankingCard = lazy(() => import("@/components/dashboard/widgets/delinquency-ranking").then((m) => ({ default: m.DelinquencyRankingCard })));
const InsightsCard = lazy(() => import("@/components/dashboard/widgets/insights-card").then((m) => ({ default: m.InsightsCard })));
const AlertsCard = lazy(() => import("@/components/dashboard/widgets/alerts-card").then((m) => ({ default: m.AlertsCard })));
const NoticesWidget = lazy(() => import("@/components/dashboard/widgets/notices-widget").then((m) => ({ default: m.NoticesWidget })));
const IssuesWidget = lazy(() => import("@/components/dashboard/widgets/issues-widget").then((m) => ({ default: m.IssuesWidget })));
const DeliveriesWidget = lazy(() => import("@/components/dashboard/widgets/deliveries-widget").then((m) => ({ default: m.DeliveriesWidget })));
const ReservationsWidget = lazy(() => import("@/components/dashboard/widgets/reservations-widget").then((m) => ({ default: m.ReservationsWidget })));
const ActivityWidget = lazy(() => import("@/components/dashboard/widgets/activity-widget").then((m) => ({ default: m.ActivityWidget })));

const REFETCH_INTERVAL = 60_000;

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("3months");
  const months = PERIOD_MONTHS[period];

  const cashflowMonths = Math.max(months, 6);
  const summaryQ = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
      refetchInterval: REFETCH_INTERVAL,
      staleTime: 30_000,
    },
  });
  const cashflowQ = useGetCashflow(
    { months: cashflowMonths },
    {
      query: {
        queryKey: getGetCashflowQueryKey({ months: cashflowMonths }),
        refetchInterval: REFETCH_INTERVAL,
        staleTime: 30_000,
      },
    },
  );
  const delinquencyQ = useGetDelinquencyRanking({
    query: {
      queryKey: getGetDelinquencyRankingQueryKey(),
      refetchInterval: REFETCH_INTERVAL,
      staleTime: 30_000,
    },
  });
  const activityQ = useGetRecentActivity({
    query: {
      queryKey: getGetRecentActivityQueryKey(),
      refetchInterval: REFETCH_INTERVAL,
      staleTime: 30_000,
    },
  });
  const alertsQ = useGetAlerts({
    query: {
      queryKey: getGetAlertsQueryKey(),
      refetchInterval: REFETCH_INTERVAL,
      staleTime: 30_000,
    },
  });
  const contractsQ = useListContracts();
  const residentsQ = useListResidents();

  const { layout, toggleVisibility, reorder, reset } = useDashboardLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const periodCashflow = useMemo(() => {
    const all = cashflowQ.data ?? [];
    return all.slice(-months);
  }, [cashflowQ.data, months]);

  const summary = summaryQ.data;
  const lastTwo = periodCashflow.length >= 2 ? periodCashflow.slice(-2) : null;
  const incomeDelta = lastTwo ? formatDelta(lastTwo[1].income, lastTwo[0].income) : undefined;
  const expenseDelta = lastTwo ? formatDelta(lastTwo[1].expense, lastTwo[0].expense) : undefined;
  const balanceDelta = lastTwo ? formatDelta(lastTwo[1].balance, lastTwo[0].balance) : undefined;

  const occupiedUnits = useMemo(() => {
    const set = new Set<string>();
    for (const r of residentsQ.data ?? []) {
      if (r.unitId) set.add(r.unitId);
    }
    return set.size;
  }, [residentsQ.data]);

  const occupationPct = summary?.totalUnits ? (occupiedUnits / summary.totalUnits) * 100 : 0;

  const expiringContractsCount = useMemo(() => {
    const now = Date.now();
    const horizon = now + 60 * 24 * 3600 * 1000;
    return (contractsQ.data ?? []).filter((c) => {
      if (c.status !== "active") return false;
      const t = new Date(c.endsOn).getTime();
      return t >= now && t <= horizon;
    }).length;
  }, [contractsQ.data]);

  const insights = useMemo(
    () =>
      deriveInsights({
        cashflow: cashflowQ.data,
        delinquencyRate: summary?.delinquencyRate,
        delinquentCount: summary?.delinquentCount,
        openIssues: summary?.openIssues,
        pendingDeliveries: summary?.pendingDeliveries,
        upcomingReservations: summary?.upcomingReservations,
        forecastNextMonth: summary?.forecastNextMonth,
        expiringContracts: expiringContractsCount,
      }),
    [cashflowQ.data, summary, expiringContractsCount],
  );

  const allQueries = [summaryQ, cashflowQ, delinquencyQ, activityQ, alertsQ, contractsQ, residentsQ];
  const isAnyFetching = allQueries.some((q) => q.isFetching);
  const lastUpdated = Math.max(...allQueries.map((q) => q.dataUpdatedAt || 0));

  const refetchAll = () => {
    summaryQ.refetch();
    cashflowQ.refetch();
    delinquencyQ.refetch();
    activityQ.refetch();
    alertsQ.refetch();
    contractsQ.refetch();
    residentsQ.refetch();
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    reorder(active.id as WidgetId, over.id as WidgetId);
  };

  const visibleWidgets = layout.filter((w) => w.visible);

  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case "cashflow-chart":
        return <CashflowChart data={periodCashflow} loading={cashflowQ.isLoading} />;
      case "health-card":
        return <HealthCard summary={summary} loading={summaryQ.isLoading} />;
      case "income-expense-chart":
        return <IncomeExpenseChart data={periodCashflow} loading={cashflowQ.isLoading} />;
      case "forecast-chart":
        return <ForecastChart data={periodCashflow} loading={cashflowQ.isLoading} />;
      case "financial-pressure":
        return <FinancialPressureChart data={periodCashflow} loading={cashflowQ.isLoading} />;
      case "delinquency-ranking":
        return <DelinquencyRankingCard data={delinquencyQ.data} loading={delinquencyQ.isLoading} />;
      case "insights-card":
        return <InsightsCard insights={insights} loading={summaryQ.isLoading || cashflowQ.isLoading} />;
      case "alerts-card":
        return <AlertsCard alerts={alertsQ.data} loading={alertsQ.isLoading} />;
      case "notices-widget":
        return <NoticesWidget />;
      case "issues-widget":
        return <IssuesWidget />;
      case "deliveries-widget":
        return <DeliveriesWidget />;
      case "reservations-widget":
        return <ReservationsWidget />;
      case "activity-widget":
        return <ActivityWidget data={activityQ.data} loading={activityQ.isLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu condomínio em tempo real.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter value={period} onChange={setPeriod} />
          <CustomizeMenu layout={layout} onToggle={toggleVisibility} onReset={reset} />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={refetchAll}
                  disabled={isAnyFetching}
                >
                  <RefreshCw className={`h-4 w-4 ${isAnyFetching ? "animate-spin" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Atualizado {formatRelativeTime(lastUpdated || undefined)}
                </div>
                <div className="text-muted-foreground mt-0.5">Atualização automática a cada 60s</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* KPI Section */}
      <section aria-label="Indicadores principais">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
          <KpiCard
            title="Saldo atual"
            icon={Wallet}
            value={formatCompactCurrency(summary?.balance ?? 0)}
            hint={summary?.balance !== undefined ? formatCurrency(summary.balance) : undefined}
            delta={balanceDelta}
            tone={summary && summary.balance < 0 ? "danger" : "primary"}
            tooltip="Saldo do mês atual: receitas menos despesas."
            loading={summaryQ.isLoading}
            href="/financeiro"
          />
          <KpiCard
            title="Receita do mês"
            icon={TrendingUp}
            value={formatCompactCurrency(summary?.totalIncomeMonth ?? 0)}
            hint={summary?.totalIncomeMonth !== undefined ? formatCurrency(summary.totalIncomeMonth) : undefined}
            delta={incomeDelta}
            tone="success"
            tooltip="Soma de cobranças recebidas no mês corrente."
            loading={summaryQ.isLoading}
            href="/financeiro"
          />
          <KpiCard
            title="Despesa do mês"
            icon={TrendingDown}
            value={formatCompactCurrency(summary?.totalExpenseMonth ?? 0)}
            hint={summary?.totalExpenseMonth !== undefined ? formatCurrency(summary.totalExpenseMonth) : undefined}
            delta={expenseDelta}
            positiveIsGood={false}
            tone="danger"
            tooltip="Despesas registradas no mês corrente."
            loading={summaryQ.isLoading}
            href="/financeiro"
          />
          <KpiCard
            title="Inadimplência"
            icon={Percent}
            value={`${(summary?.delinquencyRate ?? 0).toFixed(1)}%`}
            hint={`${summary?.delinquentCount ?? 0} unidades`}
            tone={summary && summary.delinquencyRate >= 20 ? "danger" : summary && summary.delinquencyRate >= 10 ? "warning" : "default"}
            tooltip="Percentual de unidades com cobranças vencidas em aberto."
            loading={summaryQ.isLoading}
            href="/financeiro"
          />
          <KpiCard
            title="Unidades"
            icon={Building}
            value={summary?.totalUnits ?? 0}
            hint={`${summary?.totalResidents ?? 0} moradores`}
            loading={summaryQ.isLoading}
            href="/unidades"
          />
          <KpiCard
            title="Ocupação"
            icon={Users}
            value={`${occupationPct.toFixed(0)}%`}
            hint={`${occupiedUnits} de ${summary?.totalUnits ?? 0} ocupadas`}
            tone={occupationPct >= 80 ? "success" : "default"}
            tooltip="Percentual de unidades com ao menos um morador cadastrado."
            loading={summaryQ.isLoading || residentsQ.isLoading}
            href="/moradores"
          />
          <KpiCard
            title="Ocorrências"
            icon={AlertTriangle}
            value={summary?.openIssues ?? 0}
            hint="em aberto"
            tone={(summary?.openIssues ?? 0) >= 10 ? "warning" : "default"}
            loading={summaryQ.isLoading}
            href="/ocorrencias"
          />
        </div>

        {/* Secondary mini KPIs */}
        <div className="mt-3 grid gap-3 grid-cols-2 md:grid-cols-4">
          <KpiCard
            title="Encomendas pendentes"
            icon={Package}
            value={summary?.pendingDeliveries ?? 0}
            loading={summaryQ.isLoading}
            href="/encomendas"
          />
          <KpiCard
            title="Próximas reservas"
            icon={CalendarCheck}
            value={summary?.upcomingReservations ?? 0}
            loading={summaryQ.isLoading}
            href="/reservas"
          />
          <KpiCard
            title="Previsão próximo mês"
            icon={TrendingUp}
            value={formatCompactCurrency(summary?.forecastNextMonth ?? 0)}
            hint="estimativa"
            tone={summary && summary.forecastNextMonth < 0 ? "warning" : "default"}
            tooltip="Estimativa de saldo para o próximo mês baseada em cobranças e contratos ativos."
            loading={summaryQ.isLoading}
          />
          <KpiCard
            title="Contratos vencendo"
            icon={CreditCard}
            value={expiringContractsCount}
            hint="próximos 60 dias"
            tone={expiringContractsCount > 0 ? "warning" : "default"}
            loading={contractsQ.isLoading}
            href="/contratos"
          />
        </div>
      </section>

      {/* Sortable widget grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visibleWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-12 gap-4">
            {visibleWidgets.map((w) => {
              const meta = WIDGET_CATALOG[w.id];
              return (
                <SortableWidget key={w.id} id={w.id} colSpan={meta.colSpan}>
                  <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                    {renderWidget(w.id)}
                  </Suspense>
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {visibleWidgets.length === 0 && (
        <div className="py-12 text-center border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            Todos os blocos estão ocultos. Use o botão{" "}
            <span className="font-semibold text-foreground">Personalizar</span> para mostrá-los novamente.
          </p>
        </div>
      )}
    </div>
  );
}
