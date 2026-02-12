"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/services/tanstack";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
