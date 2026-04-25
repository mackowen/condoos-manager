import type { CashflowPoint } from "@workspace/api-client-react";

export type InsightSeverity = "positive" | "warning" | "critical" | "info";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
}

interface DeriveArgs {
  cashflow?: CashflowPoint[];
  delinquencyRate?: number;
  delinquentCount?: number;
  openIssues?: number;
  pendingDeliveries?: number;
  upcomingReservations?: number;
  forecastNextMonth?: number;
  expiringContracts?: number;
}

export function deriveInsights(args: DeriveArgs): Insight[] {
  const insights: Insight[] = [];
  const cf = args.cashflow ?? [];

  if (cf.length >= 2) {
    const last = cf[cf.length - 1];
    const prev = cf[cf.length - 2];

    const incomeDelta = prev.income > 0 ? ((last.income - prev.income) / prev.income) * 100 : 0;
    if (incomeDelta <= -10) {
      insights.push({
        id: "income-drop",
        severity: "warning",
        title: "Queda na receita",
        description: `Receita caiu ${Math.abs(incomeDelta).toFixed(1)}% em relação ao mês anterior. Reveja cobranças e inadimplência.`,
      });
    } else if (incomeDelta >= 10) {
      insights.push({
        id: "income-up",
        severity: "positive",
        title: "Crescimento de receita",
        description: `Receita subiu ${incomeDelta.toFixed(1)}% comparado ao mês anterior. Bom trabalho!`,
      });
    }

    const expenseDelta = prev.expense > 0 ? ((last.expense - prev.expense) / prev.expense) * 100 : 0;
    if (expenseDelta >= 15) {
      insights.push({
        id: "expense-spike",
        severity: "critical",
        title: "Despesas acima da média",
        description: `Despesas subiram ${expenseDelta.toFixed(1)}% no último mês. Avalie contratos e ordens de serviço.`,
      });
    }

    if (last.balance < 0) {
      insights.push({
        id: "negative-balance",
        severity: "critical",
        title: "Saldo mensal negativo",
        description: `O mês fechou no vermelho com déficit de R$ ${Math.abs(last.balance).toFixed(2)}.`,
      });
    }
  }

  if (cf.length >= 3) {
    const recent = cf.slice(-3);
    const allNegative = recent.every((m) => m.balance < 0);
    if (allNegative) {
      insights.push({
        id: "deficit-streak",
        severity: "critical",
        title: "Déficit recorrente",
        description: "Últimos 3 meses fecharam negativos. Reveja a estrutura de receita e despesas urgentemente.",
      });
    }
  }

  if (typeof args.delinquencyRate === "number") {
    if (args.delinquencyRate >= 30) {
      insights.push({
        id: "delinquency-high",
        severity: "critical",
        title: "Inadimplência alta",
        description: `${args.delinquencyRate.toFixed(1)}% de inadimplência (${args.delinquentCount ?? 0} unidades). Considere campanhas de negociação.`,
      });
    } else if (args.delinquencyRate >= 15) {
      insights.push({
        id: "delinquency-warn",
        severity: "warning",
        title: "Inadimplência em alta",
        description: `${args.delinquencyRate.toFixed(1)}% de inadimplência. Atenção redobrada nas próximas semanas.`,
      });
    } else if (args.delinquencyRate <= 5) {
      insights.push({
        id: "delinquency-low",
        severity: "positive",
        title: "Inadimplência sob controle",
        description: `Apenas ${args.delinquencyRate.toFixed(1)}% de inadimplência. Excelente saúde financeira.`,
      });
    }
  }

  if ((args.openIssues ?? 0) >= 10) {
    insights.push({
      id: "issues-many",
      severity: "warning",
      title: "Muitas ocorrências abertas",
      description: `${args.openIssues} ocorrências aguardando atendimento. Priorize com a equipe.`,
    });
  }

  if ((args.pendingDeliveries ?? 0) >= 10) {
    insights.push({
      id: "deliveries-many",
      severity: "info",
      title: "Encomendas acumuladas",
      description: `${args.pendingDeliveries} encomendas aguardando retirada. Considere reforçar a comunicação.`,
    });
  }

  if ((args.expiringContracts ?? 0) > 0) {
    insights.push({
      id: "contracts-expiring",
      severity: "warning",
      title: "Contratos vencendo",
      description: `${args.expiringContracts} contrato(s) vencem em breve. Renove antes para evitar interrupções.`,
    });
  }

  if (typeof args.forecastNextMonth === "number" && args.forecastNextMonth < 0) {
    insights.push({
      id: "forecast-negative",
      severity: "warning",
      title: "Previsão negativa",
      description: `Projeção indica saldo de R$ ${args.forecastNextMonth.toFixed(2)} no próximo mês.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: "all-good",
      severity: "positive",
      title: "Tudo sob controle",
      description: "Nenhuma anomalia detectada nos seus indicadores. Continue acompanhando.",
    });
  }

  const order: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, positive: 3 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function computeForecast(cashflow: CashflowPoint[], futureMonths = 3): {
  month: string;
  balance: number;
  isForecast: boolean;
}[] {
  const past = cashflow.map((c) => ({ month: c.month, balance: c.balance, isForecast: false }));
  if (cashflow.length < 2) return past;

  const n = cashflow.length;
  const xs = cashflow.map((_, i) => i);
  const ys = cashflow.map((c) => c.balance);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((acc, x, i) => acc + (x - meanX) * (ys[i] - meanY), 0);
  const den = xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const lastMonth = cashflow[cashflow.length - 1].month;
  const [mStr, yStr] = lastMonth.split("/");
  let m = parseInt(mStr, 10);
  let y = parseInt(yStr, 10);

  const future: { month: string; balance: number; isForecast: boolean }[] = [];
  for (let i = 1; i <= futureMonths; i++) {
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
    const balance = intercept + slope * (n - 1 + i);
    future.push({
      month: `${m.toString().padStart(2, "0")}/${y}`,
      balance: Math.round(balance),
      isForecast: true,
    });
  }
  return [...past, ...future];
}
