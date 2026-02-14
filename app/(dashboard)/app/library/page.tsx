"use client";

import { Suspense, useDeferredValue, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import GridSearch from "@/app/components/GridSearch";
import LibraryGridView from "@/app/components/LibraryGridView";
import { useBookmarks } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "@/app/components/BookmarkNode";
import Reader from "@/app/components/Reader";
import { useCreateBookmark } from "@/hooks/use-bookmarks";
import { toast } from "sonner";

export default function LibraryPage() {
  return (
    <Suspense>
      <LibraryPageContent />
    </Suspense>
  );
}

function LibraryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeGroupId = searchParams.get("group") || null;

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const {
    data: bookmarks,
    isLoading,
    error,
  } = useBookmarks(
    deferredSearch.length >= 3 ? deferredSearch : "",
    activeGroupId ?? undefined,
  );

  const [activeBookmark, setActiveBookmark] = useState<BookmarkData | null>(
    null,
  );
  const searchRef = useRef<HTMLInputElement>(null!);

  const { mutate: addBookmark } = useCreateBookmark();

  const handleGroupSelect = (groupId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (groupId) {
      params.set("group", groupId);
    } else {
      params.delete("group");
    }
    router.replace(`?${params.toString()}`);
  };

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
            addBookmark({ url }, { onSuccess: resolve, onError: reject });
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
      <Sidebar activeGroupId={activeGroupId} onGroupSelect={handleGroupSelect} />
      <main className="relative flex-1 border border-zinc-200 rounded-xl m-2 overflow-hidden flex flex-col">
        <GridSearch onSearch={setSearch} inputRef={searchRef} value={search} />

        <div className="flex-1 overflow-hidden">
          <LibraryGridView
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
