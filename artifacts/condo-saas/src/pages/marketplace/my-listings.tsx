import { Link } from "wouter";
import { useListMyListings, useDeleteMarketplaceListing } from "@workspace/api-client-react";
import type { MarketplaceListing } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Edit2,
  Trash2,
  Eye,
  Heart,
  ShoppingBag,
  Wrench,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ativo
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
          <Clock className="h-3 w-3" /> Aguardando
        </Badge>
      );
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
          <XCircle className="h-3 w-3" /> Rejeitado
        </Badge>
      );
    case "inactive":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1">
          <Ban className="h-3 w-3" /> Inativo
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatPrice(price: number | null | undefined) {
  if (price == null) return "A combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ListingRow({ listing }: { listing: MarketplaceListing }) {
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteMarketplaceListing();
  const img = listing.images?.[0]?.url;

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: listing.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/marketplace/my-listings"] });
          toast.success("Anúncio removido");
        },
        onError: () => toast.error("Erro ao remover anúncio"),
      },
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
            {img ? (
              <img src={img} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {listing.type === "product" ? (
                  <ShoppingBag className="h-7 w-7 text-muted-foreground opacity-40" />
                ) : (
                  <Wrench className="h-7 w-7 text-muted-foreground opacity-40" />
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {statusBadge(listing.status)}
                  {listing.isHighlighted && (
                    <Badge className="bg-amber-500 text-white gap-1 text-xs">
                      <Star className="h-3 w-3" /> Destaque
                    </Badge>
                  )}
                </div>
                <p className="font-medium truncate">{listing.title}</p>
              </div>
              <p className="font-bold text-primary flex-shrink-0">{formatPrice(listing.price)}</p>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-1">{listing.description}</p>

            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {listing.views} views
                </span>
                {listing.isFavorited && (
                  <span className="flex items-center gap-1 text-red-500">
                    <Heart className="h-3 w-3 fill-current" />
                    Favoritado
                  </span>
                )}
                <span>
                  {formatDistanceToNow(new Date(listing.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>

              <div className="flex gap-2">
                {listing.status === "active" && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/marketplace/${listing.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Link>
                  </Button>
                )}
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/marketplace/editar/${listing.id}`}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
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
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketplaceMyListings() {
  const { data: listings = [], isLoading } = useListMyListings();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus anúncios</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus anúncios no marketplace
          </p>
        </div>
        <Button asChild>
          <Link href="/marketplace/criar">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo anúncio
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {listings.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: listings.length, color: "text-foreground" },
            {
              label: "Ativos",
              value: listings.filter((l) => l.status === "active").length,
              color: "text-green-600",
            },
            {
              label: "Aguardando",
              value: listings.filter((l) => l.status === "pending").length,
              color: "text-amber-600",
            },
            {
              label: "Views totais",
              value: listings.reduce((acc, l) => acc + l.views, 0),
              color: "text-blue-600",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Listings */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-20 h-20 rounded-md flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-7 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Você ainda não tem anúncios</p>
          <p className="text-sm mt-1">Crie seu primeiro anúncio agora!</p>
          <Button className="mt-4" asChild>
            <Link href="/marketplace/criar">
              <Plus className="h-4 w-4 mr-1.5" />
              Criar anúncio
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <ListingRow key={l.id} listing={l} />
          ))}
        </div>
      )}

      {/* Quick link back */}
      <div className="text-center">
        <Button variant="ghost" asChild>
          <Link href="/marketplace">← Voltar ao marketplace</Link>
        </Button>
      </div>
    </div>
  );
}
