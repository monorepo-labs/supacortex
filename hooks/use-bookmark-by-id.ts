"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BookmarkData } from "@/app/components/BookmarkNode";

export function useBookmarksByIds(ids: string[]) {
  const queryClient = useQueryClient();

  return useQuery<Record<string, BookmarkData>>({
    queryKey: ["bookmarks-by-ids", ...ids],
    queryFn: async () => {
      const result: Record<string, BookmarkData> = {};

      // Check cache first, collect uncached IDs
      const uncached: string[] = [];
      for (const id of ids) {
        const cached = queryClient.getQueryData<BookmarkData>(["bookmark", id]);
        if (cached) {
          result[id] = cached;
        } else {
          uncached.push(id);
        }
      }

      // Fetch uncached bookmarks in parallel
      if (uncached.length > 0) {
        const responses = await Promise.all(
          uncached.map(async (id) => {
            try {
              const res = await fetch(`/api/bookmarks?id=${id}`);
              if (!res.ok) return null;
              const data = await res.json();
              if (data?.id) {
                queryClient.setQueryData(["bookmark", id], data);
                return data as BookmarkData;
              }
              return null;
            } catch {
              return null;
            }
          }),
        );

        for (const bookmark of responses) {
          if (bookmark) result[bookmark.id] = bookmark;
        }
      }

      return result;
    },
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
