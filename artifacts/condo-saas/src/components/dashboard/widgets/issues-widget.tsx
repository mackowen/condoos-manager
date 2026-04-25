import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useListIssues } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};
const PRIORITY_CLASS: Record<string, string> = {
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  medium: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function IssuesWidget() {
  const { data, isLoading } = useListIssues();
  const open = (data ?? []).filter((i) => i.status === "open" || i.status === "in_progress").slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
              Ocorrências Abertas
            </CardTitle>
            <CardDescription>Demandas pendentes de moradores</CardDescription>
          </div>
          <Link href="/ocorrencias">
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
        ) : open.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhuma ocorrência aberta. 🎉
          </div>
        ) : (
          open.map((i) => (
            <Link key={i.id} href="/ocorrencias">
              <div className="p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase", PRIORITY_CLASS[i.priority] ?? PRIORITY_CLASS.medium)}
                  >
                    {PRIORITY_LABEL[i.priority] ?? i.priority}
                  </Badge>
                  {i.unitLabel && <span className="text-[11px] text-muted-foreground">{i.unitLabel}</span>}
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {format(parseISO(i.createdAt), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">{i.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{i.description}</div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
