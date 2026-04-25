import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ChevronRight } from "lucide-react";
import { useListNotices } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<string, string> = { high: "Alta", normal: "Normal", low: "Baixa" };
const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-destructive/15 text-destructive border-destructive/30",
  normal: "bg-primary/15 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
};

export function NoticesWidget() {
  const { data, isLoading } = useListNotices();
  const items = (data ?? []).slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Avisos Recentes
            </CardTitle>
            <CardDescription>Últimos avisos publicados</CardDescription>
          </div>
          <Link href="/avisos">
            <Button variant="ghost" size="sm" className="h-7 text-xs">
              Ver todos <ChevronRight className="h-3 w-3 ml-0.5" />
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
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhum aviso publicado
          </div>
        ) : (
          items.map((n) => (
            <Link key={n.id} href="/avisos">
              <div className="p-2.5 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] uppercase", PRIORITY_CLASS[n.priority] ?? PRIORITY_CLASS.normal)}
                  >
                    {PRIORITY_LABEL[n.priority] ?? n.priority}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {format(parseISO(n.publishedAt), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
                <div className="text-sm font-medium truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{n.body}</div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
