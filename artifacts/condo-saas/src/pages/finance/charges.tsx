import React, { useState } from "react";
import { useListCharges, getListChargesQueryKey, useCreateCharge, useUpdateCharge, useDeleteCharge, usePayCharge, Charge, CreateChargeInputType, CreateChargeInputStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const chargeSchema = z.object({
  unitId: z.string().optional().nullable(),
  type: z.nativeEnum(CreateChargeInputType),
  category: z.string().min(2, "Categoria é obrigatória"),
  description: z.string().min(2, "Descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  dueDate: z.string(),
  status: z.nativeEnum(CreateChargeInputStatus).optional(),
});

type ChargeFormValues = z.infer<typeof chargeSchema>;

const paySchema = z.object({
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  method: z.string().min(1, "Método é obrigatório"),
  paidAt: z.string(),
  notes: z.string().optional().nullable(),
});

type PayFormValues = z.infer<typeof paySchema>;

export default function Charges() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: charges, isLoading } = useListCharges({
    status: filterStatus !== "all" ? (filterStatus as any) : undefined
  });
  
  const createCharge = useCreateCharge();
  const updateCharge = useUpdateCharge();
  const deleteCharge = useDeleteCharge();
  const payCharge = usePayCharge();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [payingCharge, setPayingCharge] = useState<Charge | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      unitId: "",
      type: "income",
      category: "",
      description: "",
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: "pending",
    },
  });

  const payForm = useForm<PayFormValues>({
    resolver: zodResolver(paySchema),
    defaultValues: {
      amount: 0,
      method: "pix",
      paidAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const openCreateDialog = () => {
    setEditingCharge(null);
    form.reset({
      unitId: "",
      type: "income",
      category: "",
      description: "",
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      status: "pending",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (charge: Charge) => {
    setEditingCharge(charge);
    form.reset({
      unitId: charge.unitId,
      type: charge.type as CreateChargeInputType,
      category: charge.category,
      description: charge.description,
      amount: charge.amount,
      dueDate: charge.dueDate.split('T')[0],
      status: charge.status as CreateChargeInputStatus,
    });
    setDialogOpen(true);
  };

  const openPayDialog = (charge: Charge) => {
    setPayingCharge(charge);
    payForm.reset({
      amount: charge.amount,
      method: "pix",
      paidAt: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setPayDialogOpen(true);
  };

  const onSubmit = (data: ChargeFormValues) => {
    const payload = {
      ...data,
      dueDate: new Date(data.dueDate).toISOString()
    };

    if (editingCharge) {
      updateCharge.mutate({ id: editingCharge.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChargesQueryKey() });
          toast.success("Cobrança atualizada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar cobrança")
      });
    } else {
      createCharge.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListChargesQueryKey() });
          toast.success("Cobrança criada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar cobrança")
      });
    }
  };

  const onPaySubmit = (data: PayFormValues) => {
    if (!payingCharge) return;
    
    payCharge.mutate({ 
      id: payingCharge.id, 
      data: {
        ...data,
        paidAt: new Date(data.paidAt).toISOString()
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChargesQueryKey() });
        toast.success("Pagamento registrado com sucesso");
        setPayDialogOpen(false);
      },
      onError: () => toast.error("Erro ao registrar pagamento")
    });
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteCharge.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListChargesQueryKey() });
        toast.success("Cobrança excluída");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir cobrança");
        setDeleteId(null);
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-amber-500 border-amber-500">Pendente</Badge>;
      case 'paid': return <Badge className="bg-primary hover:bg-primary">Pago</Badge>;
      case 'overdue': return <Badge variant="destructive">Atrasado</Badge>;
      case 'cancelled': return <Badge variant="secondary">Cancelado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'income': return <span className="text-primary font-medium">Receita</span>;
      case 'expense': return <span className="text-destructive font-medium">Despesa</span>;
      case 'fine': return <span className="text-amber-500 font-medium">Multa</span>;
      default: return <span>{type}</span>;
    }
  };

  // Calculate summaries
  const summary = charges?.reduce((acc, curr) => {
    if (curr.type === 'income' && curr.status === 'paid') acc.receita += curr.amount;
    if (curr.type === 'expense' && curr.status === 'paid') acc.despesa += curr.amount;
    if (curr.type === 'fine' && curr.status === 'paid') acc.multas += curr.amount;
    if (curr.status === 'pending' || curr.status === 'overdue') acc.emAberto += curr.amount;
    return acc;
  }, { receita: 0, despesa: 0, multas: 0, emAberto: 0 }) || { receita: 0, despesa: 0, multas: 0, emAberto: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cobranças</h1>
          <p className="text-muted-foreground">Gerencie receitas, despesas e multas.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Cobrança
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recebida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(summary.receita)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesa Paga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.despesa)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Multas Recebidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{formatCurrency(summary.multas)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.emAberto)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Atrasado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : charges && charges.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell>
                      {format(new Date(charge.dueDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{charge.description}</div>
                      <div className="text-xs text-muted-foreground">{charge.category}</div>
                    </TableCell>
                    <TableCell>{charge.unitLabel || '-'}</TableCell>
                    <TableCell>{getTypeBadge(charge.type)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(charge.amount)}</TableCell>
                    <TableCell>{getStatusBadge(charge.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(charge.status === 'pending' || charge.status === 'overdue') && (
                          <Button variant="ghost" size="icon" onClick={() => openPayDialog(charge)} title="Receber Pagamento">
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(charge)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(charge.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhuma cobrança encontrada</h3>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCharge ? 'Editar Cobrança' : 'Nova Cobrança'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Receita (Ex: Taxa Condominial)</SelectItem>
                          <SelectItem value="expense">Despesa (Ex: Manutenção)</SelectItem>
                          <SelectItem value="fine">Multa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Taxa Mensal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input placeholder="Detalhes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="paid">Pago</SelectItem>
                        <SelectItem value="overdue">Atrasado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCharge.isPending || updateCharge.isPending}>
                  {createCharge.isPending || updateCharge.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receber Pagamento</DialogTitle>
          </DialogHeader>
          {payingCharge && (
            <div className="mb-4 p-3 bg-muted rounded-md text-sm">
              <div className="font-semibold">{payingCharge.description}</div>
              <div className="text-muted-foreground">Valor original: {formatCurrency(payingCharge.amount)}</div>
            </div>
          )}
          <Form {...payForm}>
            <form onSubmit={payForm.handleSubmit(onPaySubmit)} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={payForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Pago (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={payForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="transfer">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={payForm.control}
                name="paidAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data/Hora do Pagamento</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={payForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Input placeholder="Comprovante XYZ..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={payCharge.isPending}>
                  {payCharge.isPending ? "Registrando..." : "Registrar Pagamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}