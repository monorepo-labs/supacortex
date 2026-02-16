"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GraphData } from "@/server/bookmarks/queries";

export const useGraphData = (enabled: boolean) => {
  return useQuery<GraphData>({
    queryKey: ["graph-data"],
    queryFn: async () => {
      const res = await fetch("/api/bookmarks/graph");
      if (!res.ok) throw new Error("Failed to fetch graph data");
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookmarks = (search?: string, groupId?: string) => {
  return useQuery({
    queryKey: ["bookmarks", search, groupId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (groupId) params.set("group", groupId);
      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
  });
};

export const useUpdateBookmarkPosition = () => {
  return useMutation({
    mutationFn: async (data: { id: string; positionX: number; positionY: number }) => {
      const res = await fetch(`/api/bookmarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update position");
      return res.json();
    },
  });
};

export const useUpdateGridLayout = () => {
  return useMutation({
    mutationFn: async (layout: { id: string; gridX: number; gridY: number; gridW: number; gridH: number; gridExpanded?: boolean }[]) => {
      const res = await fetch(`/api/bookmarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout }),
      });
      if (!res.ok) throw new Error("Failed to update grid layout");
      return res.json();
    },
  });
};

export const useResetGridLayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookmarks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetGrid: true }),
      });
      if (!res.ok) throw new Error("Failed to reset grid layout");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
};

export const useDeleteBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bookmarks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete bookmark");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const queries = queryClient.getQueriesData<{ id: string }[]>({ queryKey: ["bookmarks"] });
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(key, data.filter((b) => b.id !== id));
        }
      });
      return { queries };
    },
    onError: (_err, _id, context) => {
      context?.queries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
};

export const useCreateBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookmark: { url: string }) => {
      const res = await fetch(`/api/bookmarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookmark),
      });
      if (!res.ok) throw new Error("Failed to create bookmark");
      return res.json();
    },
    onMutate: async (bookmark) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const queries = queryClient.getQueriesData<Record<string, unknown>[]>({ queryKey: ["bookmarks"] });
      const placeholder = {
        id: `temp-${Date.now()}`,
        type: "link",
        title: null,
        content: null,
        author: null,
        url: bookmark.url,
        isRead: false,
        mediaUrls: null,
        positionX: null,
        positionY: null,
        createdAt: new Date().toISOString(),
        groupIds: [],
        _optimistic: true,
      };
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(key, [placeholder, ...data]);
        }
      });
      return { queries };
    },
    onError: (_err, _bookmark, context) => {
      context?.queries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
};
