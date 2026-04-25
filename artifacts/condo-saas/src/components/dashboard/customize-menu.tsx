import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sliders, RotateCcw, GripVertical } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WIDGET_CATALOG, type WidgetConfig, type WidgetId } from "./types";

interface Props {
  layout: WidgetConfig[];
  onToggle: (id: WidgetId) => void;
  onReset: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financeiro",
  intelligent: "Indicadores inteligentes",
  operational: "Operação",
  alerts: "Alertas",
};

export function CustomizeMenu({ layout, onToggle, onReset }: Props) {
  const [open, setOpen] = useState(false);

  const grouped = layout.reduce<Record<string, WidgetConfig[]>>((acc, w) => {
    const cat = WIDGET_CATALOG[w.id].category;
    (acc[cat] ??= []).push(w);
    return acc;
  }, {});

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Sliders className="h-4 w-4" />
          Personalizar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <div>
            <div className="text-sm font-semibold">Personalizar painel</div>
            <div className="text-xs text-muted-foreground">Mostre, oculte ou reordene blocos</div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onReset}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Resetar
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {Object.entries(grouped).map(([cat, widgets]) => (
              <div key={cat} className="mb-2">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                {widgets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <Label
                      htmlFor={`vis-${w.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {WIDGET_CATALOG[w.id].title}
                    </Label>
                    <Switch
                      id={`vis-${w.id}`}
                      checked={w.visible}
                      onCheckedChange={() => onToggle(w.id)}
                    />
                  </div>
                ))}
                <Separator className="my-1" />
              </div>
            ))}
            <div className="px-2 py-2 text-[11px] text-muted-foreground">
              Dica: arraste os blocos diretamente no painel para reordenar.
            </div>
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
