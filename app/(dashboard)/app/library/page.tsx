"use client";

import { useDeferredValue, useState, useEffect, useRef } from "react";
import Sidebar from "@/app/components/Sidebar";
import GridSearch from "@/app/components/GridSearch";
import ResearchGrid from "@/app/components/ResearchGrid";
import { useBookmarks } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import Reader from "@/app/components/Reader";
import { useCreateBookmark } from "@/hooks/use-bookmarks";
import { toast } from "sonner";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const {
    data: bookmarks,
    isLoading,
    error,
  } = useBookmarks(deferredSearch.length >= 3 ? deferredSearch : "");

  const [activeBookmark, setActiveBookmark] = useState<BookmarkData | null>(
    null,
  );
  const searchRef = useRef<HTMLInputElement>(null!);

  const { mutate: addBookmark } = useCreateBookmark();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.metaKey && e.key === "v") {
        const text = await navigator.clipboard.readText();
        if (!text) return;
        let url = text.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        try {
          new URL(url);
        } catch {
          return;
        }
        toast.promise(
          new Promise((resolve, reject) => {
            addBookmark(
              { url },
              { onSuccess: resolve, onError: reject },
            );
          }),
          {
            loading: "Saving bookmark...",
            success: "Bookmark saved",
            error: (err) => err.message || "Failed to save bookmark",
          },
        );
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return;
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addBookmark]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="relative flex-1 border border-zinc-200 rounded-xl m-1 overflow-hidden flex flex-col">
        <GridSearch onSearch={setSearch} inputRef={searchRef} value={search} />

        <div className="flex-1 overflow-hidden">
          <ResearchGrid
            bookmarks={bookmarks ?? []}
            isLoading={isLoading}
            error={error}
            onOpenReader={setActiveBookmark}
          />
        </div>

        {activeBookmark && (
          <Reader
            bookmark={activeBookmark}
            onClose={() => setActiveBookmark(null)}
          />
        )}
      </main>
    </div>
  );
}
