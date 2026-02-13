"use client";

import { useDeferredValue, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import SearchBar from "@/app/components/SearchBar";
import Canvas from "@/app/components/Canvas";
import ResearchGrid from "@/app/components/ResearchGrid";
import ViewToggle, { type ViewMode } from "@/app/components/ViewToggle";
import Reader from "@/app/components/Reader";
import { useBookmarks } from "@/hooks/use-bookmarks";
import type { BookmarkData } from "@/app/components/BookmarkNode";

export default function LibraryPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const {
    data: bookmarks,
    isLoading,
    error,
  } = useBookmarks(deferredSearch.length >= 3 ? deferredSearch : "");

  const [view, setView] = useState<ViewMode>("vertical");
  const [activeBookmark, setActiveBookmark] = useState<BookmarkData | null>(
    null,
  );

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="relative flex-1 border border-zinc-200 rounded-2xl m-1 overflow-hidden">
        <ViewToggle mode={view} onChange={setView} />
        <SearchBar onSearch={setSearch} />

        {view === "canvas" ? (
          <Canvas
            bookmarks={bookmarks ?? []}
            isLoading={isLoading}
            error={error}
            isSearching={deferredSearch.length >= 3}
            onOpenReader={setActiveBookmark}
          />
        ) : (
          <ResearchGrid
            bookmarks={bookmarks ?? []}
            isLoading={isLoading}
            error={error}
            onOpenReader={setActiveBookmark}
          />
        )}

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
