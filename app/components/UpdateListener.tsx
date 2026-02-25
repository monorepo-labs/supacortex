"use client";

import { useEffect } from "react";
import { sileo } from "sileo";

export default function UpdateListener() {
  useEffect(() => {
    const isTauri = !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
    if (!isTauri) return;

    let unlisten1: (() => void) | undefined;
    let unlisten2: (() => void) | undefined;

    (async () => {
      const { listen } = await import("@tauri-apps/api/event");

      unlisten1 = await listen<{ version: string; body: string | null }>(
        "update-available",
        (event) => {
          sileo.info({
            title: `Update v${event.payload.version} available`,
            description: "Downloading in background...",
            duration: 5000,
          });
        },
      );

      unlisten2 = await listen("update-downloaded", () => {
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
      });
    })();

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, []);

  return null;
}
