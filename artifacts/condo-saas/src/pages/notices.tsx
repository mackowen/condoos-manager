import React, { useState } from "react";
import { useListNotices, getListNoticesQueryKey, useCreateNotice, useUpdateNotice, useDeleteNotice, Notice, CreateNoticeInputPriority } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Bell, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

const noticeSchema = z.object({
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  body: z.string().min(2, "Corpo deve ter no mínimo 2 caracteres"),
  category: z.string().min(1, "Categoria é obrigatória"),
  priority: z.nativeEnum(CreateNoticeInputPriority),
});

type NoticeFormValues = z.infer<typeof noticeSchema>;

export default function Notices() {
  const queryClient = useQueryClient();

  const { data: notices, isLoading } = useListNotices();
  const createNotice = useCreateNotice();
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: "",
      body: "",
      category: "Geral",
      priority: "normal",
    },
  });

  const openCreateDialog = () => {
    setEditingNotice(null);
    form.reset({
      title: "",
      body: "",
      category: "Geral",
      priority: "normal",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (notice: Notice) => {
    setEditingNotice(notice);
    form.reset({
      title: notice.title,
      body: notice.body,
      category: notice.category,
      priority: notice.priority as CreateNoticeInputPriority,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: NoticeFormValues) => {
    if (editingNotice) {
      updateNotice.mutate({ id: editingNotice.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNoticesQueryKey() });
          toast.success("Aviso atualizado com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao atualizar aviso")
      });
    } else {
      createNotice.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNoticesQueryKey() });
          toast.success("Aviso criado com sucesso");
          setDialogOpen(false);
        },
        onError: () => toast.error("Erro ao criar aviso")
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteNotice.mutate({ id: deleteId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNoticesQueryKey() });
        toast.success("Aviso excluído");
        setDeleteId(null);
      },
      onError: () => {
        toast.error("Erro ao excluir aviso");
        setDeleteId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Avisos</h1>
          <p className="text-muted-foreground">Comunique-se com os moradores do condomínio.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : notices && notices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notices.map((notice) => (
            <Card key={notice.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      notice.priority === 'high' ? 'destructive' :
                      notice.priority === 'low' ? 'secondary' : 'default'
                    }>
                      {notice.priority === 'high' ? 'Alta' :
                       notice.priority === 'low' ? 'Baixa' : 'Normal'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{notice.category}</span>
                  </div>
                  <CardTitle className="text-xl leading-tight">{notice.title}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 -mr-2">
                      <span className="sr-only">Abrir menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(notice)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(notice.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notice.body}</p>
              </CardContent>
              <CardFooter className="pt-0 text-xs text-muted-foreground border-t mt-4 py-3">
                Publicado em {format(new Date(notice.publishedAt || notice.createdAt), "dd/MM/yyyy HH:mm")}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed rounded-lg text-muted-foreground bg-card">
          <Bell className="mx-auto h-8 w-8 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Nenhum aviso publicado</h3>
          <p className="text-sm">Crie seu primeiro aviso para notificar os moradores.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNotice ? 'Editar Aviso' : 'Novo Aviso'}</DialogTitle>
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
                      <Input placeholder="Título do aviso" {...field} />
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
                        <Input placeholder="Ex: Geral, Obras..." {...field} />
                      </FormControl>
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
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Corpo do aviso..." className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createNotice.isPending || updateNotice.isPending}>
                  {createNotice.isPending || updateNotice.isPending ? "Salvando..." : "Salvar"}
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
              Esta ação não pode ser desfeita. Isso excluirá o aviso permanentemente.
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