export type DashboardPeriod = "month" | "3months" | "year";

export const PERIOD_MONTHS: Record<DashboardPeriod, number> = {
  month: 1,
  "3months": 3,
  year: 12,
};

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  month: "Mês atual",
  "3months": "Últimos 3 meses",
  year: "Últimos 12 meses",
};

export type WidgetId =
  | "cashflow-chart"
  | "health-card"
  | "income-expense-chart"
  | "forecast-chart"
  | "financial-pressure"
  | "delinquency-ranking"
  | "insights-card"
  | "alerts-card"
  | "notices-widget"
  | "issues-widget"
  | "deliveries-widget"
  | "reservations-widget"
  | "activity-widget";

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
}

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  description: string;
  colSpan: number;
  category: "financial" | "intelligent" | "operational" | "alerts";
}

export const WIDGET_CATALOG: Record<WidgetId, WidgetMeta> = {
  "cashflow-chart": {
    id: "cashflow-chart",
    title: "Fluxo de Caixa",
    description: "Receitas e despesas ao longo do período",
    colSpan: 8,
    category: "financial",
  },
  "health-card": {
    id: "health-card",
    title: "Saúde do Condomínio",
    description: "Indicador geral de saúde financeira e operacional",
    colSpan: 4,
    category: "intelligent",
  },
  "income-expense-chart": {
    id: "income-expense-chart",
    title: "Receita vs Despesa",
    description: "Comparativo mensal em barras",
    colSpan: 6,
    category: "financial",
  },
  "forecast-chart": {
    id: "forecast-chart",
    title: "Previsão Financeira",
    description: "Projeção de saldo para os próximos meses",
    colSpan: 6,
    category: "intelligent",
  },
  "financial-pressure": {
    id: "financial-pressure",
    title: "Pressão Financeira",
    description: "Tendência de déficit ao longo do tempo",
    colSpan: 6,
    category: "intelligent",
  },
  "delinquency-ranking": {
    id: "delinquency-ranking",
    title: "Ranking de Inadimplência",
    description: "Top 5 unidades com maior débito",
    colSpan: 6,
    category: "intelligent",
  },
  "insights-card": {
    id: "insights-card",
    title: "Insights Automáticos",
    description: "Análises geradas a partir dos seus dados",
    colSpan: 4,
    category: "intelligent",
  },
  "alerts-card": {
    id: "alerts-card",
    title: "Alertas Críticos",
    description: "Itens que precisam de atenção imediata",
    colSpan: 8,
    category: "alerts",
  },
  "notices-widget": {
    id: "notices-widget",
    title: "Avisos Recentes",
    description: "Últimos avisos publicados",
    colSpan: 4,
    category: "operational",
  },
  "issues-widget": {
    id: "issues-widget",
    title: "Ocorrências Abertas",
    description: "Demandas em aberto dos moradores",
    colSpan: 4,
    category: "operational",
  },
  "deliveries-widget": {
    id: "deliveries-widget",
    title: "Encomendas Pendentes",
    description: "Encomendas aguardando retirada",
    colSpan: 4,
    category: "operational",
  },
  "reservations-widget": {
    id: "reservations-widget",
    title: "Próximas Reservas",
    description: "Áreas comuns reservadas em breve",
    colSpan: 4,
    category: "operational",
  },
  "activity-widget": {
    id: "activity-widget",
    title: "Atividade Recente",
    description: "Últimas ações realizadas no sistema",
    colSpan: 12,
    category: "operational",
  },
};

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: "cashflow-chart", visible: true },
  { id: "health-card", visible: true },
  { id: "income-expense-chart", visible: true },
  { id: "forecast-chart", visible: true },
  { id: "financial-pressure", visible: true },
  { id: "delinquency-ranking", visible: true },
  { id: "insights-card", visible: true },
  { id: "alerts-card", visible: true },
  { id: "notices-widget", visible: true },
  { id: "issues-widget", visible: true },
  { id: "deliveries-widget", visible: true },
  { id: "reservations-widget", visible: true },
  { id: "activity-widget", visible: true },
];
