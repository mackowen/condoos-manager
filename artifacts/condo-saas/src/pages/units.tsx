import React, { useState } from "react";
import { useListUnits, getListUnitsQueryKey, useCreateUnit, useUpdateUnit, useDeleteUnit, Unit } from "@workspace/api-client-react";
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
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Home, Download } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const unitSchema = z.object({
  block: z.string().optional().nullable(),
  number: z.string().min(1, "Número é obrigatório"),
  floor: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  sizeM2: z.coerce.number().optional().nullable(),
  parkingSpots: z.coerce.number().min(0).default(0),
  ownerName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type UnitFormValues = z.infer<typeof unitSchema>;

export default function Units() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: units, isLoading } = useListUnits({ search: debouncedSearch });
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      block: "",
      number: "",
      floor: "",
      type: "Apartamento",
      sizeM2: 0,
      parkingSpots: 0,
      ownerName: "",
      notes: "",
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
    setEditingUnit(null);
    form.reset({
      block: "",
      number: "",
      floor: "",
      type: "Apartamento",
      sizeM2: 0,
      parkingSpots: 0,
      ownerName: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (unit: Unit) => {
    setEditingUnit(unit);
    form.reset({
      block: unit.block,
      number: unit.number,
      floor: unit.floor,
      type: unit.type,
      sizeM2: unit.sizeM2,
      parkingSpots: unit.parkingSpots,
      ownerName: unit.ownerName,
      notes: unit.notes,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: UnitFormValues) => {
    if (editingUnit) {
      updateUnit.mutate({ id: editingUnit.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() });
          toast.success("Unidade atualizada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar unidade")
      });
    } else {
      createUnit.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() });
          toast.success("Unidade criada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar unidade")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteUnit.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUnitsQueryKey() });
        toast.success("Unidade excluída");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir unidade");
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">Gerencie os apartamentos e blocos do condomínio.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rows = (units ?? []).map((u) => ({
                Bloco: u.block ?? "",
                Número: u.number,
                Andar: u.floor ?? "",
                Tipo: u.type ?? "",
                "Área (m²)": u.sizeM2 ?? "",
                Vagas: u.parkingSpots ?? 0,
                Proprietário: u.ownerName ?? "",
              }));
              downloadCSV(rows, "unidades");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Unidade
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por bloco, número ou proprietário..."
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
          ) : units && units.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Vagas</TableHead>
                  <TableHead>Área (m²)</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        {unit.block ? `Bloco ${unit.block} - ` : ''}Apto {unit.number}
                      </div>
                    </TableCell>
                    <TableCell>{unit.ownerName || '-'}</TableCell>
                    <TableCell>{unit.parkingSpots}</TableCell>
                    <TableCell>{unit.sizeM2 || '-'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(unit)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(unit.id)}>
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
              <Home className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhuma unidade encontrada</h3>
              <p className="text-sm">Cadastre as unidades do condomínio para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bloco / Torre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: A" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proprietário</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parkingSpots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vagas de Garagem</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sizeM2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" {...field} value={field.value || ""} />
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
                <Button type="submit" disabled={createUnit.isPending || updateUnit.isPending}>
                  {createUnit.isPending || updateUnit.isPending ? "Salvando..." : "Salvar"}
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
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a unidade e pode afetar moradores vinculados.
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