import React from "react";
import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function Payments() {
  const { data: payments, isLoading } = useListPayments();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'pix': return <Badge className="bg-teal-500">PIX</Badge>;
      case 'boleto': return <Badge variant="secondary">Boleto</Badge>;
      case 'credit_card': return <Badge variant="outline">Cartão</Badge>;
      case 'cash': return <Badge className="bg-green-600">Dinheiro</Badge>;
      case 'transfer': return <Badge variant="outline">Transferência</Badge>;
      default: return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Pagamentos</h1>
        <p className="text-muted-foreground">Registro de todos os pagamentos recebidos.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data do Pagamento</TableHead>
                  <TableHead>ID Cobrança</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.paidAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {payment.chargeId.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{getMethodBadge(payment.method)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{payment.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum pagamento registrado</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}