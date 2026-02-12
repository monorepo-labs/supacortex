"use client";
import { useQuery, useMutation } from "@tanstack/react-query";

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

export const useCreateBookmark = () => {
  return useMutation({
    mutationFn: async (bookmark) => {
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
