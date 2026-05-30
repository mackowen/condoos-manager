import React, { useState } from "react";
import { useListResidents, getListResidentsQueryKey, useCreateResident, useUpdateResident, useDeleteResident, Resident, CreateResidentInputKind } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users, Download } from "lucide-react";
import { downloadCSV } from "@/lib/export";
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

const residentSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  kind: z.nativeEnum(CreateResidentInputKind),
  unitId: z.string().optional().nullable(),
  moveInDate: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

type ResidentFormValues = z.infer<typeof residentSchema>;

export default function Residents() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: residents, isLoading } = useListResidents({ search: debouncedSearch });
  const createResident = useCreateResident();
  const updateResident = useUpdateResident();
  const deleteResident = useDeleteResident();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      kind: "owner",
      unitId: "",
      moveInDate: "",
      active: true,
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const handler = setTimeout(() => {
      setDebouncedSearch(e.target.value);
    }, 500);
    return () => clearTimeout(handler);
  };

  const openCreateDialog = () => {
    setEditingResident(null);
    form.reset({
      name: "",
      email: "",
      phone: "",
      document: "",
      kind: "owner",
      unitId: "",
      moveInDate: "",
      active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (resident: Resident) => {
    setEditingResident(resident);
    form.reset({
      name: resident.name,
      email: resident.email || "",
      phone: resident.phone,
      document: resident.document,
      kind: resident.kind as CreateResidentInputKind,
      unitId: resident.unitId,
      moveInDate: resident.moveInDate ? resident.moveInDate.split('T')[0] : "",
      active: resident.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ResidentFormValues) => {
    // Convert empty string to null/undefined where appropriate
    const payload = {
      ...data,
      email: data.email || null,
      unitId: data.unitId || null,
      moveInDate: data.moveInDate ? new Date(data.moveInDate).toISOString() : null,
    };

    if (editingResident) {
      updateResident.mutate({ id: editingResident.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
          toast.success("Morador atualizado com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar morador")
      });
    } else {
      createResident.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
          toast.success("Morador criado com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar morador")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteResident.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResidentsQueryKey() });
        toast.success("Morador excluído");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir morador");
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moradores</h1>
          <p className="text-muted-foreground">Gerencie proprietários, inquilinos e dependentes.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = (residents ?? []).map((r) => ({
                Nome: r.name,
                Email: r.email ?? "",
                Telefone: r.phone ?? "",
                Tipo: r.kind === "owner" ? "Proprietário" : r.kind === "tenant" ? "Inquilino" : "Dependente",
                Unidade: r.unitId ?? "",
                Ativo: r.active ? "Sim" : "Não",
              }));
              downloadCSV(rows, "moradores");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Morador
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou documento..."
              className="pl-9 max-w-sm"
              value={search}
              onChange={handleSearchChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : residents && residents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {residents.map((resident) => (
                  <TableRow key={resident.id}>
                    <TableCell className="font-medium">{resident.name}</TableCell>
                    <TableCell>{resident.unitLabel || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {resident.kind === 'owner' ? 'Proprietário' : 
                         resident.kind === 'tenant' ? 'Inquilino' : 'Dependente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{resident.email || '-'}</div>
                        <div className="text-muted-foreground">{resident.phone || '-'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={resident.active ? "default" : "secondary"}>
                        {resident.active ? 'Ativo' : 'Inativo'}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => openEditDialog(resident)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(resident.id)}>
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
            <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground">
              <Users className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum morador encontrado</h3>
              <p className="text-sm">Cadastre os moradores do condomínio para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingResident ? 'Editar Morador' : 'Novo Morador'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telefone" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento (CPF/RG)</FormLabel>
                      <FormControl>
                        <Input placeholder="Documento" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kind"
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
                          <SelectItem value="owner">Proprietário</SelectItem>
                          <SelectItem value="tenant">Inquilino</SelectItem>
                          <SelectItem value="dependent">Dependente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID da Unidade</FormLabel>
                      <FormControl>
                        <Input placeholder="ID (opcional)" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moveInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Entrada</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createResident.isPending || updateResident.isPending}>
                  {createResident.isPending || updateResident.isPending ? "Salvando..." : "Salvar"}
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o morador.
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