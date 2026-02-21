"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type Conversation = {
  id: string;
  title: string;
  sessionId: string | null;
  directory: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatAttachment = {
  url: string;
  filename?: string;
  mediaType?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
};

export const useConversations = () => {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });
};

export const useMessages = (conversationId: string | null) => {
  return useQuery<ChatMessage[]>({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversationId,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title?: string; sessionId?: string; directory?: string }) => {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json() as Promise<Conversation>;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      sessionId?: string;
      directory?: string;
    }) => {
      const res = await fetch("/api/chat/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update conversation");
      return res.json();
    },
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previous = queryClient.getQueryData(["conversations"]);
      queryClient.setQueryData(
        ["conversations"],
        (old: Conversation[] | undefined) =>
          old?.map((c) => (c.id === data.id ? { ...c, ...data } : c)),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["conversations"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/chat/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete conversation");
      return res.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previous = queryClient.getQueryData(["conversations"]);
      queryClient.setQueryData(
        ["conversations"],
        (old: Conversation[] | undefined) =>
          old?.filter((c) => c.id !== id),
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      queryClient.setQueryData(["conversations"], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useSaveMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      conversationId: string;
      role: string;
      content: string;
      attachments?: ChatAttachment[];
    }) => {
      const res = await fetch(
        `/api/chat/conversations/${data.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: data.role, content: data.content, attachments: data.attachments }),
        },
      );
      if (!res.ok) throw new Error("Failed to save message");
      return res.json();
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      // Refetch conversations so order updates (updatedAt changed)
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
