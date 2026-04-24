import React, { useState } from "react";
import { useListContracts, getListContractsQueryKey, useCreateContract, useUpdateContract, useDeleteContract, Contract, CreateContractInputStatus } from "@workspace/api-client-react";
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
import { FileSignature, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

const contractSchema = z.object({
  title: z.string().min(2, "Título é obrigatório"),
  supplierId: z.string().optional().nullable(),
  category: z.string().min(2, "Categoria é obrigatória"),
  startsOn: z.string(),
  endsOn: z.string(),
  monthlyValue: z.coerce.number().min(0),
  status: z.nativeEnum(CreateContractInputStatus),
  notes: z.string().optional().nullable(),
});

type ContractFormValues = z.infer<typeof contractSchema>;

export default function Contracts() {
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useListContracts();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      title: "",
      supplierId: "",
      category: "",
      startsOn: new Date().toISOString().slice(0, 10),
      endsOn: new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
      monthlyValue: 0,
      status: "active",
      notes: "",
    },
  });

  const openCreateDialog = () => {
    setEditingContract(null);
    form.reset({
      title: "",
      supplierId: "",
      category: "",
      startsOn: new Date().toISOString().slice(0, 10),
      endsOn: new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
      monthlyValue: 0,
      status: "active",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (contract: Contract) => {
    setEditingContract(contract);
    form.reset({
      title: contract.title,
      supplierId: contract.supplierId,
      category: contract.category,
      startsOn: contract.startsOn.split('T')[0],
      endsOn: contract.endsOn.split('T')[0],
      monthlyValue: contract.monthlyValue,
      status: contract.status as CreateContractInputStatus,
      notes: contract.notes,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ContractFormValues) => {
    const payload = {
      ...data,
      startsOn: new Date(data.startsOn).toISOString(),
      endsOn: new Date(data.endsOn).toISOString(),
    };

    if (editingContract) {
      updateContract.mutate({ id: editingContract.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
          toast.success("Contrato atualizado");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar contrato")
      });
    } else {
      createContract.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
          toast.success("Contrato criado");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar contrato")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteContract.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListContractsQueryKey() });
        toast.success("Contrato excluído");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir contrato");
        setDeleteId(null);
      }
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">Gerencie contratos contínuos e obrigações mensais.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contrato
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
          ) : contracts && contracts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Vigência</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">
                      {contract.title}
                      <div className="text-xs text-muted-foreground mt-1">{contract.category}</div>
                    </TableCell>
                    <TableCell>{contract.supplierName || '-'}</TableCell>
                    <TableCell className="text-sm">
                      <div>{format(new Date(contract.startsOn), "dd/MM/yyyy")}</div>
                      <div className="text-muted-foreground">até {format(new Date(contract.endsOn), "dd/MM/yyyy")}</div>
                    </TableCell>
                    <TableCell className="font-medium text-primary">
                      {formatCurrency(contract.monthlyValue)}
                    </TableCell>
                    <TableCell>
                      {contract.status === 'active' && <Badge className="bg-primary hover:bg-primary">Ativo</Badge>}
                      {contract.status === 'expired' && <Badge variant="secondary">Expirado</Badge>}
                      {contract.status === 'cancelled' && <Badge variant="destructive">Cancelado</Badge>}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(contract)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(contract.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileSignature className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum contrato</h3>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manutenção Elevadores" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Manutenção" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID do Fornecedor</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="monthlyValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Mensal (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início da Vigência</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fim da Vigência</FormLabel>
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
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="expired">Expirado</SelectItem>
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
                <Button type="submit" disabled={createContract.isPending || updateContract.isPending}>
                  {createContract.isPending || updateContract.isPending ? "Salvando..." : "Salvar"}
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