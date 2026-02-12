"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/services/tanstack";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
