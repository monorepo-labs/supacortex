"use client";
import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { GraphData } from "@/server/bookmarks/queries";
import type { BookmarkData } from "@/app/components/BookmarkNode";

const PAGE_SIZE = 50;

export const useBookmarkExists = (url: string | undefined) => {
  return useQuery<boolean>({
    queryKey: ["bookmark-exists", url],
    queryFn: async () => {
      const res = await fetch(`/api/bookmarks?url=${encodeURIComponent(url!)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.exists;
    },
    enabled: !!url,
    staleTime: 30_000,
  });
};

type BookmarkPage = { data: BookmarkData[]; total: number };

export const useGraphData = (enabled: boolean, type?: string) => {
  return useQuery<GraphData>({
    queryKey: ["graph-data", type],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      const res = await fetch(`/api/bookmarks/graph?${params}`);
      if (!res.ok) throw new Error("Failed to fetch graph data");
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

export const useBookmarks = (search?: string, groupId?: string, type?: string, enabled = true) => {
  const query = useInfiniteQuery<BookmarkPage>({
    queryKey: ["bookmarks", search, groupId, type],
    enabled,
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (groupId) params.set("group", groupId);
      if (type) params.set("type", type);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(pageParam));
      const res = await fetch(`/api/bookmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch bookmarks");
      return res.json();
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.data || !Array.isArray(lastPage.data)) return undefined;
      const loaded = allPages.reduce((n, p) => n + (p.data?.length ?? 0), 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  const bookmarks = query.data?.pages.flatMap((p) => p.data ?? []) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;

  return {
    data: bookmarks,
    total,
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
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
      const queries = queryClient.getQueriesData<InfiniteData<BookmarkPage>>({ queryKey: ["bookmarks"] });
      queries.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.filter((b) => b.id !== id),
            total: page.total - 1,
          })),
        });
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
      queryClient.invalidateQueries({ queryKey: ["graph-data"] });
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
      const queries = queryClient.getQueriesData<InfiniteData<BookmarkPage>>({ queryKey: ["bookmarks"] });
      const placeholder = {
        id: `temp-${Date.now()}`,
        type: "link",
        title: null,
        content: null,
        author: null,
        url: bookmark.url,
        mediaUrls: null,
        createdAt: new Date().toISOString(),
        groupIds: [],
        _optimistic: true,
      };
      queries.forEach(([key, data]) => {
        if (!data || data.pages.length === 0) return;
        queryClient.setQueryData(key, {
          ...data,
          pages: data.pages.map((page, i) =>
            i === 0
              ? { ...page, data: [placeholder, ...page.data], total: page.total + 1 }
              : { ...page, total: page.total + 1 },
          ),
        });
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
      queryClient.invalidateQueries({ queryKey: ["bookmark-exists"] });
      queryClient.invalidateQueries({ queryKey: ["graph-data"] });
    },
  });
};
