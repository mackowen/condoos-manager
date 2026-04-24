import React, { useState } from "react";
import { useListDeliveries, getListDeliveriesQueryKey, useCreateDelivery, useUpdateDelivery, useDeleteDelivery, Delivery, CreateDeliveryInputStatus } from "@workspace/api-client-react";
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
import { Package, Plus, MoreHorizontal, Pencil, Trash2, CheckCircle2 } from "lucide-react";
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

const deliverySchema = z.object({
  unitId: z.string().optional().nullable(),
  recipient: z.string().min(2, "Destinatário deve ter no mínimo 2 caracteres"),
  carrier: z.string().optional().nullable(),
  trackingCode: z.string().optional().nullable(),
  status: z.nativeEnum(CreateDeliveryInputStatus),
  receivedAt: z.string(),
  notes: z.string().optional().nullable(),
});

type DeliveryFormValues = z.infer<typeof deliverySchema>;

export default function Deliveries() {
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading } = useListDeliveries();
  const createDelivery = useCreateDelivery();
  const updateDelivery = useUpdateDelivery();
  const deleteDelivery = useDeleteDelivery();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      unitId: "",
      recipient: "",
      carrier: "",
      trackingCode: "",
      status: "received",
      receivedAt: new Date().toISOString().slice(0, 16),
      notes: "",
    },
  });

  const openCreateDialog = () => {
    setEditingDelivery(null);
    form.reset({
      unitId: "",
      recipient: "",
      carrier: "",
      trackingCode: "",
      status: "received",
      receivedAt: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    form.reset({
      unitId: delivery.unitId,
      recipient: delivery.recipient,
      carrier: delivery.carrier,
      trackingCode: delivery.trackingCode,
      status: delivery.status as CreateDeliveryInputStatus,
      receivedAt: new Date(delivery.receivedAt).toISOString().slice(0, 16),
      notes: delivery.notes,
    });
    setDialogOpen(true);
  };

  const markAsPickedUp = (delivery: Delivery) => {
    updateDelivery.mutate({
      id: delivery.id,
      data: {
        recipient: delivery.recipient,
        status: "picked_up",
        receivedAt: delivery.receivedAt,
        pickedUpAt: new Date().toISOString()
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        toast.success("Encomenda marcada como entregue ao morador");
      },
      onError: () => toast.error("Erro ao atualizar encomenda")
    });
  };

  const onSubmit = (data: DeliveryFormValues) => {
    const payload = {
      ...data,
      receivedAt: new Date(data.receivedAt).toISOString()
    };

    if (editingDelivery) {
      updateDelivery.mutate({ id: editingDelivery.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
          toast.success("Encomenda atualizada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar encomenda")
      });
    } else {
      createDelivery.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
          toast.success("Encomenda registrada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao registrar encomenda")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteDelivery.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
        toast.success("Registro excluído");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir registro");
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encomendas</h1>
          <p className="text-muted-foreground">Controle de recebimento e entrega de pacotes.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Encomenda
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : deliveries && deliveries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Recebimento</TableHead>
                  <TableHead>Destinatário / Unidade</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell>
                      {format(new Date(delivery.receivedAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{delivery.recipient}</div>
                      <div className="text-xs text-muted-foreground">{delivery.unitLabel}</div>
                    </TableCell>
                    <TableCell>
                      {delivery.carrier || '-'}
                      {delivery.trackingCode && (
                        <div className="text-xs text-muted-foreground">{delivery.trackingCode}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {delivery.status === 'received' && <Badge className="bg-amber-500 hover:bg-amber-600">Aguardando Retirada</Badge>}
                      {delivery.status === 'picked_up' && <Badge className="bg-primary hover:bg-primary">Entregue</Badge>}
                      {delivery.status === 'returned' && <Badge variant="destructive">Devolvida</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {delivery.status === 'received' && (
                          <Button variant="ghost" size="icon" onClick={() => markAsPickedUp(delivery)} title="Marcar como entregue">
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
                            <DropdownMenuItem onClick={() => openEditDialog(delivery)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(delivery.id)}>
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
              <Package className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhuma encomenda registrada</h3>
              <p className="text-sm">A portaria está vazia.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDelivery ? 'Editar Encomenda' : 'Registrar Encomenda'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="recipient"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destinatário</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome na caixa" {...field} />
                      </FormControl>
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
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transportadora</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Correios, Loggi..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trackingCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Rastreio</FormLabel>
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
                  name="receivedAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora de Recebimento</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <SelectItem value="received">Recebido na Portaria</SelectItem>
                          <SelectItem value="picked_up">Entregue ao Morador</SelectItem>
                          <SelectItem value="returned">Devolvido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createDelivery.isPending || updateDelivery.isPending}>
                  {createDelivery.isPending || updateDelivery.isPending ? "Salvando..." : "Salvar"}
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