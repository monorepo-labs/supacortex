"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useBookmarks = (search?: string) => {
  return useQuery({
    queryKey: ["bookmarks", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
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

export const useCreateBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    mutationFn: async (bookmark: { url: string }) => {
      const res = await fetch(`/api/bookmarks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookmark),
      });
      if (!res.ok) throw new Error("Failed to create bookmark");
      return res.json();
    },
  });
};
