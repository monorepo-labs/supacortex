"use client";

import { useQuery, useMutation } from "@tanstack/react-query";

export function usePaymentStatus() {
  return useQuery({
    queryKey: ["payment-status"],
    queryFn: async (): Promise<{ hasPaid: boolean }> => {
      const res = await fetch("/api/payments/status");
      if (!res.ok) throw new Error("Failed to fetch payment status");
      return res.json();
    },
    staleTime: 60_000,
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (): Promise<{ url: string }> => {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create checkout session");
      }
      return res.json();
    },
  });
}
