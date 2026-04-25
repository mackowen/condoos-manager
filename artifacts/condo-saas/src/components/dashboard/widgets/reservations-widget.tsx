import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ChevronRight } from "lucide-react";
import { useListReservations } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ReservationsWidget() {
  const { data, isLoading } = useListReservations();
  const now = Date.now();
  const upcoming = (data ?? [])
    .filter((r) => r.status !== "cancelled" && new Date(r.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Próximas Reservas
            </CardTitle>
            <CardDescription>Áreas comuns reservadas em breve</CardDescription>
          </div>
          <Link href="/reservas">
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
        ) : upcoming.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma reserva próxima
          </div>
        ) : (
          upcoming.map((r) => (
            <Link key={r.id} href="/reservas">
              <div className="p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium truncate">{r.area}</div>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {format(parseISO(r.startsAt), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.unitLabel ?? "Sem unidade"}
                  {" · "}
                  {r.status === "confirmed" ? "Confirmada" : r.status === "pending" ? "Pendente" : r.status}
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
