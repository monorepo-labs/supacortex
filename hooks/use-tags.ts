"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const useTags = () => {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tag: { name: string; color: string }) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tag),
      });
      if (!res.ok) throw new Error("Failed to create tag");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

export const useRenameTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to rename tag");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["tags"] });
      const previous = queryClient.getQueryData(["tags"]);
      queryClient.setQueryData(["tags"], (old: Tag[]) =>
        old?.map((tag) => (tag.id === data.id ? { ...tag, name: data.name } : tag)),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["tags"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};

type Tag = { id: string; name: string; color: string; icon?: string | null };

export const useUpdateTag = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; color?: string; icon?: string }) => {
      const res = await fetch("/api/tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update tag");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["tags"] });
      const previous = queryClient.getQueryData(["tags"]);
      queryClient.setQueryData(["tags"], (old: Tag[]) =>
        old?.map((tag) =>
          tag.id === data.id ? { ...tag, ...data } : tag,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["tags"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
};
