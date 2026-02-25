"use client";

import { useEffect } from "react";
import { sileo } from "sileo";

export default function UpdateListener() {
  useEffect(() => {
    const isTauri = !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
    if (!isTauri) return;

    let unlisteners: (() => void)[] = [];
    let cancelled = false;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      if (cancelled) return;

      unlisteners.push(await listen<{ version: string; body: string | null }>(
        "update-available",
        (event) => {
          sileo.info({
            title: `Update v${event.payload.version} available`,
            description: "Downloading in background...",
            duration: 5000,
          });
        },
      ));

      if (cancelled) { unlisteners.forEach((u) => u()); return; }

      unlisteners.push(await listen("update-downloaded", () => {
        sileo.action({
          title: "Update ready",
          description: "Restart to apply the update.",
          duration: null,
          button: {
            title: "Restart now",
            onClick: async () => {
              const { relaunch } = await import("@tauri-apps/plugin-process");
              await relaunch();
            },
          },
        });
      }));

      if (cancelled) { unlisteners.forEach((u) => u()); return; }

      unlisteners.push(await listen("update-not-available", () => {
        sileo.success({
          title: "You're up to date",
          duration: 3000,
        });
      }));

      if (cancelled) { unlisteners.forEach((u) => u()); return; }
    })();

    return () => {
      cancelled = true;
      unlisteners.forEach((u) => u());
    };
  }, []);

  return null;
}
