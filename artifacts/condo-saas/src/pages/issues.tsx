import React, { useState } from "react";
import { useListIssues, getListIssuesQueryKey, useCreateIssue, useUpdateIssue, useDeleteIssue, Issue, CreateIssueInputPriority, CreateIssueInputStatus } from "@workspace/api-client-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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

const issueSchema = z.object({
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  description: z.string().min(2, "Descrição deve ter no mínimo 2 caracteres"),
  category: z.string().min(1, "Categoria é obrigatória"),
  priority: z.nativeEnum(CreateIssueInputPriority),
  status: z.nativeEnum(CreateIssueInputStatus),
  unitId: z.string().optional().nullable(),
  reportedBy: z.string().optional().nullable(),
});

type IssueFormValues = z.infer<typeof issueSchema>;

export default function Issues() {
  const queryClient = useQueryClient();

  const { data: issues, isLoading } = useListIssues();
  const createIssue = useCreateIssue();
  const updateIssue = useUpdateIssue();
  const deleteIssue = useDeleteIssue();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      priority: "medium",
      status: "open",
      unitId: "",
      reportedBy: "",
    },
  });

  const openCreateDialog = () => {
    setEditingIssue(null);
    form.reset({
      title: "",
      description: "",
      category: "",
      priority: "medium",
      status: "open",
      unitId: "",
      reportedBy: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (issue: Issue) => {
    setEditingIssue(issue);
    form.reset({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority as CreateIssueInputPriority,
      status: issue.status as CreateIssueInputStatus,
      unitId: issue.unitId,
      reportedBy: issue.reportedBy,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: IssueFormValues) => {
    if (editingIssue) {
      updateIssue.mutate({ id: editingIssue.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey() });
          toast.success("Ocorrência atualizada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar ocorrência")
      });
    } else {
      createIssue.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey() });
          toast.success("Ocorrência criada com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar ocorrência")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteIssue.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey() });
        toast.success("Ocorrência excluída");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir ocorrência");
        setDeleteId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="destructive">Aberta</Badge>;
      case 'in_progress': return <Badge className="bg-amber-500 hover:bg-amber-600">Em Andamento</Badge>;
      case 'resolved': return <Badge className="bg-primary hover:bg-primary">Resolvida</Badge>;
      case 'closed': return <Badge variant="secondary">Fechada</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <span className="text-destructive font-semibold">Urgente</span>;
      case 'high': return <span className="text-amber-500 font-semibold">Alta</span>;
      case 'medium': return <span className="text-primary font-semibold">Média</span>;
      case 'low': return <span className="text-muted-foreground font-semibold">Baixa</span>;
      default: return <span>{priority}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-muted-foreground">Acompanhe problemas e solicitações.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Ocorrência
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
          ) : issues && issues.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Unidade / Relator</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(issue.createdAt), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{issue.title}</div>
                      <div className="text-xs text-muted-foreground">{issue.category}</div>
                    </TableCell>
                    <TableCell>
                      {issue.unitLabel ? <div>{issue.unitLabel}</div> : null}
                      {issue.reportedBy ? <div className="text-xs text-muted-foreground">{issue.reportedBy}</div> : null}
                      {!issue.unitLabel && !issue.reportedBy ? '-' : null}
                    </TableCell>
                    <TableCell>{getStatusBadge(issue.status)}</TableCell>
                    <TableCell>{getPriorityBadge(issue.priority)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(issue)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(issue.id)}>
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
              <AlertTriangle className="mx-auto h-8 w-8 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Nenhuma ocorrência encontrada</h3>
              <p className="text-sm">Tudo tranquilo por aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingIssue ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Resumo do problema" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Elétrica, Barulho..." {...field} />
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
                          <SelectItem value="open">Aberta</SelectItem>
                          <SelectItem value="in_progress">Em Andamento</SelectItem>
                          <SelectItem value="resolved">Resolvida</SelectItem>
                          <SelectItem value="closed">Fechada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes da ocorrência..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createIssue.isPending || updateIssue.isPending}>
                  {createIssue.isPending || updateIssue.isPending ? "Salvando..." : "Salvar"}
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