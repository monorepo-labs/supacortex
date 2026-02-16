"use client";

import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persister } from "@/services/tanstack";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1000 }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
