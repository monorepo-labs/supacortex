"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Group = { id: string; name: string; color: string; icon?: string | null };

export const useGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (group: { name: string; color: string }) => {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      if (!res.ok) throw new Error("Failed to create group");
      return res.json();
    },
    onMutate: async (group) => {
      await queryClient.cancelQueries({ queryKey: ["groups"] });
      const previous = queryClient.getQueryData(["groups"]);
      const optimisticGroup = {
        id: `temp-${Date.now()}`,
        ...group,
        icon: null,
      };
      queryClient.setQueryData(["groups"], (old: Group[] | undefined) => [
        ...(old ?? []),
        optimisticGroup,
      ]);
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["groups"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useRenameGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; name: string }) => {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to rename group");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["groups"] });
      const previous = queryClient.getQueryData(["groups"]);
      queryClient.setQueryData(["groups"], (old: Group[]) =>
        old?.map((g) => (g.id === data.id ? { ...g, name: data.name } : g)),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["groups"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; color?: string; icon?: string }) => {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["groups"] });
      const previous = queryClient.getQueryData(["groups"]);
      queryClient.setQueryData(["groups"], (old: Group[]) =>
        old?.map((g) =>
          g.id === data.id ? { ...g, ...data } : g,
        ),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["groups"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete group");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["groups"] });
      const previous = queryClient.getQueryData(["groups"]);
      queryClient.setQueryData(["groups"], (old: Group[]) =>
        old?.filter((g) => g.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["groups"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
};
