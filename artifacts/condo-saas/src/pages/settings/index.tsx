import React, { useEffect, useState, useCallback } from "react";
import {
  useGetCurrentCondominium,
  getGetCurrentCondominiumQueryKey,
  useUpdateCurrentCondominium,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { useTheme } from "@/contexts/theme-context";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  Building,
  Palette,
  Key,
  DollarSign,
  Sun,
  Moon,
  Copy,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MODULE_LABELS: Record<string, string> = {
  residents: "Moradores",
  units: "Unidades",
  charges: "Cobranças",
  notices: "Avisos",
  issues: "Ocorrências",
  deliveries: "Encomendas",
  vehicles: "Veículos",
  reservations: "Reservas",
  documents: "Documentos",
  services: "Ordens de Serviço",
  suppliers: "Fornecedores",
  contracts: "Contratos",
  events: "Agenda",
};

const AVAILABLE_MODULES = Object.keys(MODULE_LABELS);

const PRESET_COLORS = [
  { label: "Verde (padrão)", value: "175 60% 25%" },
  { label: "Azul", value: "217 91% 40%" },
  { label: "Roxo", value: "263 70% 44%" },
  { label: "Laranja", value: "25 95% 45%" },
  { label: "Vermelho", value: "0 72% 45%" },
  { label: "Cinza", value: "220 9% 36%" },
];

const settingsSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  address: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable().or(z.literal("")),
  primaryColor: z.string().optional().nullable(),
  finePercent: z.coerce.number().min(0).max(100),
  interestPercent: z.coerce.number().min(0).max(100),
  modules: z.array(z.string()),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("condo_token");
      const res = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async (name: string): Promise<string | null> => {
    const token = localStorage.getItem("condo_token");
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await fetchKeys();
    return data.plaintext as string;
  };

  const deleteKey = async (id: string) => {
    const token = localStorage.getItem("condo_token");
    await fetch(`/api/api-keys/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchKeys();
  };

  return { keys, loading, createKey, deleteKey, refetch: fetchKeys };
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

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
    updateCondominium.mutate(
      { data: { ...data, logoUrl: data.logoUrl || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCurrentCondominiumQueryKey() });
          toast.success("Configurações salvas com sucesso");
        },
        onError: () => toast.error("Erro ao salvar configurações"),
      },
    );
  };

  // API Keys
  const { keys, loading: keysLoading, createKey, deleteKey } = useApiKeys();
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    const plaintext = await createKey(newKeyName.trim());
    setCreatingKey(false);
    if (plaintext) {
      setGeneratedKey(plaintext);
      setNewKeyName("");
      toast.success("Chave API criada com sucesso");
    } else {
      toast.error("Erro ao criar chave API");
    }
  };

  const copyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  };

  const FormSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Personalize e configure seu condomínio.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/usuarios">
            <Button variant="outline" size="sm">
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </Button>
          </Link>
          <Link href="/perfis">
            <Button variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Perfis
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="geral" className="gap-1.5">
            <Building className="h-3.5 w-3.5" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="visual" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            Visual
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5">
            <Key className="h-3.5 w-3.5" />
            API
          </TabsTrigger>
        </TabsList>

        {/* ── GERAL ── */}
        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Condomínio</CardTitle>
              <CardDescription>Informações gerais e módulos ativos.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <FormSkeleton />
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
                              <Input
                                placeholder="00.000.000/0000-00"
                                {...field}
                                value={field.value || ""}
                              />
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
                            <Input
                              placeholder="Rua, Número, Bairro, Cidade, Estado"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="modules"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Módulos Ativos</FormLabel>
                          <FormDescription>
                            Habilite apenas os módulos que seu condomínio utiliza.
                          </FormDescription>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 p-4 border rounded-md bg-muted/20">
                            {AVAILABLE_MODULES.map((mod) => {
                              const isSelected = field.value.includes(mod);
                              return (
                                <div
                                  key={mod}
                                  onClick={() => {
                                    if (isSelected) {
                                      field.onChange(field.value.filter((m) => m !== mod));
                                    } else {
                                      field.onChange([...field.value, mod]);
                                    }
                                  }}
                                  className={`text-xs px-3 py-2 rounded cursor-pointer border select-none transition-colors font-medium text-center ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background hover:bg-muted"
                                  }`}
                                >
                                  {MODULE_LABELS[mod]}
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
                        {updateCondominium.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── VISUAL ── */}
        <TabsContent value="visual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Tema, cores e identidade visual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark mode */}
              <div>
                <p className="text-sm font-medium mb-3">Tema</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      theme === "light"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <Sun className="h-6 w-6 text-amber-500" />
                    <span className="text-xs font-medium">Claro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      theme === "dark"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <Moon className="h-6 w-6 text-blue-400" />
                    <span className="text-xs font-medium">Escuro</span>
                  </button>
                </div>
              </div>

              {/* Primary color */}
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor Principal</FormLabel>
                          <FormDescription>
                            Escolha uma predefinição ou insira um valor HSL personalizado.
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => field.onChange(c.value)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                                  field.value === c.value
                                    ? "border-foreground shadow-sm"
                                    : "border-border hover:border-muted-foreground/50"
                                }`}
                              >
                                <span
                                  className="w-3 h-3 rounded-full inline-block"
                                  style={{ background: `hsl(${c.value})` }}
                                />
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <FormControl>
                            <Input
                              placeholder="175 60% 25%"
                              {...field}
                              value={field.value || ""}
                              className="mt-2 font-mono text-sm"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logotipo</FormLabel>
                          <FormDescription>
                            URL pública de uma imagem PNG/SVG para exibir como logo.
                          </FormDescription>
                          <FormControl>
                            <Input
                              placeholder="https://exemplo.com/logo.png"
                              {...field}
                              value={field.value || ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-4 border-t">
                      <Button type="submit" disabled={updateCondominium.isPending}>
                        {updateCondominium.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── FINANCEIRO ── */}
        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Financeiras</CardTitle>
              <CardDescription>Regras de juros, multa e padrões de cobrança.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <FormSkeleton />
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="finePercent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Multa por Atraso (%)</FormLabel>
                            <FormDescription>
                              Percentual aplicado sobre cobranças vencidas.
                            </FormDescription>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  {...field}
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
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
                            <FormDescription>
                              Percentual de juros mensais sobre o valor em atraso.
                            </FormDescription>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  {...field}
                                />
                                <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-4 rounded-lg bg-muted/40 border space-y-1">
                      <p className="text-sm font-medium">Como funciona</p>
                      <p className="text-xs text-muted-foreground">
                        Cobranças com status &quot;pendente&quot; após a data de vencimento passam
                        automaticamente a &quot;em atraso&quot;. O sistema aplica multa +
                        juros proporcionais ao calcular o valor atualizado.
                      </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button type="submit" disabled={updateCondominium.isPending}>
                        {updateCondominium.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API ── */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Chaves de API</span>
                <Button size="sm" onClick={() => setNewKeyDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Chave
                </Button>
              </CardTitle>
              <CardDescription>
                Use chaves de API para integrar sistemas externos ao CondoOS de forma segura.
                A chave completa é exibida apenas no momento da criação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma chave criada</p>
                  <p className="text-xs mt-1">Crie uma chave para integrar sistemas externos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{k.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {k.keyPrefix}••••••••••••••••••••••
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                          <Badge variant="outline" className="text-xs">
                            Ativa
                          </Badge>
                          {k.lastUsedAt && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Uso:{" "}
                              {new Date(k.lastUsedAt).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteKeyId(k.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Como usar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Inclua sua chave no header de cada requisição:
              </p>
              <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto font-mono">
                {`Authorization: Bearer condo_sua_chave_aqui`}
              </pre>
              <p className="text-xs text-muted-foreground">
                Todos os endpoints{" "}
                <code className="bg-muted px-1 rounded">/api/*</code> aceitam
                autenticação via chave de API com os mesmos níveis de permissão do
                usuário que a criou.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Chave de API</DialogTitle>
          </DialogHeader>
          {generatedKey ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                  ✓ Chave criada! Copie agora — ela não será exibida novamente.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-background border rounded px-2 py-1.5 font-mono break-all">
                    {generatedKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyKey}>
                    {keyCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setGeneratedKey(null);
                  setNewKeyDialog(false);
                }}
              >
                Fechar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome da chave</label>
                <Input
                  placeholder="Ex: Integração ERP, App Mobile..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateKey()}
                  className="mt-1.5"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewKeyDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || creatingKey}
                >
                  {creatingKey ? "Criando..." : "Criar Chave"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Key Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={(o) => !o && setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar chave de API?</AlertDialogTitle>
            <AlertDialogDescription>
              A chave será desativada imediatamente e todas as integrações que a utilizam
              deixarão de funcionar. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={async () => {
                if (deleteKeyId) {
                  await deleteKey(deleteKeyId);
                  setDeleteKeyId(null);
                  toast.success("Chave revogada com sucesso");
                }
              }}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
