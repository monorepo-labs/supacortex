"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type PanelType = "chat" | "library" | "reader" | "browser";
export type WidthPreset = "narrow" | "medium" | "wide";

export type PanelConfig = {
  id: string;
  type: PanelType;
  widthPreset: WidthPreset;
  bookmarkId?: string;
  url?: string;
  conversationId?: string;
};

const STORAGE_KEY = "workspace-layout";

const DEFAULT_PANELS: PanelConfig[] = [
  { id: "panel-chat", type: "chat", widthPreset: "wide" },
];

function loadPanels(): PanelConfig[] {
  if (typeof window === "undefined") return DEFAULT_PANELS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_PANELS;
}

function savePanels(panels: PanelConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
  } catch {
    // ignore
  }
}

let panelCounter = Date.now();
function generatePanelId(): string {
  return `panel-${++panelCounter}`;
}

export function useWorkspace() {
  const [panels, setPanels] = useState<PanelConfig[]>(loadPanels);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    savePanels(panels);
  }, [panels]);

  const addPanel = useCallback(
    (type: PanelType, options?: { widthPreset?: WidthPreset; bookmarkId?: string; url?: string; conversationId?: string }) => {
      setPanels((prev) => [
        ...prev,
        {
          id: generatePanelId(),
          type,
          widthPreset: options?.widthPreset ?? "medium",
          bookmarkId: options?.bookmarkId,
          url: options?.url,
          conversationId: options?.conversationId,
        },
      ]);
    },
    [],
  );

  const updatePanel = useCallback((id: string, updates: Partial<Omit<PanelConfig, "id">>) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const removePanel = useCallback((id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reorderPanels = useCallback((fromIndex: number, toIndex: number) => {
    setPanels((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const resizePanel = useCallback((id: string, preset: WidthPreset) => {
    setPanels((prev) =>
      prev.map((p) => {
        if (p.id !== id) {
          // If the new preset is "wide", demote any other wide panel to medium
          if (preset === "wide" && p.widthPreset === "wide") {
            return { ...p, widthPreset: "medium" };
          }
          return p;
        }
        return { ...p, widthPreset: preset };
      }),
    );
  }, []);

  const cycleWidth = useCallback((id: string) => {
    setPanels((prev) => {
      const panel = prev.find((p) => p.id === id);
      if (!panel) {
        console.log("[cycleWidth] panel not found:", id);
        return prev;
      }
      const order: WidthPreset[] = panel.type === "reader" || panel.type === "browser"
        ? ["medium", "wide"]
        : ["narrow", "medium", "wide"];
      const nextPreset = order[(order.indexOf(panel.widthPreset) + 1) % order.length];
      console.log(`[cycleWidth] ${panel.type} (${id}): ${panel.widthPreset} → ${nextPreset}`);
      return prev.map((p) => {
        if (p.id === id) return { ...p, widthPreset: nextPreset };
        // Demote other wide panels
        if (nextPreset === "wide" && p.widthPreset === "wide") {
          console.log(`[cycleWidth] demoting ${p.type} (${p.id}) from wide → medium`);
          return { ...p, widthPreset: "medium" };
        }
        return p;
      });
    });
  }, []);

  const togglePanel = useCallback((type: PanelType) => {
    setPanels((prev) => {
      const existing = prev.filter((p) => p.type === type);
      if (existing.length > 0) {
        // Remove the last panel of this type
        const last = existing[existing.length - 1];
        return prev.filter((p) => p.id !== last.id);
      }
      const defaultPreset: WidthPreset = type === "chat" ? "wide" : "medium";
      return [
        // If adding chat, demote any existing wide panel
        ...(type === "chat"
          ? prev.map((p) =>
              p.widthPreset === "wide" ? { ...p, widthPreset: "medium" as WidthPreset } : p,
            )
          : prev),
        {
          id: generatePanelId(),
          type,
          widthPreset: defaultPreset,
        },
      ];
    });
  }, []);

  const hasPanel = useCallback(
    (type: PanelType) => panels.some((p) => p.type === type),
    [panels],
  );

  const getPanelsByType = useCallback(
    (type: PanelType) => panels.filter((p) => p.type === type),
    [panels],
  );

  return {
    panels,
    addPanel,
    updatePanel,
    removePanel,
    reorderPanels,
    resizePanel,
    cycleWidth,
    togglePanel,
    hasPanel,
    getPanelsByType,
  };
}
