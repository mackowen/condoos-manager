import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import {
  useCreateMarketplaceListing,
  useUpdateMarketplaceListing,
  useGetMarketplaceListing,
  useListMarketplaceCategories,
  useAddMarketplaceImage,
  useDeleteMarketplaceImage,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShoppingBag,
  Wrench,
  Loader2,
} from "lucide-react";

const formSchema = z.object({
  title: z.string().min(3, "Título deve ter ao menos 3 caracteres"),
  description: z.string().min(10, "Descrição deve ter ao menos 10 caracteres"),
  type: z.union([z.literal("product"), z.literal("service")]),
  categoryId: z.string().optional().nullable(),
  price: z.string().optional(),
  contactInfo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function ImageUploader({
  listingId,
  images,
  onRefresh,
}: {
  listingId?: string;
  images: { id: string; url: string }[];
  onRefresh: () => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const addImage = useAddMarketplaceImage();
  const deleteImage = useDeleteMarketplaceImage();

  const handleAdd = () => {
    if (!listingId) return;
    const url = urlInput.trim();
    if (!url || url.length < 5) {
      toast.error("Digite uma URL válida");
      return;
    }
    addImage.mutate(
      { id: listingId, data: { url, order: images.length } },
      {
        onSuccess: () => {
          setUrlInput("");
          onRefresh();
          toast.success("Imagem adicionada");
        },
        onError: (e: Error) => toast.error(e.message || "Erro ao adicionar imagem"),
      },
    );
  };

  const handleDelete = (imageId: string) => {
    if (!listingId) return;
    deleteImage.mutate(
      { id: listingId, imageId },
      {
        onSuccess: () => {
          onRefresh();
          toast.success("Imagem removida");
        },
      },
    );
  };

  if (!listingId) {
    return (
      <p className="text-sm text-muted-foreground">
        Salve o anúncio primeiro para adicionar imagens
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-md overflow-hidden bg-muted">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <Trash2 className="h-5 w-5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < 5 && (
        <div className="flex gap-2">
          <Input
            placeholder="URL da imagem (ex: https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            disabled={addImage.isPending}
          >
            {addImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {images.length}/5 imagens • Cole a URL de uma imagem da internet
      </p>
    </div>
  );
}

export default function MarketplaceCreate() {
  const { id: editId } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [savedId, setSavedId] = useState<string | undefined>(editId);

  const isEdit = !!editId;
  const { data: existing, isLoading: loadingExisting } = useGetMarketplaceListing(
    editId ?? "",
  );
  const { data: categories = [] } = useListMarketplaceCategories();
  const create = useCreateMarketplaceListing();
  const update = useUpdateMarketplaceListing();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema as never),
    defaultValues: { type: "product" },
  });

  useEffect(() => {
    if (existing && isEdit) {
      reset({
        title: existing.title,
        description: existing.description,
        type: existing.type as "product" | "service",
        categoryId: existing.categoryId ?? undefined,
        price: existing.price != null ? String(existing.price) : "",
        contactInfo: existing.contactInfo ?? "",
      });
    }
  }, [existing, isEdit, reset]);

  const type = watch("type");

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description,
      type: values.type,
      categoryId: values.categoryId || undefined,
      price: values.price ? parseFloat(values.price.replace(",", ".")) : undefined,
      contactInfo: values.contactInfo || undefined,
    };

    if (isEdit && editId) {
      update.mutate(
        { id: editId, data: payload },
        {
          onSuccess: () => {
            toast.success("Anúncio atualizado!");
            navigate("/marketplace/meus");
          },
          onError: (e: Error) => toast.error(e.message || "Erro ao atualizar"),
        },
      );
    } else {
      create.mutate(
        { data: payload },
        {
          onSuccess: (data) => {
            setSavedId(data.id);
            toast.success(
              data.status === "pending"
                ? "Anúncio criado! Aguardando aprovação."
                : "Anúncio publicado!",
            );
          },
          onError: (e: Error) => toast.error(e.message || "Erro ao criar anúncio"),
        },
      );
    }
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={isEdit ? "/marketplace/meus" : "/marketplace"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? "Editar anúncio" : "Criar anúncio"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Atualize as informações do seu anúncio" : "Preencha os dados do seu anúncio"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">Informações básicas</h2>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo de anúncio</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "product", label: "Produto", icon: ShoppingBag, desc: "Venda ou troque um item" },
                  { value: "service", label: "Serviço", icon: Wrench, desc: "Ofereça um serviço" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("type", opt.value as "product" | "service")}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      type === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <opt.icon
                      className={`h-5 w-5 flex-shrink-0 ${
                        type === opt.value ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className={`font-medium text-sm ${type === opt.value ? "text-primary" : ""}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" placeholder="Ex: Bicicleta aro 29 em ótimo estado" {...register("title")} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva o item com detalhes: estado de conservação, características, motivo da venda..."
                rows={4}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>

            {/* Category & Price */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={watch("categoryId") ?? ""}
                  onValueChange={(v) => setValue("categoryId", v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon && <span className="mr-1">{cat.icon}</span>}
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Deixe vazio para 'A combinar'"
                  {...register("price")}
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="contactInfo">Contato (telefone / WhatsApp)</Label>
              <Input
                id="contactInfo"
                placeholder="Ex: (11) 99999-9999"
                {...register("contactInfo")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Images section */}
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Imagens</h2>
              <span className="text-xs text-muted-foreground">(opcional, máx. 5)</span>
            </div>
            <ImageUploader
              listingId={savedId}
              images={
                (savedId && existing?.id === savedId ? existing.images : []) ??
                (existing?.images ?? [])
              }
              onRefresh={() => {}}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href={isEdit ? "/marketplace/meus" : "/marketplace"}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting || create.isPending || update.isPending}>
            {(isSubmitting || create.isPending || update.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isEdit ? "Salvar alterações" : "Publicar anúncio"}
          </Button>
        </div>
      </form>

      {savedId && !isEdit && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-green-800">
              ✅ Anúncio salvo! Adicione imagens acima e depois veja seu anúncio.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/marketplace/meus">Meus anúncios</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/marketplace/${savedId}`}>Ver anúncio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
