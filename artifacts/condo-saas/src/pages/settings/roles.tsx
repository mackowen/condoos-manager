import React, { useState } from "react";
import { useListRoles, getListRolesQueryKey, useCreateRole, useUpdateRole, useDeleteRole, Role } from "@workspace/api-client-react";
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
import { ShieldAlert, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

// Hardcoded permission list
const AVAILABLE_PERMISSIONS = [
  "residents.view", "residents.create", "residents.edit", "residents.delete",
  "units.view", "units.create", "units.edit", "units.delete",
  "charges.view", "charges.create", "charges.edit", "charges.delete", "charges.pay",
  "notices.view", "notices.create", "notices.edit", "notices.delete",
  "issues.view", "issues.create", "issues.edit", "issues.delete",
  "deliveries.view", "deliveries.create", "deliveries.edit", "deliveries.delete",
  "vehicles.view", "vehicles.create", "vehicles.edit", "vehicles.delete",
  "reservations.view", "reservations.create", "reservations.edit", "reservations.delete",
];

const roleSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  description: z.string().optional().nullable(),
  permissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export default function Roles() {
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useListRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
    },
  });

  const openCreateDialog = () => {
    setEditingRole(null);
    form.reset({
      name: "",
      description: "",
      permissions: [],
    });
    setDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    form.reset({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: RoleFormValues) => {
    if (editingRole) {
      updateRole.mutate({ id: editingRole.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
          toast.success("Perfil atualizado");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar perfil")
      });
    } else {
      createRole.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
          toast.success("Perfil criado");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar perfil")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteRole.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
        toast.success("Perfil excluído");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir perfil");
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Perfis de Acesso</h1>
          <p className="text-muted-foreground">Grupos de permissões para usuários do sistema.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Perfil
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
          ) : roles && roles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{role.permissions.length} permissões</Badge>
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
                          <DropdownMenuItem onClick={() => openEditDialog(role)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(role.id)}>
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
              <ShieldAlert className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhum perfil encontrado</h3>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Perfil</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Portaria" {...field} />
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
                        <Input placeholder="Opcional" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="permissions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permissões ({field.value.length} selecionadas)</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                      {AVAILABLE_PERMISSIONS.map((perm) => {
                        const isSelected = field.value.includes(perm);
                        return (
                          <div 
                            key={perm}
                            onClick={() => {
                              if (isSelected) {
                                field.onChange(field.value.filter(p => p !== perm));
                              } else {
                                field.onChange([...field.value, perm]);
                              }
                            }}
                            className={`text-xs px-2 py-1.5 rounded cursor-pointer border select-none transition-colors ${
                              isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {perm}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
                  {createRole.isPending || updateRole.isPending ? "Salvando..." : "Salvar"}
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