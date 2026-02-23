"use client";

import { useEffect } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister, CACHE_VERSION } from "@/services/tanstack";

function ExternalLinkHandler() {
  useEffect(() => {
    const isTauri = !!(window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__;
    if (!isTauri) return;

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      // Skip links inside chat panel — ChatLinkInterceptor handles those
      if (target.closest("[data-chat-links]")) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("/") || href.startsWith("#") || href.startsWith("javascript")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) return;
        e.preventDefault();
        import("@tauri-apps/plugin-shell").then(({ open }) => open(url.href)).catch(console.error);
      } catch {
        // invalid URL, let browser handle it
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1000, buster: CACHE_VERSION }}
    >
      <ExternalLinkHandler />
      {children}
    </PersistQueryClientProvider>
  );
}
