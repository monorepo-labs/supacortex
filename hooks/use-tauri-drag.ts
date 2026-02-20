"use client";

import { useCallback } from "react";

function isInteractive(el: HTMLElement): boolean {
  return !!el.closest("button, a, input, textarea, select, [role='button']");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTauri(): any {
  return (window as any).__TAURI_INTERNALS__;
}

export function useTauriDrag() {
  return useCallback((e: React.MouseEvent) => {
    const tauri = getTauri();
    if (!tauri) return;
    if (isInteractive(e.target as HTMLElement)) return;

    // Tauri v2 IPC: invoke the native drag
    tauri.invoke("plugin:window|start_dragging");
  }, []);
}
