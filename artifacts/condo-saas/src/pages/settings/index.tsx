import React, { useEffect } from "react";
import { useGetCurrentCondominium, getGetCurrentCondominiumQueryKey, useUpdateCurrentCondominium } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Building, Settings as SettingsIcon } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const AVAILABLE_MODULES = [
  "residents", "units", "charges", "notices", "issues", "deliveries", 
  "vehicles", "reservations", "documents", "services", "suppliers", "contracts", "events"
];

const settingsSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  address: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  logoUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  primaryColor: z.string().optional().nullable(),
  finePercent: z.coerce.number().min(0),
  interestPercent: z.coerce.number().min(0),
  modules: z.array(z.string()),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const queryClient = useQueryClient();

  const { data: condominium, isLoading } = useGetCurrentCondominium();
  const updateCondominium = useUpdateCurrentCondominium();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "",
      address: "",
      cnpj: "",
      logoUrl: "",
      primaryColor: "",
      finePercent: 2,
      interestPercent: 1,
      modules: [],
    },
  });

  useEffect(() => {
    if (condominium) {
      form.reset({
        name: condominium.name,
        address: condominium.address || "",
        cnpj: condominium.cnpj || "",
        logoUrl: condominium.logoUrl || "",
        primaryColor: condominium.primaryColor || "",
        finePercent: condominium.finePercent,
        interestPercent: condominium.interestPercent,
        modules: condominium.modules || [],
      });
    }
  }, [condominium, form]);

  const onSubmit = (data: SettingsFormValues) => {
    const payload = {
      ...data,
      logoUrl: data.logoUrl || null,
    };

    updateCondominium.mutate({ data: payload }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCurrentCondominiumQueryKey() });
        toast.success("Configurações salvas com sucesso");
      },
      onError: () => toast.error("Erro ao salvar configurações")
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as informações do seu condomínio.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Link href="/usuarios">
            <Card className="hover:border-primary cursor-pointer transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Users className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-semibold">Usuários</h3>
                <p className="text-xs text-muted-foreground mt-1">Gerenciar acessos</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/perfis">
            <Card className="hover:border-primary cursor-pointer transition-colors cursor-pointer">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Shield className="h-8 w-8 mb-2 text-primary" />
                <h3 className="font-semibold">Perfis</h3>
                <p className="text-xs text-muted-foreground mt-1">Grupos e permissões</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              Dados do Condomínio
            </CardTitle>
            <CardDescription>Informações gerais e de faturamento.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Condomínio</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua, Número, Bairro, Cidade, Estado" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="finePercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Multa Padrão (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interestPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Juros ao Mês (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="modules"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Módulos Ativos</FormLabel>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-4 border rounded-md bg-muted/20">
                          {AVAILABLE_MODULES.map((mod) => {
                            const isSelected = field.value.includes(mod);
                            return (
                              <div 
                                key={mod}
                                onClick={() => {
                                  if (isSelected) {
                                    field.onChange(field.value.filter(m => m !== mod));
                                  } else {
                                    field.onChange([...field.value, mod]);
                                  }
                                }}
                                className={`text-xs px-3 py-2 rounded cursor-pointer border select-none transition-colors font-medium text-center ${
                                  isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                                }`}
                              >
                                {mod}
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={updateCondominium.isPending}>
                      {updateCondominium.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}