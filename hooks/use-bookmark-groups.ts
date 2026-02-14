"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type BookmarkData = { id: string; groupIds: string[]; [key: string]: unknown };

export const useAddBookmarksToGroups = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bookmarkIds: string[]; groupIds: string[] }) => {
      const res = await fetch("/api/bookmark-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add bookmarks to groups");
      return res.json();
    },
    onMutate: async ({ bookmarkIds, groupIds }) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const queries = queryClient.getQueriesData<BookmarkData[]>({ queryKey: ["bookmarks"] });
      queries.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          data.map((b) =>
            bookmarkIds.includes(b.id)
              ? { ...b, groupIds: [...new Set([...b.groupIds, ...groupIds])] }
              : b,
          ),
        );
      });
      return { queries };
    },
    onError: (_err, _data, context) => {
      context?.queries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
};

export const useRemoveBookmarksFromGroups = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bookmarkIds: string[]; groupIds: string[] }) => {
      const res = await fetch("/api/bookmark-groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to remove bookmarks from groups");
      return res.json();
    },
    onMutate: async ({ bookmarkIds, groupIds }) => {
      await queryClient.cancelQueries({ queryKey: ["bookmarks"] });
      const queries = queryClient.getQueriesData<BookmarkData[]>({ queryKey: ["bookmarks"] });
      queries.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(
          key,
          data.map((b) =>
            bookmarkIds.includes(b.id)
              ? { ...b, groupIds: b.groupIds.filter((id: string) => !groupIds.includes(id)) }
              : b,
          ),
        );
      });
      return { queries };
    },
    onError: (_err, _data, context) => {
      context?.queries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
};
