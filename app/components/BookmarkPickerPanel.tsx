"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import BookmarkCard from "./BookmarkCard";
import type { BookmarkData } from "./BookmarkNode";

export default function BookmarkPickerPanel({
  onClose,
  selectedBookmarks,
  onToggle,
  onOpenInPanel,
}: {
  onClose: () => void;
  selectedBookmarks: BookmarkData[];
  onToggle: (bookmark: BookmarkData) => void;
  onOpenInPanel: (bookmark: BookmarkData) => void;
}) {
  const [search, setSearch] = useState("");
  const selectedIds = new Set(selectedBookmarks.map((b) => b.id));
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    data: bookmarks,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookmarks(search.length >= 3 ? search : undefined);

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, rootMargin: "100px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="shrink-0 my-2 mr-2 shadow-card rounded-xl overflow-hidden bg-zinc-50 flex flex-col" style={{ width: 480 }}>
      {/* Search bar with integrated close */}
      <div className="flex items-center gap-3 px-5 py-4 pb-2">
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="flex-1 text-lg text-zinc-900 placeholder:text-zinc-300 outline-none bg-transparent"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-3 pb-4 scrollbar-light">
        {isLoading && bookmarks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-zinc-400">
            Loading...
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-zinc-400">
            {search.length > 0 && search.length < 3
              ? "Type at least 3 characters to search"
              : "No bookmarks found"}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="min-w-0">
                <BookmarkCard
                  bookmark={bookmark}
                  expanded={false}
                  onToggleExpand={() => {}}
                  onClick={() => onToggle(bookmark)}
                  isSelected={selectedIds.has(bookmark.id)}
                  onSelect={() => onToggle(bookmark)}
                  onOpenInNewPanel={() => onOpenInPanel(bookmark)}
                />
              </div>
            ))}
          </div>
        )}
        <div ref={sentinelRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          </div>
        )}
      </div>
    </div>
  );
}
