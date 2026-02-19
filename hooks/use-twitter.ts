"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function formatResetTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  return isToday ? time : `${time} tomorrow`;
}

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
    staleTime: 0,
    gcTime: 0,
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

export function useUnlinkTwitter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await authClient.unlinkAccount({
        providerId: "twitter",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["twitter-account"] });
    },
  });
}

type SyncResponse = {
  synced: number;
  status: "completed" | "interrupted";
  rateLimitResetsAt: string | null;
  apiCalls: number;
  tweetsTotal: number;
  durationMs: number;
  mode: string;
  syncLogId: string;
};

export function useSyncTwitter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sinceYear?: number) => {
      const res = await fetch("/api/twitter/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sinceYear: sinceYear ?? null }),
      });
      if (!res.ok) {
        const body = await res.json();
        if (res.status === 429 && body.rateLimitResetsAt) {
          throw new Error(`Rate limited by X. Try again at ${formatResetTime(body.rateLimitResetsAt)}`);
        }
        throw new Error(body.error ?? "Sync failed");
      }
      return res.json() as Promise<SyncResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    },
    onError: () => {
      // Sync may have saved bookmarks before failing — refresh UI
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    },
  });
}

type SyncStatus = {
  status: "none" | "in_progress" | "completed" | "interrupted";
  rateLimitResetsAt?: string | null;
  syncLogId?: string;
  tweetsSynced?: number;
  tweetsTotal?: number;
  createdAt?: string | null;
};

export function useSyncStatus(enabled = true) {
  return useQuery({
    queryKey: ["sync-status"],
    queryFn: async (): Promise<SyncStatus> => {
      try {
        const res = await fetch("/api/twitter/sync/status");
        if (!res.ok) return { status: "none" };
        return await res.json();
      } catch {
        return { status: "none" };
      }
    },
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 30s when interrupted (waiting for cron resume)
      if (status === "interrupted") return 30_000;
      return false;
    },
  });
}
