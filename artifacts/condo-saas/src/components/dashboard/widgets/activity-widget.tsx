import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, ChevronRight } from "lucide-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { formatRelativeTime } from "../format";

interface Props {
  data: ActivityLog[] | undefined;
  loading: boolean;
}

const ACTION_LABEL: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Removeu",
  pay: "Registrou pagamento de",
  login: "Entrou em",
  register: "Registrou",
};

const ENTITY_LABEL: Record<string, string> = {
  charge: "cobrança",
  payment: "pagamento",
  notice: "aviso",
  issue: "ocorrência",
  delivery: "encomenda",
  reservation: "reserva",
  contract: "contrato",
  document: "documento",
  resident: "morador",
  unit: "unidade",
  vehicle: "veículo",
  service: "ordem de serviço",
  supplier: "fornecedor",
  event: "evento",
  user: "usuário",
  role: "perfil",
  condominium: "condomínio",
};

export function ActivityWidget({ data, loading }: Props) {
  const items = (data ?? []).slice(0, 10);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Últimas ações realizadas no sistema</CardDescription>
          </div>
          <Link href="/atividades">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Ver tudo <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma atividade registrada
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="py-2.5 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    <span className="font-medium">{a.userName ?? "Sistema"}</span>{" "}
                    <span className="text-muted-foreground">
                      {ACTION_LABEL[a.action] ?? a.action}{" "}
                      {ENTITY_LABEL[a.entity] ?? a.entity}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{a.message}</div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                  {formatRelativeTime(a.createdAt)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
