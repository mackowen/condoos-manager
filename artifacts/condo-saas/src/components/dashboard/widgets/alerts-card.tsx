import { useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, AlertCircle, Info, ChevronRight, CreditCard, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AlertItem } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  alerts: AlertItem[] | undefined;
  loading: boolean;
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const SEVERITY_STYLE: Record<string, { icon: typeof Info; bg: string; text: string; badge: string; label: string }> = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-destructive/10",
    text: "text-destructive",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    label: "Crítico",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    label: "Atenção",
  },
  info: {
    icon: Info,
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    label: "Informativo",
  },
};

const KIND_LINK: Record<string, string> = {
  charge: "/financeiro",
  contract: "/contratos",
  delinquency: "/financeiro",
};

const KIND_ICON: Record<string, typeof Info> = {
  charge: CreditCard,
  contract: FileSignature,
  delinquency: AlertTriangle,
};

export function AlertsCard({ alerts, loading }: Props) {
  const sorted = useMemo(
    () =>
      [...(alerts ?? [])].sort(
        (a, b) =>
          (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99) ||
          new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    [alerts],
  );

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0 };
    for (const a of sorted) c[a.severity as keyof typeof c]++;
    return c;
  }, [sorted]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Alertas Críticos
            </CardTitle>
            <CardDescription>Ordenados automaticamente por prioridade</CardDescription>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {counts.critical > 0 && (
              <Badge variant="outline" className={SEVERITY_STYLE.critical.badge}>
                {counts.critical} crítico{counts.critical === 1 ? "" : "s"}
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="outline" className={SEVERITY_STYLE.warning.badge}>
                {counts.warning} atenção
              </Badge>
            )}
            {counts.info > 0 && (
              <Badge variant="outline" className={SEVERITY_STYLE.info.badge}>
                {counts.info} info
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
            Nenhum alerta no momento. Tudo em ordem!
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
            {sorted.slice(0, 8).map((a) => {
              const st = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info;
              const KindIcon = KIND_ICON[a.kind] ?? st.icon;
              const href = KIND_LINK[a.kind] ?? "/financeiro";
              return (
                <Link key={a.id} href={href}>
                  <div
                    className={cn(
                      "flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors",
                    )}
                  >
                    <div className={cn("p-2 rounded-md h-fit shrink-0", st.bg)}>
                      <KindIcon className={cn("h-4 w-4", st.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-[10px] uppercase", st.badge)}>
                          {st.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {format(parseISO(a.date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="text-sm font-medium mt-1 truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.description}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {sorted.length > 8 && (
          <div className="pt-1">
            <Link href="/financeiro">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Ver todos os {sorted.length} alertas
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
