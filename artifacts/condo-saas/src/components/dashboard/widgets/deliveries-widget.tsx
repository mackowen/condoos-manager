import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight } from "lucide-react";
import { useListDeliveries } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DeliveriesWidget() {
  const { data, isLoading } = useListDeliveries();
  const pending = (data ?? []).filter((d) => d.status === "received").slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Encomendas Pendentes
            </CardTitle>
            <CardDescription>Aguardando retirada</CardDescription>
          </div>
          <Link href="/encomendas">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Ver todas <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : pending.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma encomenda pendente
          </div>
        ) : (
          pending.map((d) => (
            <Link key={d.id} href="/encomendas">
              <div className="p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-sm font-medium truncate">{d.recipient}</div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {format(parseISO(d.receivedAt), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {d.unitLabel ? `${d.unitLabel} · ` : ""}
                  {d.carrier ?? "Sem transportadora"}
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
