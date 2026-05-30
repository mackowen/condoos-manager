import { useState } from "react";
import { Link } from "wouter";
import { useListMarketplaceListings, useListMarketplaceCategories } from "@workspace/api-client-react";
import type { MarketplaceListing } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Eye,
  Heart,
  Star,
  ShoppingBag,
  Wrench,
  Settings2,
  ListFilter,
  Users,
} from "lucide-react";

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "views", label: "Mais vistos" },
  { value: "highlighted", label: "Destaques" },
];

function formatPrice(price: number | null | undefined) {
  if (price == null) return "Grátis / A combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const img = listing.images?.[0]?.url;
  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={listing.title}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-10 w-10 opacity-30" />
            </div>
          )}
          {listing.isHighlighted && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-amber-500 text-white gap-1 text-xs">
                <Star className="h-3 w-3" /> Destaque
              </Badge>
            </div>
          )}
          {listing.isFavorited && (
            <div className="absolute top-2 right-2">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </div>
          )}
        </div>
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
              {listing.type === "product" ? (
                <ShoppingBag className="h-2.5 w-2.5" />
              ) : (
                <Wrench className="h-2.5 w-2.5" />
              )}
              {listing.type === "product" ? "Produto" : "Serviço"}
            </Badge>
            {listing.categoryName && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {listing.categoryName}
              </Badge>
            )}
          </div>
          <p className="font-medium text-sm leading-tight line-clamp-2">{listing.title}</p>
          <p className="text-base font-bold text-primary">{formatPrice(listing.price)}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {listing.views}
            </span>
            {listing.residentName && (
              <span className="flex items-center gap-1 truncate">
                <Users className="h-3 w-3" />
                <span className="truncate">{listing.residentName.split("@")[0]}</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ListingCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}

export default function MarketplaceIndex() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [type, setType] = useState<"product" | "service" | undefined>();
  const [sort, setSort] = useState("recent");

  const { data: categories = [] } = useListMarketplaceCategories();
  const { data: listings = [], isLoading } = useListMarketplaceListings({
    search: debouncedSearch || undefined,
    categoryId,
    type,
    sort: sort as "recent" | "views" | "highlighted",
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>)["mktSearchTimer"]);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>)["mktSearchTimer"] = setTimeout(() => setDebouncedSearch(v), 300);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Compre, venda e troque com seus vizinhos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/marketplace/meus">
              <ListFilter className="h-4 w-4 mr-1.5" />
              Meus anúncios
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/marketplace/admin">
              <Settings2 className="h-4 w-4 mr-1.5" />
              Admin
            </Link>
          </Button>
          <Button asChild>
            <Link href="/marketplace/criar">
              <Plus className="h-4 w-4 mr-1.5" />
              Anunciar
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar produtos e serviços..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Type filter */}
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          {[
            { value: undefined, label: "Todos" },
            { value: "product" as const, label: "Produtos" },
            { value: "service" as const, label: "Serviços" },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setType(opt.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                type === opt.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sort === opt.value
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryId(undefined)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !categoryId
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/60 hover:text-primary"
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id === categoryId ? undefined : cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryId === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/60 hover:text-primary"
              }`}
            >
              {cat.icon && <span className="mr-1">{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum anúncio encontrado</p>
          <p className="text-sm mt-1">
            {search ? "Tente outros termos de busca" : "Seja o primeiro a anunciar!"}
          </p>
          {!search && (
            <Button className="mt-4" asChild>
              <Link href="/marketplace/criar">
                <Plus className="h-4 w-4 mr-1.5" />
                Criar anúncio
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
