import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LAYOUT, type WidgetConfig, type WidgetId } from "@/components/dashboard/types";

const STORAGE_KEY = "condo_dashboard_layout_v1";

function loadLayout(): WidgetConfig[] {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as WidgetConfig[];
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;
    const seen = new Set<WidgetId>();
    const cleaned: WidgetConfig[] = [];
    for (const w of parsed) {
      if (w && typeof w.id === "string" && DEFAULT_LAYOUT.some((d) => d.id === w.id) && !seen.has(w.id as WidgetId)) {
        cleaned.push({ id: w.id as WidgetId, visible: w.visible !== false });
        seen.add(w.id as WidgetId);
      }
    }
    for (const d of DEFAULT_LAYOUT) {
      if (!seen.has(d.id)) cleaned.push(d);
    }
    return cleaned;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: WidgetConfig[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* noop */
  }
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<WidgetConfig[]>(() => loadLayout());

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const toggleVisibility = useCallback((id: WidgetId) => {
    setLayout((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }, []);

  const reorder = useCallback((from: WidgetId, to: WidgetId) => {
    setLayout((prev) => {
      const fromIdx = prev.findIndex((w) => w.id === from);
      const toIdx = prev.findIndex((w) => w.id === to);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = prev.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  return { layout, toggleVisibility, reorder, reset };
}
