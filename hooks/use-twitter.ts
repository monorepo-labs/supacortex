"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export function useTwitterAccount() {
  return useQuery({
    queryKey: ["twitter-account"],
    queryFn: async () => {
      const { data } = await authClient.listAccounts();
      const twitter = data?.find(
        (a) => a.providerId === "twitter",
      );
      return twitter ?? null;
    },
  });
}

export function useLinkTwitter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await authClient.linkSocial({
        provider: "twitter",
        callbackURL: "/app/library",
        scopes: ["bookmark.read", "tweet.read", "users.read", "offline.access"],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twitter-account"] });
    },
  });
}

export function useSyncTwitter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/twitter/sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Sync failed");
      }
      return res.json() as Promise<{ synced: number; skipped: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
}
