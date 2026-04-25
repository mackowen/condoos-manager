import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DashboardPeriod } from "./types";

interface Props {
  value: DashboardPeriod;
  onChange: (v: DashboardPeriod) => void;
}

export function PeriodFilter({ value, onChange }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as DashboardPeriod)}>
      <TabsList className="h-9">
        <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
        <TabsTrigger value="3months" className="text-xs">3 meses</TabsTrigger>
        <TabsTrigger value="year" className="text-xs">Ano</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
