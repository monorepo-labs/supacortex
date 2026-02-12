"use client";
import { useQuery } from "@tanstack/react-query";

export const useTags = (userId: string) => {
  return useQuery({
    queryKey: ["tags", userId],
    queryFn: async () => {
      const res = await fetch(`/api/tags?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to fetch tags");
      return res.json();
    },
  });
};
