import { useState } from "react";
import {
  useListAdminMarketplaceListings,
  useApproveMarketplaceListing,
  useRejectMarketplaceListing,
  useToggleHighlightListing,
  useDeleteMarketplaceListing,
  useListMarketplaceReports,
  useReviewMarketplaceReport,
  useListMarketplaceCategories,
  useCreateMarketplaceCategory,
  useDeleteMarketplaceCategory,
  useGetMarketplaceSettings,
  useUpdateMarketplaceSettings,
} from "@workspace/api-client-react";
import type { MarketplaceListing, MarketplaceReport, MarketplaceCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Star,
  Trash2,
  Flag,
  Tag,
  Settings2,
  Plus,
  ShoppingBag,
  Eye,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "A combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ListingAdminCard({ listing }: { listing: MarketplaceListing }) {
  const qc = useQueryClient();
  const approve = useApproveMarketplaceListing();
  const reject = useRejectMarketplaceListing();
  const highlight = useToggleHighlightListing();
  const del = useDeleteMarketplaceListing();

  const img = listing.images?.[0]?.url;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/marketplace/admin/listings"] });
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0 w-16 h-16 rounded bg-muted overflow-hidden">
          {img ? (
            <img src={img} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 opacity-20" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {listing.status === "pending" && (
              <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs">
                <Clock className="h-2.5 w-2.5" /> Pendente
              </Badge>
            )}
            {listing.status === "active" && (
              <Badge className="bg-green-100 text-green-700 gap-1 text-xs">
                <CheckCircle2 className="h-2.5 w-2.5" /> Ativo
              </Badge>
            )}
            {listing.status === "rejected" && (
              <Badge className="bg-red-100 text-red-700 gap-1 text-xs">
                <XCircle className="h-2.5 w-2.5" /> Rejeitado
              </Badge>
            )}
            {listing.isHighlighted && (
              <Badge className="bg-amber-500 text-white gap-1 text-xs">
                <Star className="h-2.5 w-2.5" /> Destaque
              </Badge>
            )}
            {listing.categoryName && (
              <Badge variant="outline" className="text-xs">{listing.categoryName}</Badge>
            )}
          </div>
          <p className="font-medium text-sm truncate">{listing.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {listing.residentName?.split("@")[0]}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.views}
            </span>
            <span>{formatPrice(listing.price)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1 px-3 pb-3 flex-wrap">
        {listing.status === "pending" && (
          <>
            <Button
              size="sm"
              className="gap-1 bg-green-600 hover:bg-green-700 text-xs"
              disabled={approve.isPending}
              onClick={() =>
                approve.mutate(
                  { id: listing.id },
                  { onSuccess: invalidate, onError: () => toast.error("Erro") },
                )
              }
            >
              <CheckCircle2 className="h-3 w-3" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1 text-xs"
              disabled={reject.isPending}
              onClick={() =>
                reject.mutate(
                  { id: listing.id },
                  { onSuccess: invalidate, onError: () => toast.error("Erro") },
                )
              }
            >
              <XCircle className="h-3 w-3" /> Rejeitar
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant={listing.isHighlighted ? "default" : "outline"}
          className="gap-1 text-xs"
          disabled={highlight.isPending}
          onClick={() =>
            highlight.mutate(
              { id: listing.id },
              { onSuccess: invalidate, onError: () => toast.error("Erro") },
            )
          }
        >
          <Star className={`h-3 w-3 ${listing.isHighlighted ? "fill-current" : ""}`} />
          {listing.isHighlighted ? "Remover destaque" : "Destacar"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" /> Remover
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
              <AlertDialogDescription>
                O anúncio &ldquo;{listing.title}&rdquo; será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={() =>
                  del.mutate(
                    { id: listing.id },
                    {
                      onSuccess: () => {
                        invalidate();
                        toast.success("Anúncio removido");
                      },
                    },
                  )
                }
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

function ReportRow({ report }: { report: MarketplaceReport }) {
  const qc = useQueryClient();
  const review = useReviewMarketplaceReport();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge
                variant={report.status === "pending" ? "destructive" : "outline"}
                className="text-xs"
              >
                {report.status === "pending" ? "Pendente" : "Revisado"}
              </Badge>
              {report.listingTitle && (
                <p className="text-sm font-medium truncate">{report.listingTitle}</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{report.reason}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: ptBR })}
            </p>
          </div>
          {report.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              onClick={() =>
                review.mutate(
                  { id: report.id },
                  {
                    onSuccess: () => {
                      qc.invalidateQueries({ queryKey: ["/marketplace/admin/reports"] });
                      toast.success("Marcado como revisado");
                    },
                  },
                )
              }
            >
              {review.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Marcar revisado"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryRow({ cat }: { cat: MarketplaceCategory }) {
  const qc = useQueryClient();
  const del = useDeleteMarketplaceCategory();
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm font-medium">
        {cat.icon && <span className="mr-2">{cat.icon}</span>}
        {cat.name}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive hover:text-destructive"
        onClick={() =>
          del.mutate(
            { id: cat.id },
            {
              onSuccess: () => {
                qc.invalidateQueries({ queryKey: ["/marketplace/categories"] });
                toast.success("Categoria removida");
              },
            },
          )
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SettingsPanel() {
  const { data: settings, isLoading } = useGetMarketplaceSettings();
  const update = useUpdateMarketplaceSettings();
  const qc = useQueryClient();

  const toggle = (key: string, value: boolean) => {
    update.mutate(
      { data: { [key]: value } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/marketplace/settings"] });
          toast.success("Configuração atualizada");
        },
        onError: () => toast.error("Erro ao salvar"),
      },
    );
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (!settings) return null;

  const settingsList = [
    { key: "enabled", label: "Marketplace ativo", desc: "Permite acesso ao marketplace", value: settings.enabled },
    { key: "requireApproval", label: "Requer aprovação", desc: "Novos anúncios precisam de aprovação do admin", value: settings.requireApproval },
    { key: "allowProducts", label: "Permitir produtos", desc: "Moradores podem anunciar produtos", value: settings.allowProducts },
    { key: "allowServices", label: "Permitir serviços", desc: "Moradores podem oferecer serviços", value: settings.allowServices },
    { key: "allowImages", label: "Permitir imagens", desc: "Anúncios podem ter imagens", value: settings.allowImages },
  ];

  return (
    <div className="space-y-4">
      {settingsList.map((s) => (
        <div key={s.key} className="flex items-center justify-between py-3 border-b last:border-0">
          <div>
            <p className="font-medium text-sm">{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
          <Switch
            checked={s.value}
            onCheckedChange={(v) => toggle(s.key, v)}
            disabled={update.isPending}
          />
        </div>
      ))}
      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        <div className="space-y-1.5">
          <Label className="text-sm">Máx. anúncios por usuário</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              defaultValue={settings.maxListingsPerUser}
              className="w-24"
              onBlur={(e) => {
                const v = parseInt(e.target.value);
                if (v > 0 && v !== settings.maxListingsPerUser) {
                  update.mutate({ data: { maxListingsPerUser: v } }, {
                    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/marketplace/settings"] }); toast.success("Salvo"); },
                  });
                }
              }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Máx. imagens por anúncio</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={5}
              defaultValue={settings.maxImagesPerListing}
              className="w-24"
              onBlur={(e) => {
                const v = parseInt(e.target.value);
                if (v > 0 && v !== settings.maxImagesPerListing) {
                  update.mutate({ data: { maxImagesPerListing: v } }, {
                    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/marketplace/settings"] }); toast.success("Salvo"); },
                  });
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceAdmin() {
  const [statusFilter, setStatusFilter] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");

  const { data: pendingListings = [], isLoading: loadingPending } = useListAdminMarketplaceListings({ status: "pending" });
  const { data: allListings = [], isLoading: loadingAll } = useListAdminMarketplaceListings(
    statusFilter ? { status: statusFilter } : {},
  );
  const { data: reports = [], isLoading: loadingReports } = useListMarketplaceReports();
  const { data: categories = [] } = useListMarketplaceCategories();
  const createCat = useCreateMarketplaceCategory();
  const qc = useQueryClient();

  const handleCreateCategory = () => {
    if (!newCatName.trim()) return;
    createCat.mutate(
      { data: { name: newCatName.trim(), icon: newCatIcon.trim() || undefined } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/marketplace/categories"] });
          toast.success("Categoria criada");
          setNewCatName("");
          setNewCatIcon("");
        },
        onError: () => toast.error("Erro ao criar categoria"),
      },
    );
  };

  const pendingCount = pendingListings.length;
  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          Admin — Marketplace
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie anúncios, categorias e configurações</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: allListings.length, icon: ShoppingBag, color: "text-blue-600" },
          { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-amber-600" },
          { label: "Denúncias", value: pendingReports, icon: Flag, color: "text-red-600" },
          { label: "Categorias", value: categories.length, icon: Tag, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pending" className="relative">
            Pendentes
            {pendingCount > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 text-[10px] bg-amber-500">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            Denúncias
            {pendingReports > 0 && (
              <Badge className="ml-1.5 h-4 w-4 p-0 text-[10px] bg-red-500">{pendingReports}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="settings">Config.</TabsTrigger>
        </TabsList>

        {/* Pendentes */}
        <TabsContent value="pending" className="mt-4 space-y-3">
          {loadingPending ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : pendingListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500 opacity-50" />
              <p>Nenhum anúncio pendente!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {pendingListings.map((l) => <ListingAdminCard key={l.id} listing={l} />)}
            </div>
          )}
        </TabsContent>

        {/* Todos */}
        <TabsContent value="all" className="mt-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {["", "active", "pending", "rejected", "inactive"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs border font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/60"
                }`}
              >
                {s === "" ? "Todos" : s === "active" ? "Ativos" : s === "pending" ? "Pendentes" : s === "rejected" ? "Rejeitados" : "Inativos"}
              </button>
            ))}
          </div>
          {loadingAll ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : allListings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhum anúncio encontrado</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {allListings.map((l) => <ListingAdminCard key={l.id} listing={l} />)}
            </div>
          )}
        </TabsContent>

        {/* Denúncias */}
        <TabsContent value="reports" className="mt-4 space-y-3">
          {loadingReports ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Flag className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>Nenhuma denúncia encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => <ReportRow key={r.id} report={r} />)}
            </div>
          )}
        </TabsContent>

        {/* Categorias */}
        <TabsContent value="categories" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categorias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Emoji (opcional)"
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-24"
                />
                <Input
                  placeholder="Nome da categoria"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
                  className="flex-1"
                />
                <Button onClick={handleCreateCategory} disabled={createCat.isPending}>
                  {createCat.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma categoria criada
                  </p>
                ) : (
                  categories.map((cat) => <CategoryRow key={cat.id} cat={cat} />)
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configurações do Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
