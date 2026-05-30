import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  useGetMarketplaceListing,
  useToggleFavorite,
  useReportListing,
  useListMarketplaceListings,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Heart,
  Flag,
  Eye,
  Phone,
  MessageCircle,
  Star,
  ShoppingBag,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  Tag,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatPrice(price: number | null | undefined) {
  if (price == null) return "Grátis / A combinar";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function ImageGallery({ images }: { images: { id: string; url: string }[] }) {
  const [current, setCurrent] = useState(0);
  if (images.length === 0) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground opacity-30" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <img
          src={images[current].url}
          alt={`Imagem ${current + 1}`}
          className="w-full h-full object-contain"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === current ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${
                i === current ? "border-primary" : "border-transparent"
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportDialog({
  open,
  onClose,
  listingId,
}: {
  open: boolean;
  onClose: () => void;
  listingId: string;
}) {
  const [reason, setReason] = useState("");
  const report = useReportListing();

  const handleSubmit = () => {
    if (reason.trim().length < 5) {
      toast.error("Descreva o motivo com ao menos 5 caracteres");
      return;
    }
    report.mutate(
      { id: listingId, data: { reason } },
      {
        onSuccess: () => {
          toast.success("Denúncia enviada. Obrigado!");
          onClose();
          setReason("");
        },
        onError: () => toast.error("Erro ao enviar denúncia"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Denunciar anúncio</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Motivo da denúncia</Label>
          <Textarea
            placeholder="Descreva o problema com este anúncio..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={report.isPending}
          >
            Enviar denúncia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MarketplaceListingPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [reportOpen, setReportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: listing, isLoading } = useGetMarketplaceListing(id!);
  const { data: similar = [] } = useListMarketplaceListings({ sort: "recent" });
  const toggleFav = useToggleFavorite();

  const handleFavorite = () => {
    toggleFav.mutate(
      { id: id! },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["/marketplace/listings"] });
          queryClient.invalidateQueries({ queryKey: [`/marketplace/listings/${id}`] });
          toast.success(data.isFavorited ? "Adicionado aos favoritos" : "Removido dos favoritos");
        },
        onError: () => toast.error("Erro ao favoritar"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Anúncio não encontrado</p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/marketplace">Voltar ao marketplace</Link>
        </Button>
      </div>
    );
  }

  const similarListings = similar
    .filter((l) => l.id !== id && (l.categoryId === listing.categoryId || l.type === listing.type))
    .slice(0, 4);

  const isPhoneNumber = (s: string) => /^[\d\s\(\)\+\-]{8,}$/.test(s);
  const whatsappLink =
    listing.contactInfo && isPhoneNumber(listing.contactInfo)
      ? `https://wa.me/55${listing.contactInfo.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vi seu anúncio "${listing.title}" no marketplace do condomínio.`)}`
      : null;

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8 pb-8">
        {/* Back */}
        <button
          onClick={() => navigate("/marketplace")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao marketplace
        </button>

        {/* Main content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <ImageGallery images={listing.images ?? []} />

          {/* Info */}
          <div className="space-y-4">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              {listing.isHighlighted && (
                <Badge className="bg-amber-500 text-white gap-1">
                  <Star className="h-3 w-3" /> Destaque
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                {listing.type === "product" ? (
                  <ShoppingBag className="h-3 w-3" />
                ) : (
                  <Wrench className="h-3 w-3" />
                )}
                {listing.type === "product" ? "Produto" : "Serviço"}
              </Badge>
              {listing.categoryName && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {listing.categoryName}
                </Badge>
              )}
            </div>

            {/* Title & price */}
            <div>
              <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
              <p className="text-2xl font-bold text-primary mt-1">{formatPrice(listing.price)}</p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {listing.views} visualizações
              </span>
              {listing.residentName && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {listing.residentName.split("@")[0]}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDistanceToNow(new Date(listing.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>

            {/* Description */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>

            {/* Contact */}
            {listing.contactInfo && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Contato</p>
                <div className="flex gap-2">
                  {whatsappLink ? (
                    <Button className="flex-1 bg-green-600 hover:bg-green-700" asChild>
                      <a href={whatsappLink} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{listing.contactInfo}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant={listing.isFavorited ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={handleFavorite}
                disabled={toggleFav.isPending}
              >
                <Heart
                  className={`h-4 w-4 ${listing.isFavorited ? "fill-current" : ""}`}
                />
                {listing.isFavorited ? "Favoritado" : "Favoritar"}
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
                onClick={() => setReportOpen(true)}
              >
                <Flag className="h-4 w-4" />
                Denunciar
              </Button>
            </div>
          </div>
        </div>

        {/* Similar listings */}
        {similarListings.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Anúncios parecidos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {similarListings.map((l) => (
                <Link key={l.id} href={`/marketplace/${l.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden">
                    <div className="aspect-[4/3] bg-muted overflow-hidden">
                      {l.images?.[0] ? (
                        <img
                          src={l.images[0].url}
                          alt={l.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 opacity-20" />
                        </div>
                      )}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{l.title}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{formatPrice(l.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        listingId={id!}
      />
    </>
  );
}
