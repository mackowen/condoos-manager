import React from "react";
import { useListLogs } from "@workspace/api-client-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ActivityLog() {
  const { data: logs, isLoading } = useListLogs();

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create': return <Badge className="bg-primary hover:bg-primary">Criou</Badge>;
      case 'update': return <Badge className="bg-amber-500 hover:bg-amber-600">Atualizou</Badge>;
      case 'delete': return <Badge variant="destructive">Excluiu</Badge>;
      case 'pay': return <Badge className="bg-teal-500 hover:bg-teal-600">Pagou</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atividades</h1>
          <p className="text-muted-foreground">Log de ações realizadas no sistema.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data e Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.userName || 'Sistema'}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-mono text-xs">{log.entity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}