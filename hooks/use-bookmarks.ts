"use client";
import { useQuery } from "@tanstack/react-query";

export const useBookmarks = (userId: string, search?: string) => {
  return useQuery({
    queryKey: ["bookmarks", userId, search],
    queryFn: async () => {
      const params = new URLSearchParams({ userId });
      if (search) params.set("search", search);
      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
  });
};
